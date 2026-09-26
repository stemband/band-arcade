/* ARCADE QUEST: THE SPRITES. Every picture in the game is a small pixel map here, easy to edit.
   A sprite = {w, h, palette, frames: [[row, row, …], …], fps}. Each row is a string, one character per pixel;
   '.' (or a space, or a missing character at the end of a row) is transparent. The palette maps each character
   to a THEME TOKEN in shared/theme.css (without --), so no color is hard-coded here: 'q-brass', 'q-out'…
   Rows may be shorter than w (the rest is transparent).

   PLAYERS (band kids, 32 × 32) are built in layers by the renderer (engine/sprites.js), from back to front:
     legs → back arm → instrument parts marked 'back' → body and head → the instrument → hands → front arm.
     Front-held instruments go over the torso (a character facing you would hide them otherwise); both hands are
     drawn on top of the instrument so it reads as HELD. Arms are drawn in code from each SHOULDER to a hand point.
     BODY: the three views (SIDE facing right, FRONT, BACK), palette slots o outline (the equipped skin's color),
       h hair, s skin (the chosen tone), e eyes, m mouth, c shirt (the instrument's --pt-<id>), p pants, b shoes.
     SHAPES: every instrument's pixel maps (palette INSTRUMENT_PALETTE).
     POSES[memberId] = {side, front, play}: CARRY facing right / CARRY facing the viewer (the back view uses the front
       one, hidden behind the body) / PLAYING (side view). Each = {parts: [[shape, x, y, 'back'?]], hands}, or for
       PLAYING a list of 2 frames (bells and snare: mallets up, then striking). A part's last word: 'back' = behind
       the body, 'top' = held over the hands (sticks, mallets), none = in front of the body, under the hands.
       hands = {back, front} (side view) or
       {left, right} (front view, as you look at it): [x, y] = the 2 × 2 hand's top-left pixel, 'rest' = arm down.
       NUDGE A HAND OR AN INSTRUMENT HERE: x grows to the right, y grows down, on the 32 × 32 canvas.
     Handy spots: SIDE mouth (18, 11), shoulders back (13, 15) / front (16, 15), torso x 11–19, feet y 30.
                  FRONT mouth (15–16, 11), shoulders left (11, 15) / right (20, 15), torso x 10–21.
   YOUR OWN ART: put arcade-quest/art/<sprite id>.png (frames side by side, each w × h, transparent background)
   and it replaces the drawn sprite. Players use ONE sheet per instrument, art/player-<member id>.png (rows for
   views and poses: see arcade-quest/art/README.md); enemies their id, e.g. art/squawk.png (32 × 32 × 3 frames:
   idle, idle, happy). */
