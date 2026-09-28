/* Band Arcade: THE INSTRUMENT SPRITES (moved here from arcade-quest/sprites.js so every game can use them): the
   pixel maps of every instrument, the arm SHOULDERS and the POSES table that says where each instrument sits and where
   the hands go. shared/avatar.js draws the student's AVATAR holding their instrument with them: Arcade Quest's hero
   (Avatar.sprites), the fight poses (Avatar.fightSprites: Button Masher), and the creator's full-body preview.
   Load it before avatar.js is asked for a full-body sprite (the floor page, Dojo Duel, Arcade Quest, Button Masher;
   shared/avatar-badge.js loads it on demand for the creator). Arcade Quest's own pictures (enemies, tiles, NPCs)
   stay in arcade-quest/sprites.js, which adds them to the same window.QUEST_ART.

   HOW IT WORKS (unchanged from Arcade Quest): every instrument is a small pixel map here, easy to edit.
   A sprite = {w, h, palette, frames: [[row, row, …], …], fps}. Each row is a string, one character per pixel;
   '.' (or a space, or a missing character at the end of a row) is transparent. The palette maps each character
   to a THEME TOKEN in shared/theme.css (without --), so no color is hard-coded here: 'q-brass', 'q-out'…
   Rows may be shorter than w (the rest is transparent).

   PLAYERS (32 × 32) are the student's AVATAR (Create Your Player: shared/avatar-parts.js + shared/avatar.js) holding
     their instrument, drawn in layers, back to front: legs (or a wheelchair and seated legs) → hair/cape behind →
     back arm → instrument parts marked 'back' → body and head → the instrument → hands → front arm → 'top' parts.
     Front-held instruments go over the torso; both hands are drawn on top of the instrument so it reads as HELD.
     Arms are drawn in code from each SHOULDER (below) to a hand point.
     SHAPES: every instrument's pixel maps (palette INSTRUMENT_PALETTE).
     POSES[memberId] = {side, front, play}: CARRY facing right / CARRY facing the viewer (the back view uses the front
       one, hidden behind the body) / PLAYING (side view). Each = {parts: [[shape, x, y, 'back'?]], hands}, or for
       PLAYING a list of 2 frames (bells and snare: mallets up, then striking). A part's last word: 'back' = behind
       the body, 'top' = held over the hands (sticks, mallets), none = in front of the body, under the hands.
       hands = {back, front} (side view) or
       {left, right} (front view, as you look at it): [x, y] = the 2 × 2 hand's top-left pixel, 'rest' = arm down.
       NUDGE A HAND OR AN INSTRUMENT HERE: x grows to the right, y grows down, on the 32 × 32 canvas.
     Handy spots: SIDE mouth (18, 11), shoulders back (13, 15) / front (16, 15), torso x 12–18, feet y 30.
                  FRONT mouth (15–16, 11), shoulders left (11, 15) / right (20, 15), torso x 11–20. */
window.QUEST_ART = window.QUEST_ART || {};
(function (Q) {
  "use strict";

  /* ---------- the players ----------
     Their bodies, faces, hair and clothes are the student's AVATAR (shared/avatar-parts.js, drawn by shared/avatar.js).
     These are the arm SHOULDERS the avatar's arms start from (the hands go to each POSE's hand points). */
  Q.SHOULDERS = {side: {back: [13, 15], front: [16, 15]}, front: {left: [11, 15], right: [20, 15]}};

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
})(window.QUEST_ART);
