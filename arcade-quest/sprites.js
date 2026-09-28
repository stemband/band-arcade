/* ARCADE QUEST: THE SPRITES. Every picture in the game (enemies, and in sprites-manor.js / sprites-story.js the
   tiles, NPCs and the finale) is a small pixel map, easy to edit. A sprite = {w, h, palette, frames: [[row, …], …], fps};
   each row is a string, one character per pixel; '.' (or a space, or a missing character at the end of a row) is
   transparent. The palette maps each character to a THEME TOKEN in shared/theme.css (without --): 'q-brass', 'q-out'…
   THE PLAYERS (the avatar holding its instrument: SHOULDERS, INSTRUMENT_PALETTE, SHAPES, POSES) moved to
   shared/instrument-sprites.js, which the page loads first; its notes say how to nudge a hand or an instrument.
   YOUR OWN ART: put arcade-quest/art/<sprite id>.png (frames side by side, each w × h, transparent background)
   and it replaces the drawn sprite, e.g. art/squawk.png (32 × 32 × 3 frames: idle, idle, happy). Players are
   always the student's avatar (no PNG). */
window.QUEST_ART = window.QUEST_ART || {};
(function (Q) {
  "use strict";

  /* ---------- the enemies (32 × 32; frames: idle, idle, happy) ---------- */
  Q.SPRITES = {
    /* SQUAWK: a sour-note gremlin (a grumpy eighth note). Loves one note (its happy note). */
    squawk: {w: 32, h: 32, fps: 3, palette: {o: 'q-out', g: 'q-sour', G: 'q-sour-d', w: 'q-white', k: 'q-black', r: 'q-red', p: 'q-pink'}, frames: [
      ['', '', '..................oo', '.................ogo', '................oggoo', '................oggggoo', '................ogoGgggo', '................ogo.oGgo',
       '................ogo..ogo', '................ogo...oo', '................ogo', '................ogo', '................ogo', '................ogo',
       '...........oooooogo', '.........oogggggggo', '........oggggggggggo', '.......oggwwgggwwgggo', '.......oggwkgggkwgggo', '......ogggggggggggggo',
       '......oggrgggggggrgggo', '......ogggrrrrrrrggggo', '.......oggggggggggggo', '........oogggggggggo', '..........ooooooooo', '..........oo....oo', '.........ooo....ooo'],
      ['', '', '', '..................oo', '.................ogoo', '................oggggo', '................ogoGgggo', '................ogo.oGgo',
       '................ogo..ogo', '................ogo..oo', '................ogo', '................ogo', '................ogo', '................ogo',
       '...........oooooogo', '.........oogggggggo', '........oggggggggggo', '.......oggwwgggwwgggo', '.......oggkwgggkwgggo', '......ogggggggggggggo',
       '......oggrgggggggrgggo', '......ogggrrrrrrrggggo', '.......oggggggggggggo', '........oogggggggggo', '..........ooooooooo', '..........oo....oo', '.........ooo....ooo'],
      ['', '', '..................oo', '.................ogo', '................oggoo', '................oggggoo', '................ogoGgggo', '................ogo.oGgo',
       '................ogo..ogo', '................ogo...oo', '................ogo', '................ogo', '................ogo', '................ogo',
       '...........oooooogo', '.........oogggggggo', '........oggggggggggo', '.......oggoogggooggggo', '.......ogggggggggggggo', '......ogpggggggggpgggo',
       '......ogggrgggggrggggo', '......ogggggrrrggggggo', '.......oggggggggggggo', '........oogggggggggo', '..........ooooooooo', '..........oo....oo', '.........ooo....ooo']]},
    /* WARBLE: a jittery tuning-fork moth that can't hold still. Calms when you hold a long, steady note. */
    warble: {w: 32, h: 32, fps: 6, palette: {o: 'q-out', m: 'q-silver', M: 'q-silver-d', b: 'q-blue', B: 'q-blue-d', w: 'q-white', k: 'q-black', y: 'q-gold', p: 'q-pink'}, frames: [
      ['', '', '..........o.....o', '..........mo...om', '...........m...m', '...........m...m', '...........mMMMm', '..oooo......mmm......oooo', '.obbbbo....omMmo....obbbbo',
       'obbBbbbo..oMmmMo..obbbBbbo', 'obBBbbbboomwkmwkmoobbbbBBbo', 'obbbbbbbbomkmmmkmobbbbbbbbo', '.obbbbbbbomm.mm.mobbbbbbbo', '..obbbbbboMmmmmmMobbbbbbo',
       '...oobbbbomMmmmMmobbbboo', '.....oooomMmmmmMmoooo', '..........oMmmMo', '..........oMmmMo', '...........oMMo', '...........oMMo', '............oo',
       '..........y...y', '.........y.....y'],
      ['', '', '', '..........o.....o', '..........mo...om', '...........m...m', '...........mMMMm', '.............mmm', '..oooo.....omMmo.....oooo',
       '.obbbbo...oMmmMo...obbbbo', 'obbBbbbbomwkmwkmobbbBbbo', 'obBBbbbbomkmmmkmobbbBBbo', 'obbbbbbbomm.mm.mobbbbbbo', '.obbbbbboMmmmmmMobbbbbo',
       '..oobbbbomMmmmMmobbbboo', '....oooomMmmmmMmoooo', '..........oMmmMo', '..........oMmmMo', '...........oMMo', '...........oMMo', '............oo',
       '.........y.....y', '..........y...y'],
      ['', '', '..........o.....o', '..........mo...om', '...........m...m', '...........m...m', '...........mMMMm', '..oooo......mmm......oooo', '.obbbbo....omMmo....obbbbo',
       'obbBbbbo..oMmmMo..obbbBbbo', 'obBBbbbboomkmmmkmoobbbbBBbo', 'obbbbbbbbopmmmmmpobbbbbbbbo', '.obbbbbbbomkkkkkmobbbbbbbo', '..obbbbbboMmmmmmMobbbbbbo',
       '...oobbbbomMmmmMmobbbboo', '.....oooomMmmmmMmoooo', '..........oMmmMo', '..........oMmmMo', '...........oMMo', '...........oMMo', '............oo']]},
    /* CLATTERBOX: a boxy metronome robot whose arm won't stop clattering. Calms with clean, separate notes. */
    clatterbox: {w: 32, h: 32, fps: 4, palette: {o: 'q-out', r: 'q-orange', R: 'q-orange-d', m: 'q-silver', M: 'q-silver-d', w: 'q-white', k: 'q-black', y: 'q-gold', g: 'q-green'}, frames: [
      ['', '..............oo', '..............om', '.............om', '............om', '...........om', '..........omo', '.........oooo', '........orrrro', '.......orrrrrro',
       '......orrrrrrrro', '.....orrwwrrwwrro', '.....orrwkrrwkrro', '....orrrrrrrrrrrro', '....orrrkkkkkkrrro', '...orrrrrrrrrrrrrro', '...oRRRRRRRRRRRRRRo',
       '...omMmMmMmMmMmMmMo', '...oRRRRyRRyRRyRRRo', '...oRRRRRRRRRRRRRRo', '...oooooooooooooooo', '....omo........omo', '....omo........omo', '...ooooo......ooooo'],
      ['', '...oo', '....mo', '.....mo', '......mo', '.......mo', '........omo', '.........oooo', '........orrrro', '.......orrrrrro',
       '......orrrrrrrro', '.....orrwwrrwwrro', '.....orrkwrrkwrro', '....orrrrrrrrrrrro', '....orrrkkkkkkrrro', '...orrrrrrrrrrrrrro', '...oRRRRRRRRRRRRRRo',
       '...omMmMmMmMmMmMmMo', '...oRRRRRyRRyRRyRRo', '...oRRRRRRRRRRRRRRo', '...oooooooooooooooo', '....omo........omo', '....omo........omo', '...ooooo......ooooo'],
      ['', '.........m', '.........m', '.........m', '.........m', '.........m', '........omo', '.........oooo', '........orrrro', '.......orrrrrro',
       '......orrrrrrrro', '.....orroorrrooro', '.....orrrrrrrrrrro', '....orrrrrrrrrrrro', '....orrkrrrrrkrrro', '...orrrrkkkkkrrrrro', '...oRRRRRRRRRRRRRRo',
       '...omMmMmMmMmMmMmMo', '...oRRgRRgRRgRRgRRo', '...oRRRRRRRRRRRRRRo', '...oooooooooooooooo', '....omo........omo', '....omo........omo', '...ooooo......ooooo']]},
    /* QUIZZLE: a grumpy old scroll that won't let you pass without a vocab question. */
    quizzle: {w: 32, h: 32, fps: 2, palette: {o: 'q-out', p: 'q-paper', P: 'q-paper-d', w: 'q-wood-l', W: 'q-wood', k: 'q-black', i: 'q-purple', r: 'q-red'}, frames: [
      ['', '', '', '....oooooooooooooooooooo', '...owWWWWWWWWWWWWWWWWWWwo', '...owWWWWWWWWWWWWWWWWWWwo', '....oooooooooooooooooooo', '.....oppppppppppppppppo',
       '.....oppkkpppppppkkpppo', '.....opppkpppppppkppppo', '.....oppppppppppppppppo', '.....opppiipppppiipppo', '.....oppiooippppiooippo',
       '.....oppiooippppiooippo', '.....opppiipppppiipppo', '.....oppppppppppppppppo', '.....oppppprrrrrrppppo', '.....opppprppppppprpppo',
       '.....oPPPPPPPPPPPPPPPPo', '.....oppkkkkppkkkkkpppo', '.....oppppppppppppppppo', '....oooooooooooooooooooo', '...owWWWWWWWWWWWWWWWWWWwo',
       '...owWWWWWWWWWWWWWWWWWWwo', '....oooooooooooooooooooo'],
      ['', '', '', '', '....oooooooooooooooooooo', '...owWWWWWWWWWWWWWWWWWWwo', '...owWWWWWWWWWWWWWWWWWWwo', '....oooooooooooooooooooo',
       '.....oppkkpppppppkkpppo', '.....opppkpppppppkppppo', '.....oppppppppppppppppo', '.....opppiipppppiipppo', '.....oppiooippppiooippo',
       '.....oppiooippppiooippo', '.....opppiipppppiipppo', '.....oppppppppppppppppo', '.....oppppprrrrrrppppo', '.....opppprppppppprpppo',
       '.....oPPPPPPPPPPPPPPPPo', '.....oppkkkkppkkkkkpppo', '....oooooooooooooooooooo', '...owWWWWWWWWWWWWWWWWWWwo',
       '...owWWWWWWWWWWWWWWWWWWwo', '....oooooooooooooooooooo'],
      ['', '', '', '....oooooooooooooooooooo', '...owWWWWWWWWWWWWWWWWWWwo', '...owWWWWWWWWWWWWWWWWWWwo', '....oooooooooooooooooooo', '.....oppppppppppppppppo',
       '.....oppppppppppppppppo', '.....oppppppppppppppppo', '.....oppppppppppppppppo', '.....oppioipppppioippo', '.....opppiipppppiippppo',
       '.....oppppppppppppppppo', '.....oppppppppppppppppo', '.....opprppppppppprpppo', '.....ppppprrrrrrrpppppo', '.....oppppppppppppppppo',
       '.....oPPPPPPPPPPPPPPPPo', '.....oppkkkkppkkkkkpppo', '.....oppppppppppppppppo', '....oooooooooooooooooooo', '...owWWWWWWWWWWWWWWWWWWwo',
       '...owWWWWWWWWWWWWWWWWWWwo', '....oooooooooooooooooooo']]},
    /* STICKY VALVE: a little brass gremlin with three stuck valves. Calms when you finger its note right. */
    stickyvalve: {w: 32, h: 32, fps: 3, palette: {o: 'q-out', g: 'q-brass', G: 'q-brass-d', m: 'q-silver', M: 'q-silver-d', w: 'q-white', k: 'q-black', r: 'q-red', p: 'q-pink'}, frames: [
      ['', '', '', '', '.........om..om..om', '.........om..om..om', '........oMMooMMooMMo', '........ommmmmmmmmmo', '.......oggggggggggggo', '......oggwwggggggwwggo',
       '......oggwkggggggkwggo', '.....oggggggggggggggggo', '.....oggggrrrrrrrrggggo', '.....ogggggrggggrgggggo', '.....oGgggggggggggggggGo', '......oGGggggggggggGGo',
       '.......ooGGGGGGGGGGoo', '..ooo....oggggggo....ooo', '.ogggoooogggggggoooogggo', '..oooo..ogGGGGGGo..oooo', '........oggo..oggo', '.......ooooo..ooooo'],
      ['', '', '', '', '', '.........om..om..om', '........oMMooMMooMMo', '........ommmmmmmmmmo', '.......oggggggggggggo', '......oggwwggggggwwggo',
       '......oggkwggggggkwggo', '.....oggggggggggggggggo', '.....oggggrrrrrrrrggggo', '.....ogggggrggggrgggggo', '.....oGgggggggggggggggGo', '......oGGggggggggggGGo',
       '.......ooGGGGGGGGGGoo', '..ooo....oggggggo....ooo', '.ogggoooogggggggoooogggo', '..oooo..ogGGGGGGo..oooo', '........oggo..oggo', '.......ooooo..ooooo'],
      ['', '', '', '.........om..om..om', '.........om..om..om', '.........om..om..om', '........oMMooMMooMMo', '........ommmmmmmmmmo', '.......oggggggggggggo', '......ogggggggggggggggo',
       '......oggooggggggooggo', '.....ogpggggggggggggpgo', '.....ogggggrggggrgggggo', '.....ogggggrrrrrrgggggo', '.....oGgggggggggggggggGo', '......oGGggggggggggGGo',
       '.......ooGGGGGGGGGGoo', '..ooo....oggggggo....ooo', '.ogggoooogggggggoooogggo', '..oooo..ogGGGGGGo..oooo', '........oggo..oggo', '.......ooooo..ooooo']]},

    /* ---------- dodging ---------- */
    /* the student's cursor: a small glowing eighth note */
    cursor:  {w: 7, h: 9, palette: {c: 'q-cursor', w: 'q-white'}, frames: [['...cc..', '...cwc.', '...c.cc', '...c..c', '...c...', '.ccc...', 'cwccc..', 'ccccc..', '.ccc...']]},
    /* a sour note */
    sour:    {w: 7, h: 8, fps: 4, palette: {g: 'q-sour', G: 'q-sour-d', k: 'q-black'}, frames: [
      ['....gG.', '....g.G', '....g..', '....g..', '.GGgg..', 'GgkgkG.', 'GgggggG', '.GGGG..'],
      ['....gG.', '....gG.', '....g.G', '....g..', '.GGgg..', 'GgkgkG.', 'GgggggG', '.GGGG..']]},
    /* a static burst */
    static:  {w: 6, h: 6, fps: 10, palette: {w: 'q-white', g: 'q-grey', p: 'q-purple'}, frames: [
      ['w.g..p', '.pw.g.', 'g.wpw.', '.wgw.g', 'p.w.p.', '.g..wg'], ['.g.w.p', 'w.gp.w', '.pwgw.', 'gw.p.g', '.w.gw.', 'p.w..g']]},
    /* a falling quarter rest */
    rest:    {w: 5, h: 9, palette: {k: 'q-white'}, frames: [['.k...', '..k..', '..kk.', '.kk..', 'kk...', '.kk..', '..kk.', '.k...', 'k....']]},
    /* the arena's floor tile and a pedestal for the enemies */
    tile:    {w: 16, h: 16, palette: {a: 'q-floor', b: 'q-floor-2'}, frames: [[
      'aaaaaaaaaaaaaaab', 'abbbbbbbbbbbbbbb', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab',
      'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'abaaaaaaaaaaaaab', 'bbbbbbbbbbbbbbbb']]},
    mic:     {w: 9, h: 14, palette: {X: 'cyan-hi'}, frames: [[
      '..XXXXX..', '.XX.X.XX.', '.X.X.X.X.', '.XX.X.XX.', '.X.X.X.X.', '.XXXXXXX.', '..XXXXX..', 'X...X...X', 'X...X...X', '.X..X..X.', '..XXXXX..', '....X....', '....X....', '..XXXXX..']]},
  };
})(window.QUEST_ART);