window.QUEST_ART = {};
(function (Q) {
  "use strict";
  const mirror = half => half.map(r => r + [...r].reverse().join(''));

  /* ---------- the players ---------- */
  const pad = rows => Array.from({length: 32}, (_, i) => rows[i] || '');
  Q.BODY = {
    // facing right (battle; walking left/right in the overworld, mirrored for left)
    SIDE: pad(['', '', '............oooooo', '..........oohhhhhhoo', '.........ohhhhhhhhhho', '.........ohhhhhhhhhho',
      '.........ohhhhhhsssso', '.........ohhhhhssssso', '.........ohhhhsssseso', '.........ohhhhssssssso', '.........ohhhssssssso',
      '..........ohhsssssmo', '...........ohssssso', '............oossoo', '...........occccccco', '...........occccccco',
      '...........occccccco', '...........occccccco', '...........occccccco', '...........occccccco', '...........occccccco',
      '...........opppppppo']),
    // facing the viewer (walking down)
    FRONT: pad(mirror(['', '', '............oooo', '..........oohhhh', '.........ohhhhhh', '.........ohhhhhh', '.........ohhhhss',
      '.........ohhssss', '.........ohsssss', '.........osssess', '.........ossssss', '.........osssssm', '..........osssss',
      '...........oooss', '..........occcccc', '..........occcccc', '..........occcccc', '..........occcccc', '..........occcccc',
      '..........occcccc', '..........occcccc', '..........oppppp'])),
  };
  Q.BODY.BACK = Q.BODY.FRONT.map((row, y) => (y < 14 ? row.replace(/[sem]/g, 'h') : row));      // the back of the head: all hair
  Q.SHOULDERS = {side: {back: [13, 15], front: [16, 15]}, front: {left: [11, 15], right: [20, 15]}};
  Q.LEGS = {side: {back: 14, front: 16}, front: {left: 13, right: 18}, top: 22, foot: 29};      // hip x, first leg row, shoe row
  Q.BODY_PALETTE = {o: 'q-out', h: 'q-hair', s: 'q-skin-2', e: 'q-black', m: 'q-out', c: 'cyan', p: 'q-pants', b: 'q-shoe'};
  Q.SKIN_TONES = ['q-skin-1', 'q-skin-2', 'q-skin-3', 'q-skin-4'];

  /* instrument pixels: g brass, G brass shadow, m silver, M silver shadow, k black (a dark grey, so it shows on black), w dark wood, W light wood,
     r reed, d drum shell, D drum head, 1–6 bell bars, s stick or mallet shaft, x mallet or stick tip */
  Q.INSTRUMENT_PALETTE = {g: 'q-brass', G: 'q-brass-d', m: 'q-silver', M: 'q-silver-d', k: 'q-grey-d', w: 'q-wood', W: 'q-wood-l',
    r: 'q-reed', d: 'q-drum', D: 'q-head', 1: 'q-bar-1', 2: 'q-bar-2', 3: 'q-bar-3', 4: 'q-bar-4', 5: 'q-bar-5', 6: 'q-bar-6',
    s: 'q-wood-l', x: 'q-red', o: 'q-out'};
  // an upright clarinet/oboe (reed on top, bell at the bottom) and the same angled down from the mouth
  const upright = (b, k) => ['.r..', '.' + b + b + '.', '.' + b + b + '.', k + b + b + '.', '.' + b + b + k, k + b + b + '.', '.' + b + b + k,
    '.' + b + b + '.', '.' + b + b + '.', '.' + b + b + '.', b.repeat(4), b.repeat(4)];
  const slant = (b, k) => Array.from({length: 13}, (_, i) => '.'.repeat(i >> 1) + (i === 0 ? 'r' : i >= 11 ? b.repeat(3) : i % 3 === 0 ? k + b : b + b));
  // the bassoon: a long diagonal pole (bell up top, boot at the bottom)
  const bsn = Array.from({length: 25}, (_, i) => '.'.repeat(Math.floor(i / 3)) + (i < 2 ? 'WWW' : i > 21 ? 'wWWw' : i % 5 === 0 ? 'Wm' : 'Ww'));
  const hornRows = ['..gggg...', '.gGggGg..', 'gG....gG.', 'g..mm..g.', 'gG....gG.', '.gGggGgGG', '..gggg.GG', '........G'];
  Q.SHAPES = {
    flute:        ['mmMmmMmmMmmMmmmm', 'MMMMMMMMMMMMMMMM'],
    flutePlay:    ['mmMmmMmmMmmmm', 'MMMMMMMMMMMMM'],
    clarinet:     upright('k', 'm'),
    clarinetPlay: slant('k', 'm'),
    oboe:         upright('w', 'M'),
    oboePlay:     slant('w', 'M'),
    basscl:       ['...mm', '..m..', '..m..', '.kk..', '.kk..', 'mkk..', '.kkm.', '.kk..', 'mkk..', '.kkm.', '.kk..', '.kk..', '.kk.m', '.kk.m',
                   '.kkkm', '..kk.', '..M..'],
    bassoonHigh:  bsn.slice(0, 10),
    bassoonLow:   bsn.slice(10),
    bocal:        ['mmm'],
    bocalPlay:    ['.......m', 'mmmmmmm.'],
    altosax:      ['mg...', '.gg..', '..g..', '..gG.', '..gg.', '..Gg.', '..gg.', '..gg.gg', '..gg.gG', '...gggG', '....gg.'],
    tenorsax:     ['.mg...', '..gg..', '...g..', '...gG.', '...gg.', '...Gg.', '...gg.', '...gg.', '...gg.gg', '...gg.gG', '....gggG', '.....gg.'],
    barisax:      ['...ggg', '..g..g', '..g..g', '...gg.', '....g.', '.mgg..', '...g..', '...gG.', '...gg.', '...Gg.', '...gg.', '...gg.',
                   '...gg.gg', '...gg.gG', '...gggGG', '....gggG', '.....gg.'],
    trumpet:      ['mg........', '.ggg.m.m..', '...gggggg.', '....gggggG', '......ggGG', '........GG'],
    trumpetDown:  ['.m.', '.g.', 'ggm', 'gg.', 'ggm', 'gg.', '.g.', 'GGG', 'GGG'],
    trumpetPlay:  ['....m.m.m....', 'mggggggggggGG', '..ggggggg..GG', '...........G.'],
    horn:         hornRows,
    hornPlay:     ['........m', '........m'].concat(hornRows.map(r => [...r].reverse().join(''))),
    trombone:     ['GgggG', '.gGg.', '..g..', '..g.m', '..ggg'].concat(Array(12).fill('..g.g'), ['..ggg']),
    trombonePlay: ['........GGG', '.gggggggggG', 'mggggggggg.', '..gggggggggggg', '.............g'],
    euph:         ['..gggg', '..gGGg', '...gg.', 'm..gg.', '.m.gg.', '..mggg', '..gggg', '..gGgG', '..gggg', '...gg.'],
    tuba:         ['......gggg', '......gGGg', '.......gg.', '.......gg.', '......ggg.', 'm....gggg.', '.m..ggGggg', '..mgggggGg',
                   '..gGgggggg', '..ggGggGgg', '..gggggggg', '..gGggggGg', '...gggggg.', '....gggg..'],
    bellkit:      ['GGGGGGGG', 'G123456G', 'GGGGGGGG'],
    mallet:       ['x', 's', 's', 's'],
    malletDown:   ['s', 's', 'x'],
    snare:        ['.DDDDDD.', 'dddddddd', 'dmdmdmdd', 'dddddddd', '.mmmmmm.'],
    sling:        ['k.....', '.k....', '..k...', '...k..', '....k.', '.....k'],
    stick:        ['x', 's', 's', 's'],
    stickDown:    ['s', 's', 'x'],
  };
  // one table for every instrument: where it sits and where the hands go, in each pose (see the notes at the top)
  const reed = (shape) => ({
    side:  {parts: [[shape, 18, 13]],          hands: {back: [19, 16], front: [19, 20]}},
    front: {parts: [[shape, 14, 13]],          hands: {left: [14, 16], right: [16, 20]}},
    play:  {parts: [[shape + 'Play', 19, 11]], hands: {back: [21, 15], front: [23, 19]}},
  });
  const bigBrass = (shape, carry, play, front) => ({
    side:  {parts: [[shape, ...carry.at]], hands: carry.hands},
    front: {parts: [[shape, ...front.at]], hands: front.hands},
    play:  {parts: [[shape, ...play.at]],  hands: play.hands},
  });
  Q.POSES = {
    // FLUTE: across the chest in both hands; playing: sideways at the lips
    flute: {
      side:  {parts: [['flute', 7, 17]],      hands: {back: [12, 17], front: [18, 17]}},
      front: {parts: [['flute', 8, 17]],      hands: {left: [10, 17], right: [20, 17]}},
      play:  {parts: [['flutePlay', 19, 11]], hands: {back: [23, 11], front: [28, 11]}},
    },
    // OBOE, CLARINET: upright in both hands, bell down; playing: angled down from the mouth
    oboe: reed('oboe'),
    clarinet: reed('clarinet'),
    // BASS CLARINET: upright on its peg, hands on it; playing: the neck comes up to the mouth
    basscl: {
      side:  {parts: [['basscl', 16, 13]], hands: {back: [17, 17], front: [17, 22]}},
      front: {parts: [['basscl', 13, 13]], hands: {left: [13, 17], right: [15, 22]}},
      play:  {parts: [['basscl', 15, 11]], hands: {back: [16, 15], front: [16, 20]}},
    },
    // BASSOON: diagonal across the body on its strap (the top half behind the head); playing: the bocal at the lips
    bassoon: {
      side:  {parts: [['bassoonHigh', 8, 2, 'back'], ['bassoonLow', 8, 12], ['bocal', 13, 12]],      hands: {back: [12, 15], front: [14, 21]}},
      front: {parts: [['bassoonHigh', 9, 3, 'back'], ['bassoonLow', 9, 13]],                         hands: {left: [13, 16], right: [15, 22]}},
      play:  {parts: [['bassoonHigh', 8, 2, 'back'], ['bassoonLow', 8, 12], ['bocalPlay', 12, 11]], hands: {back: [12, 15], front: [14, 21]}},
    },
    // SAXES: hanging from the neck strap, hands on the keys; playing: the mouthpiece comes up to the lips
    altosax: {
      side:  {parts: [['altosax', 18, 13]], hands: {back: [20, 16], front: [20, 19]}},
      front: {parts: [['altosax', 14, 13]], hands: {left: [16, 16], right: [16, 19]}},
      play:  {parts: [['altosax', 19, 11]], hands: {back: [21, 14], front: [21, 17]}},
    },
    tenorsax: {
      side:  {parts: [['tenorsax', 17, 13]], hands: {back: [20, 17], front: [20, 20]}},
      front: {parts: [['tenorsax', 13, 13]], hands: {left: [16, 17], right: [16, 20]}},
      play:  {parts: [['tenorsax', 18, 11]], hands: {back: [21, 15], front: [21, 18]}},
    },
    barisax: {
      side:  {parts: [['barisax', 18, 11]], hands: {back: [21, 19], front: [21, 23]}},
      front: {parts: [['barisax', 14, 15]], hands: {left: [17, 22], right: [17, 25]}},
      play:  {parts: [['barisax', 18, 6]],  hands: {back: [21, 14], front: [21, 18]}},
    },
    // TRUMPET: in one hand at the side, bell forward and down; playing: raised forward at the lips
    trumpet: {
      side:  {parts: [['trumpet', 14, 19]],     hands: {back: 'rest', front: [19, 21]}},
      front: {parts: [['trumpetDown', 7, 18]],  hands: {left: [7, 20], right: 'rest'}},
      play:  {parts: [['trumpetPlay', 19, 10]], hands: {back: [22, 12], front: [24, 9]}},
    },
    // HORN: cradled in front, bell to the side; playing: the bell points back with the right hand in it
    horn: {
      side:  {parts: [['horn', 16, 14]],     hands: {back: [17, 16], front: [21, 20]}},
      front: {parts: [['horn', 11, 15]],     hands: {left: [11, 18], right: [18, 16]}},
      play:  {parts: [['hornPlay', 11, 11]], hands: {back: [17, 14], front: [11, 18]}},
    },
    // TROMBONE: upright in one hand, slide down; playing: raised forward, the other hand on the slide
    trombone: {
      side:  {parts: [['trombone', 22, 12]],     hands: {back: 'rest', front: [23, 17]}},
      front: {parts: [['trombone', 22, 12]],     hands: {left: 'rest', right: [23, 17]}},
      play:  {parts: [['trombonePlay', 19, 9]],  hands: {back: [21, 12], front: [27, 12]}},
    },
    // BARITONE (T.C.) / EUPHONIUM (B.C.): cradled in both arms; playing: bell up, mouthpiece at the lips
    baritonetc: bigBrass('euph', {at: [19, 14], hands: {back: [20, 19], front: [22, 22]}}, {at: [19, 8], hands: {back: [20, 13], front: [22, 16]}},
      {at: [13, 15], hands: {left: [13, 20], right: [18, 22]}}),
    euphbc: bigBrass('euph', {at: [19, 14], hands: {back: [20, 19], front: [22, 22]}}, {at: [19, 8], hands: {back: [20, 13], front: [22, 16]}},
      {at: [13, 15], hands: {left: [13, 20], right: [18, 22]}}),
    // TUBA: hugged in front, bell up over the shoulder; playing: mouthpiece at the lips
    tuba: bigBrass('tuba', {at: [18, 9], hands: {back: [20, 16], front: [23, 19]}}, {at: [18, 6], hands: {back: [20, 13], front: [23, 16]}},
      {at: [11, 14], hands: {left: [11, 20], right: [19, 21]}}),
    // BELLS: a mallet in each hand, a small bell kit in front; playing: mallets up, then striking
    bells: {
      side:  {parts: [['bellkit', 16, 19], ['mallet', 17, 14, 'top'], ['mallet', 23, 14, 'top']], hands: {back: [17, 18], front: [23, 18]}},
      front: {parts: [['bellkit', 12, 20], ['mallet', 11, 15, 'top'], ['mallet', 20, 15, 'top']], hands: {left: [11, 19], right: [20, 19]}},
      play: [
        {parts: [['bellkit', 17, 20], ['mallet', 18, 12, 'top'], ['mallet', 23, 12, 'top']],         hands: {back: [18, 16], front: [23, 16]}},
        {parts: [['bellkit', 17, 20], ['malletDown', 19, 17, 'top'], ['malletDown', 24, 17, 'top']], hands: {back: [18, 16], front: [23, 16]}},
      ],
    },
    // SNARE DRUM: on a sling at the waist, sticks in hand; playing: sticks up, then striking
    snare: {
      side:  {parts: [['sling', 13, 14], ['snare', 16, 20], ['stick', 17, 15, 'top'], ['stick', 22, 15, 'top']], hands: {back: [17, 19], front: [22, 19]}},
      front: {parts: [['sling', 13, 14], ['snare', 12, 20], ['stick', 11, 15, 'top'], ['stick', 20, 15, 'top']], hands: {left: [11, 19], right: [20, 19]}},
      play: [
        {parts: [['sling', 13, 14], ['snare', 16, 20], ['stick', 17, 13, 'top'], ['stick', 22, 13, 'top']],         hands: {back: [17, 17], front: [22, 17]}},
        {parts: [['sling', 13, 14], ['snare', 16, 20], ['stickDown', 18, 18, 'top'], ['stickDown', 23, 18, 'top']], hands: {back: [17, 17], front: [22, 17]}},
      ],
    },
  };

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
