/* Band Arcade: UNLOCKABLE SKINS for the instrument portraits (shared/portraits.js draws them).
   A student wears ONE color skin plus (optionally) ONE accessory, saved per instrument on this device
   (Arcade.store.skin / setSkin). Skins are earned by playing; nothing here is copied from real games or brands.

   HOW TO ADD A SKIN: add a line to SKINS below.
     id       never change it once students have it (it is saved on their device)
     kind     'color' (a look for the whole portrait) or 'acc' (an accessory drawn on top; combines with any color)
     name     what students see, and what screen readers say ("Trumpet, Flame skin, Crown")
     unlock   how it is earned (see UNLOCK RULES)
     look     color skins only:
                colors    two theme tokens (without --): the rim light / glow, and the SVG-portrait recolor
                backdrop  'horizon' (synthwave sun + stripes) | 'galaxy' (stars + nebula)        drawn in CSS
                aura      'flame' (fire around the instrument)                                  drawn in SVG below
                fx        'sparkle' | 'sweep' (a band of light) | 'shimmer' (prismatic) | 'animatronic' (metal sheen + bolts)
                          | 'nightmare' (cracked chrome + a few loose wires) | 'stripes' (two racing stripes down the art)
                stripes   true: Sustain Speedway's car gets racing stripes too
                eyes      true: a pair of glowing eyes on the instrument's "face" (ANCHORS), in the skin's second color;
                          'flicker': one red, one blue, swapping slowly on the big portrait (still under reduced motion)
                pixel     true: the art is redrawn pixelated with a chunky 8-bit frame
                          (fx 'pixelsparks': chunky square pixel sparkles too: Pixel Hero)
                ghost     true: see-through, with a ghost-trail glow
              Animation (auras, sparkles, sweeps, floating) plays ONLY on the big Select Player portraits and
              never under prefers-reduced-motion; tiles, chips and in-game portraits get the still version.
     art      accessories only: which ANCHOR it sits on ('head' | 'face' | 'back') and its drawing (ACC_ART)
   UNLOCK RULES (the `unlock` field):
     {always: true}                       everyone has it
     {stars: 50}                          50 ★ on THIS instrument, all games and all modes (Arcade.store.allStars)
     {game, level, stars, text}           achievement: any instrument has `stars` on that level of that game, in
                                          any NOTES × ORDER mode. Unlocks for EVERY instrument on the device.
                                          + suffix: only progress keys ending in it (':extra' = Showtime
                                          Malfunction's NIGHTMARE difficulty)
                                          + key: only that ONE progress key ('note-ninja:random-chromatic' = the
                                          Diamond skin: Chromatic notes, Random order)
     OWNED: a skin whose 'skin:<id>' is in store.ownedItems is unlocked whatever its rule says (storage.js migrate()
     'ninja-diamond-chromatic' keeps the Diamond skin for devices that earned it under the old any-note-set rule).
     {game, badge: true, text}            achievement: any Ancient Ninja Scrolls TEST READY badge
     {game, achievement: 'id', text}      achievement: store.gameData(game).achievements[id] is true (the game sets it;
                                          Sustain Speedway: 'virtuoso-win' = won any track on Virtuoso)
   A rule for a game that isn't in shared/games.js is skipped (the skin stays locked, with its text shown).
   DRAWN VARIANTS: shared/portraits/<file>--<skin id>.png (and <file>-full--<skin id>.png) replace the effect
   version for that instrument (see shared/portraits/README.md).
   ?demo&unlockall previews every skin without earning it (nothing is saved as unlocked). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";

  const SKINS = [
    // ---- color skins --------------------------------------------------------------------------------------
    {id: 'classic', kind: 'color', name: 'Classic Neon', unlock: {always: true},  look: {}},
    {id: 'sunset',  kind: 'color', name: 'Sunset Wave',  unlock: {stars: 10},     look: {colors: ['pink', 'amber'], backdrop: 'horizon'}},
    {id: 'ice',     kind: 'color', name: 'Ice Crystal',  unlock: {stars: 50},     look: {colors: ['cyan', 'white'], fx: 'sparkle'}},
    {id: 'flame',   kind: 'color', name: 'Flame',        unlock: {stars: 150},    look: {colors: ['amber', 'red'], aura: 'flame'}},
    {id: 'galaxy',  kind: 'color', name: 'Galaxy',       unlock: {stars: 200},    look: {colors: ['purple', 'pink'], backdrop: 'galaxy'}},
    {id: 'pixel',   kind: 'color', name: 'Pixel',        unlock: {stars: 300},    look: {colors: ['green', 'cyan'], pixel: true}},
    {id: 'gold',    kind: 'color', name: 'Chrome Gold',  unlock: {game: 'chime-heist', level: 8, stars: 1, text: 'Clear The Golden Vault in Chime Heist'},
                                                                                  look: {colors: ['yellow', 'amber'], fx: 'sweep'}},
    // Note Ninja's RARE DIAMOND GEAR: Chromatic + Random only (the same rule as avatar-parts.js NINJA_DIAMOND)
    {id: 'diamond', kind: 'color', name: 'Diamond',      unlock: {game: 'note-ninja', level: 10, stars: 1, key: 'note-ninja:random-chromatic', text: 'Earn the Diamond belt in Note Ninja on Chromatic notes, Random order'},
                                                                                  look: {colors: ['cyan', 'pink'], fx: 'shimmer'}},
    {id: 'animatronic', kind: 'color', name: 'Animatronic', unlock: {game: 'showtime-malfunction', level: 8, stars: 1, text: 'Defeat Maestro Moose in Showtime Malfunction'},
                                                                                  look: {colors: ['anim-metal', 'anim-eye-good'], fx: 'animatronic', eyes: true}},
    {id: 'nightmare', kind: 'color', name: 'Nightmare Animatronic', unlock: {game: 'showtime-malfunction', level: 8, stars: 1, suffix: ':extra', text: 'Clear The Midnight Encore on NIGHTMARE in Showtime Malfunction'},
                                                                                  look: {colors: ['anim-chrome', 'anim-eye-bad'], fx: 'nightmare', eyes: 'flicker'}},
    {id: 'stripes', kind: 'color', name: 'Racing Stripes', unlock: {game: 'sustain-speedway', level: 8, stars: 3, text: 'Win The Grand Prix in Sustain Speedway'},
                                                                                  look: {colors: ['pink', 'amber'], fx: 'stripes', stripes: true}},
    {id: 'ghostly', kind: 'color', name: 'Ghostly',      unlock: {game: 'ghost-notes', level: 8, stars: 3, text: 'Get 3 ★ on Ghost Run in Ghost Notes'},
                                                                                  look: {colors: ['cyan', 'purple'], ghost: true}},
    {id: 'pixelhero', kind: 'color', name: 'Pixel Hero', unlock: {game: 'arcade-quest', achievement: 'ep1', text: 'Finish Episode 1 of Arcade Quest'},
                                                                                  look: {colors: ['yellow', 'cyan'], pixel: true, fx: 'pixelsparks'}},
    // ---- accessories (combine with any color skin) ---------------------------------------------------------
    {id: 'headband', kind: 'acc', name: 'Headband',   unlock: {stars: 25},  art: 'face'},
    {id: 'shades',   kind: 'acc', name: 'Shades',     unlock: {stars: 100}, art: 'face'},
    {id: 'visor',    kind: 'acc', name: 'Visor',      unlock: {stars: 500}, art: 'face'},
    {id: 'crown',    kind: 'acc', name: 'Crown',      unlock: {game: 'button-masher', level: 8, stars: 1, text: 'Defeat The Conductor in Button Masher'}, art: 'head'},
    {id: 'cape',     kind: 'acc', name: 'Cape',       unlock: {game: 'neon-face-off', level: 8, stars: 1, text: 'Beat The Champ in Neon Face-Off (1 player vs CPU)'}, art: 'back'},
    {id: 'helmet',   kind: 'acc', name: 'Helmet',     unlock: {game: 'sustain-speedway', achievement: 'virtuoso-win', text: 'Win any track on Virtuoso in Sustain Speedway'}, art: 'head'},
    {id: 'mask',     kind: 'acc', name: 'Ninja Mask', unlock: {game: 'ancient-ninja-scrolls', badge: true, text: 'Earn a TEST READY badge in Ancient Ninja Scrolls'}, art: 'face'},
    {id: 'baton',    kind: 'acc', name: 'Baton',      unlock: {game: 'arcade-quest', achievement: 'manor-friends', text: 'Befriend every kind of ghost in Ghost Notes Manor (Arcade Quest)'}, art: 'head'},
  ];

  /* ACCESSORY ANCHORS: where each accessory sits on each instrument's portrait, in PERCENT of the square
     portrait (0 = left/top edge, 100 = right/bottom edge), the same square you see on a Select Player tile.
       head: [x, y, width]         the top of the instrument: the Crown's bottom edge sits here
       face: [x, y, width, tilt]   the instrument's "face": Shades, Visor and Ninja Mask are centered here, the
                                   Headband just above; tilt in degrees (+ = clockwise), to follow a slanted tube.
       back: [x, y, width]         (optional) the top middle of the Cape, which hangs BEHIND the instrument;
                                   without it the Cape hangs from just above the face.
     img = Mat's picture (shared/portraits/<file>.png); svg = the drawn fallback portrait; full (optional) = the
     <file>-full picture in the big preview (without it, the img numbers are used there too).
     If an accessory sits wrong, nudge these numbers (see shared/portraits/README.md). */
  const ANCHORS = {
    flute:      {img: {head: [86, 7, 20],  face: [70, 31, 26, 38]},  svg: {head: [87, 28, 17], face: [68, 41, 24, -26]}},
    oboe:       {img: {head: [77, 6, 15],  face: [63, 30, 22, 32]},  svg: {head: [64, 7, 14],  face: [56, 31, 21, 18]}},
    clarinet:   {img: {head: [66, 5, 15],  face: [60, 28, 22, 16]},  svg: {head: [37, 7, 14],  face: [44, 31, 21, -18]}},
    basscl:     {img: {head: [55, 5, 20],  face: [47, 30, 22, 4]},   svg: {head: [55, 6, 17],  face: [46, 32, 20, 0]}},
    bassoon:    {img: {head: [35, 5, 14],  face: [44, 26, 21, 22]},  svg: {head: [42, 5, 14],  face: [42, 30, 20, 0]}},
    altosax:    {img: {head: [69, 7, 20],  face: [58, 32, 24, 35]},  svg: {head: [50, 8, 17],  face: [40, 34, 21, 0]}},
    tenorsax:   {img: {head: [69, 7, 20],  face: [58, 32, 24, 35]},  svg: {head: [52, 8, 17],  face: [40, 34, 21, 0]}},
    barisax:    {img: {head: [52, 7, 17],  face: [66, 32, 24, 40]},  svg: {head: [31, 12, 20], face: [44, 48, 21, 0]}},
    trumpet:    {img: {head: [42, 36, 22], face: [88, 45, 20, -8], back: [46, 40, 40]},  svg: {head: [48, 34, 22], face: [76, 45, 21, 0]}},
    horn:       {img: {head: [78, 19, 25], face: [80, 48, 27, 0], back: [52, 34, 46]},   svg: {head: [47, 20, 25], face: [46, 52, 24, 0]}},
    trombone:   {img: {head: [58, 21, 17], face: [58, 34, 18, 0], back: [44, 34, 34]},   svg: {head: [30, 9, 17],  face: [36, 26, 18, 0]}},
    baritonetc: {img: {head: [60, 6, 31],  face: [40, 42, 27, 0]},   svg: {head: [71, 16, 25], face: [38, 56, 18, 0]}},
    euphbc:     {img: {head: [60, 6, 31],  face: [40, 42, 27, 0]},   svg: {head: [72, 10, 31], face: [36, 56, 18, 0]}},
    tuba:       {img: {head: [88, 25, 20], face: [26, 57, 27, 0], back: [42, 42, 46]},   svg: {head: [71, 4, 34],  face: [34, 60, 21, 0]}},
    snare:      {img: {head: [50, 43, 26], face: [50, 64, 34, 0], back: [50, 52, 60]},   svg: {head: [50, 43, 26], face: [50, 64, 34, 0], back: [50, 52, 60]}},
    bells:      {img: {head: [50, 23, 25], face: [50, 42, 33, 0], back: [50, 30, 44]},   svg: {head: [50, 30, 28], face: [50, 52, 30, 0]}},
  };

  /* the accessory drawings, each on a 100 × 100 grid centered on its anchor (the Crown: 100 × 64, bottom edge on
     the anchor; the Cape: 100 × 130, hanging from its top). Colors are theme tokens. */
  const ACC_ART = {
    headband: {vb: '0 0 100 100', svg:
      '<path d="M2 17Q50 8 98 17V30Q50 21 2 30Z" fill="var(--red)" stroke="var(--red-hi)" stroke-width="2.5"/>' +
      '<path d="M8 23Q50 15 92 23" stroke="var(--white-hi)" stroke-width="1.4" opacity=".6" fill="none"/>' +
      '<circle cx="97" cy="23" r="5" fill="var(--red)" stroke="var(--red-hi)" stroke-width="2"/>' +
      '<path d="M100 23Q112 26 118 38M100 25Q108 34 108 46" stroke="var(--red)" stroke-width="6" stroke-linecap="round" fill="none"/>'},
    shades: {vb: '0 0 100 100', svg:
      '<path d="M6 40H45Q45 62 27 62Q8 62 6 40ZM55 40H94Q92 62 73 62Q55 62 55 40Z" fill="var(--deep)" stroke="var(--cyan)" stroke-width="3.2"/>' +
      '<path d="M45 43Q50 38 55 43" stroke="var(--cyan)" stroke-width="3" fill="none"/>' +
      '<path d="M6 41L-2 38M94 41L102 38" stroke="var(--cyan)" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M13 45L24 45M62 45L73 45" stroke="var(--white-hi)" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>'},
    visor: {vb: '0 0 100 100', svg:
      '<path d="M3 45Q50 29 97 45L92 61Q50 50 8 61Z" fill="var(--cyan)" fill-opacity=".38" stroke="var(--cyan-hi)" stroke-width="2.6"/>' +
      '<path d="M12 45Q50 34 88 45" stroke="var(--white-hi)" stroke-width="2" fill="none" opacity=".8"/>' +
      '<path d="M3 45L-3 50M97 45L103 50" stroke="var(--cyan-hi)" stroke-width="3" stroke-linecap="round"/>'},
    mask: {vb: '0 0 100 100', svg:
      '<path d="M2 35Q50 27 98 35V64Q50 72 2 64Z" fill="var(--deep)" stroke="var(--purple)" stroke-width="2.6"/>' +
      '<path d="M20 49Q31 40 42 49Q31 55 20 49ZM58 49Q69 40 80 49Q69 55 58 49Z" fill="var(--white-hi)"/>' +
      '<circle cx="32" cy="48.5" r="2.6" fill="var(--ink)"/><circle cx="68" cy="48.5" r="2.6" fill="var(--ink)"/>' +
      '<path d="M98 42Q110 44 116 56M98 50Q106 58 104 70" stroke="var(--deep)" stroke-width="6" stroke-linecap="round" fill="none"/>' +
      '<path d="M98 42Q110 44 116 56M98 50Q106 58 104 70" stroke="var(--purple)" stroke-width="1.6" stroke-linecap="round" fill="none"/>'},
    // a racing helmet (original): a rounded shell with a visor and a center stripe, sitting on the head anchor
    helmet: {vb: '0 0 100 72', svg:
      '<path d="M8 66Q4 18 50 6Q96 18 92 66Z" fill="var(--pink)" stroke="var(--pink-hi)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M44 7Q50 5 56 7L58 66H42Z" fill="var(--amber-hi)" opacity=".9"/>' +
      '<path d="M14 50Q50 34 86 50L84 62Q50 52 16 62Z" fill="var(--deep)" stroke="var(--cyan)" stroke-width="2.4"/>' +
      '<path d="M22 50Q50 40 78 50" stroke="var(--cyan-hi)" stroke-width="2" fill="none" opacity=".8"/>'},
    // the Ghost Conductor's baton (original): a white stick with a cork grip, tilted, a gold sparkle at the tip
    baton: {vb: '0 0 100 64', svg:
      '<path d="M18 58L86 12" stroke="var(--deep)" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M18 58L86 12" stroke="var(--white-hi)" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M10 64L32 48" stroke="var(--deep)" stroke-width="20" stroke-linecap="round"/>' +
      '<path d="M10 64L32 48" stroke="var(--amber)" stroke-width="15" stroke-linecap="round"/>' +
      '<path d="M12 60L28 49" stroke="var(--amber-hi)" stroke-width="4" stroke-linecap="round" opacity=".7"/>' +
      '<path transform="translate(90 9)" d="M0 -13L3 -3L13 0L3 3L0 13L-3 3L-13 0L-3 -3Z" fill="var(--yellow)" stroke="var(--amber)" stroke-width="1.5"/>'},
    crown: {vb: '0 0 100 64', svg:
      '<path d="M8 60L3 16L28 36L50 5L72 36L97 16L92 60Z" fill="var(--yellow)" stroke="var(--amber)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M10 50H90" stroke="var(--amber)" stroke-width="3"/>' +
      '<circle cx="3" cy="15" r="4" fill="var(--yellow)"/><circle cx="50" cy="5" r="4.5" fill="var(--yellow)"/><circle cx="97" cy="15" r="4" fill="var(--yellow)"/>' +
      '<circle cx="30" cy="55" r="3.4" fill="var(--pink)"/><circle cx="50" cy="55" r="3.8" fill="var(--cyan)"/><circle cx="70" cy="55" r="3.4" fill="var(--pink)"/>'},
    // not a skin by itself: the Animatronic skin's glowing eyes (look.eyes), on the face anchor
    eyes: {vb: '0 0 100 100', svg:
      '<circle cx="30" cy="50" r="15" fill="var(--sk2)" opacity=".3"/><circle cx="70" cy="50" r="15" fill="var(--sk2)" opacity=".3"/>' +
      '<circle cx="30" cy="50" r="7.5" fill="var(--sk2)" stroke="var(--anim-metal-dark)" stroke-width="2"/><circle cx="70" cy="50" r="7.5" fill="var(--sk2)" stroke="var(--anim-metal-dark)" stroke-width="2"/>' +
      '<circle cx="32.5" cy="47.5" r="2.4" fill="var(--white-hi)"/><circle cx="72.5" cy="47.5" r="2.4" fill="var(--white-hi)"/>'},
    // not a skin by itself: the Nightmare Animatronic's eyes (look.eyes 'flicker'): one red, one blue, cracked lenses
    eyesNm: {vb: '0 0 100 100', svg:
      '<circle class="nm-glow nm-a" cx="30" cy="50" r="15" opacity=".3"/><circle class="nm-glow nm-b" cx="70" cy="50" r="15" opacity=".3"/>' +
      '<circle class="nm-eye nm-a" cx="30" cy="50" r="7.5" stroke="var(--anim-metal-dark)" stroke-width="2"/><circle class="nm-eye nm-b" cx="70" cy="50" r="7.5" stroke="var(--anim-metal-dark)" stroke-width="2"/>' +
      '<circle cx="32.5" cy="47.5" r="2.2" fill="var(--white-hi)"/><circle cx="72.5" cy="47.5" r="2.2" fill="var(--white-hi)"/>' +
      '<path d="M24 45L29 51L27 56M66 43L71 49" stroke="var(--anim-metal-dark)" stroke-width="1.2" fill="none"/>'},
    cape: {vb: '0 0 100 130', svg:
      '<path d="M30 4Q50 13 70 4L97 116Q74 102 50 124Q26 102 3 116Z" fill="var(--red)" fill-opacity=".9" stroke="var(--pink-hi)" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M36 14Q50 20 64 14L84 106Q68 96 50 112Q32 96 16 106Z" fill="var(--purple)" fill-opacity=".55"/>' +
      '<circle cx="50" cy="10" r="5" fill="var(--yellow)" stroke="var(--amber)" stroke-width="2"/>'},
  };

  /* the drawn parts of the effects (everything else is CSS in theme.css, section "Skins") */
  const star4 = (x, y, s, cls = '') => `<path class="${cls}" transform="translate(${x} ${y}) scale(${s})" d="M0 -6L1.4 -1.4L6 0L1.4 1.4L0 6L-1.4 1.4L-6 0L-1.4 -1.4Z"/>`;
  const flame = (x, b, w, h, i) => `<g class="sk-tongue" style="--i:${i}">` +
    `<path d="M${x} ${b}C${x - w} ${b} ${x - w * .9} ${b - h * .5} ${x} ${b - h}C${x + w * .9} ${b - h * .5} ${x + w} ${b} ${x}${' '}${b}Z" fill="var(--red)" opacity=".6"/>` +
    `<path d="M${x} ${b}C${x - w * .6} ${b} ${x - w * .5} ${b - h * .38} ${x} ${b - h * .72}C${x + w * .5} ${b - h * .38} ${x + w * .6} ${b} ${x} ${b}Z" fill="var(--amber)"/>` +
    `<path d="M${x} ${b}C${x - w * .3} ${b} ${x - w * .25} ${b - h * .2} ${x} ${b - h * .4}C${x + w * .25} ${b - h * .2} ${x + w * .3} ${b} ${x} ${b}Z" fill="var(--yellow)"/></g>`;
  const FLAMES = [[8, 100, 9, 34], [22, 100, 11, 48], [37, 100, 11, 58], [50, 100, 12, 66], [63, 100, 11, 56], [78, 100, 11, 50], [92, 100, 9, 36],
    [5, 74, 6, 26], [95, 76, 6, 28]];
  const AURA = {
    flame: `<svg class="sk-aura" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${FLAMES.map((f, i) => flame(...f, i)).join('')}</svg>`,
  };
  const SPARKS = [[18, 22, .9], [82, 18, .7], [88, 62, 1], [12, 70, .75], [50, 8, .6], [64, 88, .8], [30, 46, .5]];
  const FX = {
    sparkle: `<svg class="sk-sparks" viewBox="0 0 100 100" aria-hidden="true">${SPARKS.map(([x, y, s], i) => `<g style="--i:${i}">${star4(x, y, s, 'sk-spark')}</g>`).join('')}</svg>`,
    // Pixel Hero: chunky square pixel sparkles (a plus of squares), animated like Sparkle on the big portrait
    pixelsparks: `<svg class="sk-sparks sk-psparks" viewBox="0 0 100 100" aria-hidden="true" shape-rendering="crispEdges">${SPARKS.map(([x, y, s], i) =>
      `<g style="--i:${i}"><path class="sk-spark" transform="translate(${x} ${y}) scale(${s})" d="M-1.5 -6H1.5V-1.5H6V1.5H1.5V6H-1.5V1.5H-6V-1.5H-1.5Z"/></g>`).join('')}</svg>`,
    sweep: '', shimmer: '', stripes: '',
    animatronic: '',
    // cracks across the chrome (inside the masked layer, so they only show on the art)
    nightmare: `<svg class="sk-cracks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
      `<path d="M58 4L52 20L60 28L49 44M52 20L42 24M60 28L72 34M18 62L30 66L27 78L38 90M30 66L40 60M80 70L72 80L78 92"/></svg>`,
  };
  /* the Nightmare Animatronic's loose wires, dangling past the edges (outside the mask, like the bolts) */
  const WIRES = `<svg class="sk-wires" viewBox="0 0 100 100" aria-hidden="true" overflow="visible">` +
    `<path class="w1" d="M14 30Q4 40 9 52Q13 60 6 68"/><path class="w2" d="M86 22Q98 30 93 44"/><path class="w3" d="M78 84Q88 92 84 102"/>` +
    `<circle class="wtip" cx="6" cy="68" r="1.8"/><circle class="wtip" cx="93" cy="44" r="1.8"/><circle class="wtip" cx="84" cy="102" r="1.8"/></svg>`;
  /* the Animatronic skin's four bolts: outside the masked effect layer, so they show at the corners */
  const BOLTS = `<svg class="sk-bolts" viewBox="0 0 100 100" aria-hidden="true">${[[9, 9], [91, 9], [9, 91], [91, 91]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="3.2"/><path d="M${x - 2} ${y}h4"/>`).join('')}</svg>`;

  const byId = {}; SKINS.forEach(s => { byId[s.id] = s; });
  const get = id => byId[id] || null;
  const UNLOCK_ALL = !!(A.DEMO && A.params && A.params.has('unlockall'));
  const hasGame = id => !A.GAMES || A.GAMES.some(g => g.id === id);
  const st = () => A.store;
  const milestone = s => !!(s && s.unlock && s.unlock.stars && !s.unlock.game);     // a per-instrument star goal

  /** is this skin unlocked for this instrument member? */
  function isUnlocked(skin, member) {
    const s = typeof skin === 'string' ? get(skin) : skin, u = s && s.unlock;
    if (!u) return false;
    if (u.always || UNLOCK_ALL) return true;
    if ((st().ownedItems || {})['skin:' + s.id]) return true;            // owned (kept from an older rule)
    return ruleMet(u, member);
  }
  /** an unlock rule from saved progress (skins here; avatar items in avatar.js use it for their game rules):
      {stars} = this member's star total, {game, badge|achievement|level…} = that game's records (any instrument) */
  function ruleMet(u, member) {
    if (!u) return false;
    if (u.stars && !u.game) return !!member && st().allStars(member) >= u.stars;
    if (u.tool) return toolCount(u.tool) >= (u.n || 1);
    if (!u.game || !hasGame(u.game)) return false;
    if (u.badge) return Object.keys((st().gameData(u.game) || {}).badges || {}).length > 0;
    if (u.badges) return Object.keys((st().gameData(u.game) || {}).badges || {}).length >= u.badges;
    if (u.perfect) { for (let lv = 1; lv <= u.perfect; lv++) if (st().bestLevelStars(u.game, lv, u.suffix) < 3) return false; return true; }
    if (u.endless) return endlessBest(u.game) >= u.endless;
    if (u.achievement) return !!((st().gameData(u.game) || {}).achievements || {})[u.achievement];
    if (u.level) return st().bestLevelStars(u.key || u.game, u.level, u.suffix, u.exact || !!u.key) >= (u.stars || 1);   // key: that one progress key
    if (u.wins) return winsOn(u.game) >= u.wins;
    return false;
  }
  /** TUNE UP's practice goals (note-checker/, gameData('tuneup')): 'tuner-hold' = the most HOLD IT rings filled on
      one day; 'ladder' = Tempo Ladders of 8+ steps climbed to the goal; 'practice-pro' = Today's Practice's weekly goal
      reached once (gameData('practice').pro, shared/practice.js) */
  function toolCount(tool) {
    const d = st().gameData('tuneup') || {};
    if (tool === 'tuner-hold') return Math.max(0, ...Object.values(d.holds || {}).map(n => +n || 0));
    if (tool === 'ladder') return +d.ladders || 0;
    if (tool === 'practice-pro') return (st().gameData('practice') || {}).pro ? 1 : 0;   // Today's Practice (shared/practice.js)
    return 0;
  }
  /** matches won on this device ({game, wins} rules), counted from what each game already saves, so old wins count:
      Dojo Duel = every player's dojo record (Solo wins over the Sensei included); Neon Face-Off = two-player wins
      (h2h) + wins over the CPU (its cpuWins counter, or at least one per rival beaten before the counter existed) */
  const WINS = {
    'dojo-duel': d => Object.values(d.record || {}).reduce((n, v) => n + (+v || 0), 0),
    'neon-face-off': d => Object.values(d.h2h || {}).reduce((n, r) => n + (+r.p1 || 0) + (+r.p2 || 0), 0) +
      Math.max(+d.cpuWins || 0, [1, 2, 3, 4, 5, 6, 7, 8].filter(lv => st().bestLevelStars('neon-face-off', lv) >= 1).length),
  };
  function winsOn(game) { const f = WINS[game]; return f ? f(st().gameData(game) || {}) : 0; }
  /** the longest Endless run on this device (its `notes`: Lost Signal's longest signal, Vanishing Ink's longest scroll…):
      shared/endless.js remembers the best of every run, and the Top 5 lists count too (runs from before that) */
  function endlessBest(game) {
    let best = +((st().gameData('endless-best') || {})[game] || 0);
    const g = st().endlessRuns ? st().endlessRuns(game) : {};
    Object.values(g).forEach(inst => Object.values(inst).forEach(list => (list || []).forEach(e => { best = Math.max(best, +e.notes || 0); })));
    return best;
  }
  const AV = () => A.Avatar && A.Avatar.freshItems ? A.Avatar : null;
  const ITEM_KIND = {eyes: 'Expression', mouth: 'Expression', hairColor: 'Hair color', head: 'Hat', top: 'Outfit', pet: 'Pet', back: 'Back item', bg: 'Background',
    hand: 'Held item', effect: 'Effect', plate: 'Name plate', shoes: 'Shoes', belt: 'Belt'};
  /** what a locked skin asks for, in student words */
  function requirement(skin) {
    const u = skin.unlock || {};
    if (u.always) return 'Always yours';
    if (milestone(skin)) return `Earn ${u.stars} ★ to unlock`;
    return u.text || 'Keep playing to unlock';
  }
  /** "37 of 50 ★" for star skins on this member, else '' */
  function progress(skin, member) {
    const u = skin.unlock || {};
    return milestone(skin) && member ? `${Math.min(st().allStars(member), u.stars)} of ${u.stars} ★ on this instrument` : '';
  }
  const seenKey = (skin, member) => milestone(skin) ? member : '*';

  const Skins = A.Skins = {
    LIST: SKINS, ANCHORS, ACC_ART, UNLOCK_ALL, get, isUnlocked, ruleMet, toolCount, winsOn, endlessBest, requirement, progress, milestone,
    colors: () => SKINS.filter(s => s.kind === 'color'),
    accessories: () => SKINS.filter(s => s.kind === 'acc'),
    /** the equipped {color, acc} for a member (a locked choice falls back to Classic Neon / none) */
    equipped(member) {
      if (!member || !ANCHORS[member]) return {color: 'classic', acc: null};
      const e = st().skin(member);
      return {color: get(e.color) && isUnlocked(e.color, member) ? e.color : 'classic',
              acc: e.acc && get(e.acc) && isUnlocked(e.acc, member) ? e.acc : null};
    },
    /** equip a color skin or accessory ({color: id} | {acc: id | null}) on this member */
    equip(member, patch, {sound = true} = {}) {
      st().setSkin(member, patch);
      if (sound) sfx('skin-equip');
    },
    /** the words screen readers hear after the instrument name: 'Flame skin, Crown' ('' for plain Classic Neon) */
    label(eq) {
      const parts = [];
      if (eq && eq.color && eq.color !== 'classic' && get(eq.color)) parts.push(get(eq.color).name + ' skin');
      if (eq && eq.acc && get(eq.acc)) parts.push(get(eq.acc).name);
      return parts.join(', ');
    },
    /** skins this member has unlocked but whose UNLOCKED! card hasn't been shown (never counts ?unlockall) */
    fresh(member) {
      if (UNLOCK_ALL) return [];
      const seenM = member ? st().skinsSeen(member) : {}, seenAll = st().skinsSeen('*');
      return SKINS.filter(s => !s.unlock.always && !(milestone(s) && !member) && isUnlocked(s, member) &&
        !(seenKey(s, member) === '*' ? seenAll : seenM)[s.id]);
    },
    markSeen(member, list) {
      const mine = list.filter(s => seenKey(s, member) !== '*').map(s => s.id), all = list.filter(s => seenKey(s, member) === '*').map(s => s.id);
      if (mine.length && member) st().markSkinsSeen(member, mine);
      if (all.length) st().markSkinsSeen('*', all);
    },

    /** everything portraits.js needs to draw a skinned portrait of `id` at `size` */
    decorate(id, eq, size) {
      const c = get(eq && eq.color) || get('classic'), a = eq && eq.acc ? get(eq.acc) : null, look = c.look || {};
      const cls = ['sk-c-' + c.id], parts = {before: '', after: '', cape: ''};
      const [c1, c2] = look.colors || [];
      if (c1) cls.push('sk-rim');
      if (look.backdrop) cls.push('sk-bg-' + look.backdrop);
      if (look.aura) cls.push('sk-aura-' + look.aura);
      if (look.fx) cls.push('sk-fx-' + look.fx);
      if (look.pixel) cls.push('sk-pixel');
      if (look.ghost) cls.push('sk-ghost');
      if (look.backdrop || look.aura || look.pixel) parts.before = `<span class="sk-back" aria-hidden="true">${look.aura ? AURA[look.aura] || '' : ''}</span>`;
      if (look.fx) parts.after = `<span class="sk-fx" aria-hidden="true">${FX[look.fx] || ''}</span>` + (look.fx === 'animatronic' ? BOLTS : look.fx === 'nightmare' ? BOLTS + WIRES : '');
      if (look.eyes && ANCHORS[id]) parts.after += accHTML(id, {id: look.eyes === 'flicker' ? 'eyesNm' : 'eyes', art: 'face'}).replace('class="sk-acc ', 'class="sk-acc sk-eyes ');
      if (a && ACC_ART[a.id] && ANCHORS[id]) {
        cls.push('has-acc', 'acc-' + a.id);
        const html = accHTML(id, a);
        if (a.art === 'back') parts.cape = html; else parts.after += html;
      }
      const style = c1 ? `--sk1:var(--${c1});--sk2:var(--${c2 || c1})` : '';
      return {cls: cls.join(' '), style, parts, svgColor: c1 ? `var(--${c1 === 'white' ? 'white-hi' : c1})` : undefined,
              svgGlow: c2 ? `var(--${c2 === 'white' ? 'white-hi' : c2})` : undefined, variants: {c: c.id === 'classic' ? null : c.id, a: a ? a.id : null}};
    },
    /** the accessory by itself, e.g. for the locker's accessory buttons */
    accSVG(accId, cls = '') { const art = ACC_ART[accId]; return art ? `<svg class="sk-acc-solo ${cls}" viewBox="${art.vb}" aria-hidden="true" overflow="visible">${art.svg}</svg>` : ''; },

    /** the UNLOCKED! card for newly earned skins, shown with `member`'s portrait (null: the skin by itself) */
    cardHTML(list, member) {
      const eq = member ? Skins.equipped(member) : {color: 'classic', acc: null};
      const skinOf = s => s.kind === 'acc' ? {color: eq.color, acc: s.id} : {color: s.id, acc: eq.acc};
      const pic = s => member && A.avatarHTML ? A.avatarHTML({size: 'tile', member, skin: skinOf(s)})          // worn by the student's avatar
        : member && A.portraitHTML ? A.portraitHTML(member, {size: 'tile', skin: skinOf(s)})
        : s.kind === 'acc' ? Skins.accSVG(s.id) : `<span class="sk-swatch" style="--sk1:var(--${((s.look || {}).colors || ['cyan'])[0]})"></span>`;
      const m = member && A.memberById ? A.memberById(member) : null;
      const itemPic = it => it.field === 'plate' ? `<span class="sk-u-plate"><span class="av-plate av-plate-${it.id}">${A.Avatar.nameOf(A.Avatar.get()).split(' ').slice(-1)[0]}</span></span>`
        : A.avatarHTML({size: 'tile', member, avatar: Object.assign(A.Avatar.get(), {[it.field]: it.id})});
      // a LEGENDARY item (avatar-parts.js legendary: true: the Grandmaster's Aura) turns the whole card gold and diamond
      const legend = list.some(s => s.item && s.item.legendary);
      return `<div class="sk-unlock${legend ? ' sk-legendary' : ''}" role="status"><p class="sk-u-title ui-section">${legend ? 'Legendary!' : 'Unlocked!'}</p><div class="sk-u-list">` + list.map(s => s.item ?
        `<div class="sk-u-item sk-u-av${s.item.legendary ? ' sk-u-legend' : ''}"><span class="sk-u-pic">${itemPic(s.item)}</span>` +
        (s.item.legendary ? `<span class="sk-u-badge">Legendary</span>` : '') + `<b class="sk-u-name">${s.item.name}</b>` +
        (s.item.legendary ? `<small>All 10 Band Ninja belt codes. The rarest item in the arcade!</small>`
          : s.item.official ? `<small>Official Band Ninja gear: earned in class</small>` : `<small>${ITEM_KIND[s.item.field] || 'Item'} for your player · ${s.item.unlock.stars && !s.item.unlock.game ? `${s.item.unlock.stars} ★ in all` : s.item.unlock.event ? eventLine(s.item) : s.item.unlock.shop ? (s.item.unlock.booth === 'quest' ? 'Token Booth in Arcade Quest' : 'Prize Counter') : s.item.unlock.text || ''}</small>`) +
        `<button type="button" class="btn btn-primary btn-small sk-u-equip" data-item="${s.item.key}">Wear it</button></div>` :
        `<div class="sk-u-item"><span class="sk-u-pic">${pic(s)}</span><b class="sk-u-name">${s.name}</b>` +
        `<small>${s.kind === 'acc' ? 'Accessory' : 'Skin'}${milestone(s) ? (m ? ` for ${m.short}` : '') : ' for every instrument'} · ${milestone(s) ? `${s.unlock.stars} ★` : s.unlock.text}</small>` +
        (member ? `<button type="button" class="btn btn-primary btn-small sk-u-equip" data-skin="${s.id}">Equip now</button>` : '') + `</div>`).join('') + `</div></div>`;
    },
    /** check the unlock rules now (results screens): if anything new is unlocked, put the UNLOCKED! card into
        `host` (a results panel: after the stars and the result, above its buttons) and remember it was shown. members: whose star milestones to check (default the
        saved player). Returns the new skins. */
    announce(host, {members, member} = {}) {
      if (!host) return [];
      if (A.Avatar && A.Avatar.stampResults) A.Avatar.stampResults(host, member || (members && members[0]) || st().player);   // the player's avatar + name (shared/avatar.js)
      host.querySelectorAll('.sk-unlock').forEach(el => el.remove());
      const list = (members || [st().player]).filter((m, i, a) => a.indexOf(m) === i);
      let found = [], shownFor = member || list.find(Boolean) || null;
      list.forEach(m => { found = found.concat(Skins.fresh(m).filter(s => !found.some(f => f.id === s.id))); });
      if (A.Seasons && !UNLOCK_ALL) A.Seasons.check();             // a seasonal event step finished: its item is earned now
      const items = AV() ? AV().freshItems() : [];                 // avatar items (device-wide stars, achievements)
      if (!found.length && !items.length) return [];
      list.forEach(m => Skins.markSeen(m, found));
      if (items.length) AV().markSeen(items);
      const wrap = document.createElement('div'); wrap.innerHTML = Skins.cardHTML(items.map(item => ({item})).concat(found), shownFor);
      const card = wrap.firstChild, acts = [...host.children].find(c => c.classList.contains('acts'));
      // after the stars and the result, above the buttons; with the buttons first (UI.results actsFirst) right under them
      const at = acts && acts.classList.contains('ui-res-first') ? acts.nextElementSibling : acts;
      if (at) host.insertBefore(card, at); else host.appendChild(card);
      const ov = host.closest('.overlay'); if (ov) ov.classList.add('sk-tall');      // a taller panel scrolls
      wire(card, shownFor);
      // THE LOCKER from the results (shared/locker.js via avatar-badge.js): everything, NEW ones marked; closes back here
      if (A.Locker && A.Locker.open) {
        const row = document.createElement('div');
        row.className = 'sk-u-more';
        row.innerHTML = `<button type="button" class="btn btn-secondary btn-small sk-u-locker">Open Locker</button>`;
        card.appendChild(row);
        row.firstChild.addEventListener('click', () => A.Locker.open({member: shownFor || st().player, onClose: () => row.firstChild.focus({preventScroll: true})}));
      }
      if (A.Locker && A.Locker.changed) A.Locker.changed();        // the avatar badge's NEW dot
      setTimeout(() => sfx(items.length ? 'item-unlocked' : 'skin-unlocked'), 650);
      return items.map(item => ({item})).concat(found);
    },
    /** Select Player: a card for everything unlocked since the student last looked (existing progress included).
        lead: a line above the card (Arcade Quest's Ghost Whisperer); theme: a class on the overlay ('q-theme');
        onClose(): called once when it closes (OK or Esc) */
    catchUp(member, {onEquip, only, foot, lead, theme, onClose} = {}) {
      // only: item keys (a Band Ninja belt code's gear): just those, no skins
      if (A.Seasons && !UNLOCK_ALL && !only) A.Seasons.check();
      const skins = only ? [] : Skins.fresh(member), items = AV() ? AV().freshItems().filter(it => !only || only.includes(it.key)) : [];
      if (!skins.length && !items.length) return [];
      Skins.markSeen(member, skins);
      if (items.length) AV().markSeen(items);
      const found = items.map(item => ({item})).concat(skins);
      const ov = document.createElement('div');
      ov.className = 'overlay sk-catchup' + (theme ? ' ' + theme : '');
      ov.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-label="New items unlocked">${lead ? `<p class="sk-u-lead">${lead}</p>` : ''}${Skins.cardHTML(found, member)}` +
        `<p class="muted sk-u-foot">${foot ? foot : only ? 'Find it in <b>Create Your Player</b>, on the <b>BAND NINJA</b> tab.' : 'Find everything in the <b>LOCKER</b> on the player card.'}</p>` +
        `<div class="acts"><button type="button" class="btn btn-secondary" data-close>OK</button></div></div>`;
      document.body.appendChild(ov);
      wire(ov, member, onEquip);
      let open = true;
      const close = () => { if (!open) return; open = false; ov.remove(); document.removeEventListener('keydown', esc); if (onClose) onClose(); };
      const esc = e => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', esc);
      ov.querySelector('[data-close]').addEventListener('click', close);
      ov.querySelector('.sk-u-equip, [data-close]').focus();
      setTimeout(() => sfx(items.length ? 'item-unlocked' : 'skin-unlocked'), 250);
      return found;
    },
  };

  /* a seasonal event item's line on the UNLOCKED! card: "Spooky Season: yours forever" */
  function eventLine(item) {
    const ev = A.Seasons && A.Seasons.eventOf(item.key);
    return ev ? `${ev.emoji || ''} ${ev.name}: yours forever`.trim() : 'A seasonal event item';
  }
  function accHTML(id, a) {
    const art = ACC_ART[a.id], an = ANCHORS[id], img = an.img, svg = an.svg || img, full = an.full || img;
    const pick = set => {
      if (a.art === 'head') return set.head.slice(0, 3).concat(0);
      const [x, y, w, r = 0] = set.face;
      if (a.art === 'back') return set.back ? set.back.slice(0, 3).concat(0) : [x, y - w * .35, w * 2.2, 0];
      return [x, y, w, r];
    };
    const v = (k, [x, y, w, r]) => `--${k}x:${x};--${k}y:${y};--${k}w:${w};--${k}r:${r}`;
    return `<svg class="sk-acc sk-acc-${a.art}" viewBox="${art.vb}" overflow="visible" aria-hidden="true" ` +
      `style="${v('s', pick(svg))};${v('i', pick(img))};${v('f', pick(full))}">${art.svg}</svg>`;
  }
  function wire(root, member, onEquip) {
    root.querySelectorAll('.sk-u-equip').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.item) {                                      // an avatar item: the player wears it now
        const [field, id] = b.dataset.item.split(':'), av = A.Avatar.get();
        av[field] = id; A.Avatar.set(av); sfx('skin-equip');
        b.textContent = 'Wearing it!'; b.disabled = true;
        if (onEquip) onEquip({item: b.dataset.item});
        return;
      }
      const s = get(b.dataset.skin); if (!s || !member) return;
      Skins.equip(member, s.kind === 'acc' ? {acc: s.id} : {color: s.id});
      b.textContent = 'Equipped!'; b.disabled = true;
      Skins.refresh(member);
      if (onEquip) onEquip(s);
    }));
  }
  /** redraw a portrait already on the page with its instrument's current skin (keeps its size and options) */
  function refresh(box) {
    if (!A.portraitHTML || !box.dataset.opts || box.closest('.sk-u-pic, .sk-locker .sk-opt')) return;
    const o = JSON.parse(box.dataset.opts); delete o.skin;
    const w = document.createElement('span'); w.innerHTML = A.portraitHTML(box.dataset.pt, o);
    box.replaceWith(w.firstChild);
  }
  Skins.refresh = member => { document.querySelectorAll(`.pt-box[data-pt="${member}"]`).forEach(refresh); if (A.Avatar) A.Avatar.redrawAll(); };   // avatars wear the skins too
  function sfx(name) {
    if (!A.Sfx) return;
    A.Sfx.event(name);                                           // sfx.js mutes the detector if a game is listening
  }
})(window.Arcade);
