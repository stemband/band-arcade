/* Band Arcade — arcade cabinets, drawn in SVG + HTML (no image files).
   Used by the arcade floor (home page) and the Select Player page.
   A game picks its look with the `cabinet` field in shared/games.js; this file holds the
   pieces it picks from:
     SHAPES   silhouettes. Each is drawn on a 300 × 600 grid (the cabinet's own units).
              outline  the whole cabinet seen from the front, side panels included (gets the neon tube)
              face     the front board, inside the side panels
              bezel    the dark surround the screen sits in
              panel    the control panel (a trapezoid; taller = steeper), lip = its front edge
              joy      joystick [x, y];  btns  buttons [[x, y], …] (or [x, y, class] to pick its color)
              wheel    optional steering wheel [x, y, r] instead of the joystick (a sit-down racer)
              joy2     optional second joystick [x, y] (a two-player cabinet; its ball takes the trim color)
              door     coin door {x, y, w, h} (and `doorPath` for an odd shape);  kick  kick plate [x1, x2]
              dial     optional: the door is a round safe door with a combination dial instead of coin slots
              extras   optional extra SVG (decals, lights), drawn last
              slots    where the HTML parts go, as [x, y, w, h]: marquee, screen, start
     SCREENS  attract-mode loops for the screen: html(game, i) draws frame i; `period` (ms) is how
              often the front cabinet redraws. Loops without a period are pure CSS.
   Styles live in shared/cabinets.css. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const TRIMS = ['pink', 'cyan', 'yellow', 'purple', 'amber', 'green', 'red', 'white', 'blue'];
  const MARQUEES = ['bungee', 'haunt', 'pixel', 'shade', 'dojo', 'heist', 'scroll', 'versus', 'faceoff', 'showtime', 'speedway', 'quest', 'signal', 'duel', 'ink', 'highway', 'keys', 'taiko'];

  /* an 8-bit microphone (Arcade Quest's marquee and screen): one string per pixel row, X = lit */
  const QUEST_MIC = ['..XXXXX..', '.XX.X.XX.', '.X.X.X.X.', '.XX.X.XX.', '.X.X.X.X.', '.XXXXXXX.', '..XXXXX..',
                     'X...X...X', 'X...X...X', '.X..X..X.', '..XXXXX..', '....X....', '....X....', '..XXXXX..'];
  const pixelSVG = (rows, cls) => `<svg class="${cls}" viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">` +
    rows.map((r, y) => [...r].map((ch, x) => ch === 'X' ? `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>` : '').join('')).join('') + `</svg>`;
  A.QUEST_MIC = QUEST_MIC;

  /* ---------- silhouettes ---------- */
  const SHAPES = {
    /* quest: a pixel-art cabinet (Arcade Quest): stepped 8-bit corners and edges, a pixel D-pad and A/B buttons,
       and a row of pixel "coins" along the kick plate */
    quest: {
      outline: 'M40 14H260V22H270V30H278V112H266V304H274V312H282V380H270V598H30V380H18V312H26V304H34V112H22V30H30V22H40Z',
      face: 'M50 112H250V306H50ZM40 386H260V598H40Z', kick: [40, 260],
      bezel: 'M64 124H236V132H244V284H236V292H64V284H56V132H64Z',
      panel: 'M40 312H260V320H268V372H32V320H40Z', lip: 'M32 372H268V386H32Z',
      joy: [84, 342], btns: [[196, 346, 's-btn0'], [226, 334, 's-btn1']],
      door: {x: 102, y: 462, w: 96, h: 100},
      extras: '<text class="s-ab" x="196" y="366" text-anchor="middle">B</text><text class="s-ab" x="226" y="354" text-anchor="middle">A</text>' +
              [60, 84, 216, 240].map(x => `<rect class="s-coinpix" x="${x - 6}" y="574" width="12" height="12"/><rect class="s-coinpix2" x="${x - 2}" y="577" width="4" height="6"/>`).join(''),
      slots: {marquee: [34, 20, 232, 86], screen: [66, 134, 168, 148], start: [80, 392, 140, 46]},
    },
    /* speedway: a sit-down racer. A wide hood over a big screen, a dashboard with a steering wheel and a gear stick,
       the cockpit flaring out below to the seat box, two pedals, and sunset stripes along the sides (Sustain Speedway) */
    speedway: {
      outline: 'M18 26Q18 16 28 16H272Q282 16 282 26V112H268L274 300L292 318V598H8V318L26 300L32 112H18Z',
      face: 'M52 112H248L252 304H48ZM30 330H270V598H30Z', kick: [30, 270],
      bezel: 'M62 124H238Q246 124 246 132V288Q246 296 238 296H62Q54 296 54 288V132Q54 124 62 124Z',
      panel: 'M38 304H262L286 362H14Z', lip: 'M14 362H286V378H14Z',
      wheel: [150, 336, 34], btns: [[252, 342, 's-btn0']],
      door: {x: 108, y: 452, w: 84, h: 70},
      extras: '<path class="s-shift" d="M58 350V326"/><circle class="s-knob" cx="58" cy="322" r="7"/>' +                        // the gear stick
              '<rect class="s-pedal" x="112" y="540" width="30" height="40" rx="6"/><rect class="s-pedal" x="158" y="540" width="30" height="40" rx="6"/>' +
              '<path class="s-sun1" d="M34 396H96M34 410H90M34 424H84"/><path class="s-sun2" d="M266 396H204M266 410H210M266 424H216"/>' +
              '<path class="s-flag" d="M36 100H264"/>',                                                                   // a checkered strip under the marquee
      slots: {marquee: [34, 24, 232, 76], screen: [62, 134, 176, 154], start: [80, 386, 140, 44]},
    },
    /* duel: a two-player dojo cabinet (Dojo Duel). A dojo roof with upturned eaves over the marquee, a long two-player
       panel (1P left, 2P right), a neon center line down the front and a paper lantern painted on each side */
    duel: {
      outline: 'M2 44Q26 40 40 16H260Q274 40 298 44L286 56H272V112H266L270 298L296 314V394H274V598H26V394H4V314L30 298L34 112H28V56H14Z',
      face: 'M48 112H252L256 304H44ZM40 394H260V598H40Z', kick: [40, 260],
      bezel: 'M62 124H238Q246 124 246 132V288Q246 296 238 296H62Q54 296 54 288V132Q54 124 62 124Z',
      panel: 'M34 304H266L296 370H4Z', lip: 'M4 370H296V386H4Z',
      joy: [36, 340], joy2: [166, 340],
      btns: [[76, 338, 's-btn1'], [100, 334, 's-btn1'], [124, 338, 's-btn1'], [206, 338, 's-btn0'], [230, 334, 's-btn0'], [254, 338, 's-btn0']],
      door: {x: 104, y: 462, w: 92, h: 104},
      extras: '<path class="s-dline" d="M150 394V598"/>' +
              [[74, 1], [226, 2]].map(([cx, k]) => `<path class="s-lstring" d="M${cx} 400V414"/><ellipse class="s-lantern s-l${k}" cx="${cx}" cy="440" rx="20" ry="26"/>` +
                `<path class="s-lrib" d="M${cx - 18} 432H${cx + 18}M${cx - 18} 448H${cx + 18}"/><rect class="s-lcap" x="${cx - 9}" y="412" width="18" height="4"/><rect class="s-lcap" x="${cx - 9}" y="464" width="18" height="4"/>`).join('') +
              ['belt-white', 'belt-yellow', 'belt-orange', 'belt-green', 'belt-blue', 'belt-purple', 'belt-red', 'belt-brown', 'belt-black', 'belt-diamond']
                .map((b, i) => `<rect class="s-belt" x="${56 + i * 19}" y="104" width="15" height="6" rx="1.5" style="fill:var(--${b})"/>`).join('') +
              '<text class="s-plabel s-p1" x="36" y="318" text-anchor="middle">1P</text><text class="s-plabel s-p2" x="166" y="318" text-anchor="middle">2P</text>',
      slots: {marquee: [36, 28, 228, 74], screen: [64, 134, 172, 152], start: [80, 398, 140, 44]},
    },
    /* signal: a deep-space radio console (Lost Signal). A rounded top, a round-cornered radar screen, signal-strength
       bars and a waveform painted on the lower sides, and three console buttons */
    signal: {
      outline: 'M30 42Q30 14 62 14H238Q270 14 270 42V112H262V300L284 318V380H270V598H30V380H16V318L38 300V112H30Z',
      face: 'M50 112H250V300H50ZM38 386H262V598H38Z', kick: [38, 262],
      bezel: 'M96 122H204Q246 122 246 164V254Q246 296 204 296H96Q54 296 54 254V164Q54 122 96 122Z',
      panel: 'M44 306H256L282 368H18Z', lip: 'M18 368H282V382H18Z',
      joy: [70, 338], btns: [[180, 338], [210, 342], [240, 346]],
      door: {x: 104, y: 462, w: 92, h: 96},
      extras: [0, 1, 2, 3].map(i => `<rect class="s-bar" x="${50 + i * 9}" y="${440 - i * 10}" width="6" height="${14 + i * 10}" rx="2"/>` +
                                     `<rect class="s-bar s-bar2" x="${226 + i * 9}" y="${440 - i * 10}" width="6" height="${14 + i * 10}" rx="2"/>`).join('') +
              '<path class="s-wave" d="M48 530q8-14 16 0t16 0t16 0t16 0M188 530q8-14 16 0t16 0t16 0t16 0"/>',
      slots: {marquee: [36, 22, 228, 84], screen: [62, 132, 176, 156], start: [80, 392, 140, 46]},
    },
    /* keys: the Keys to the City cabinet. A skyline of skyscrapers (piano black keys) rising behind the marquee, the
       Chopsticks and Fork neon signs painted on the sides, and a real little keyboard along the kick plate */
    keys: {
      outline: 'M28 18H70V6H86V18H120V2H136V18H170V10H186V18H272V112H262V300L284 318V380H270V598H30V380H16V318L38 300V112H28Z',
      face: 'M50 112H250V300H50ZM38 386H262V598H38Z', kick: [38, 262],
      bezel: 'M62 122H238Q246 122 246 130V288Q246 296 238 296H62Q54 296 54 288V130Q54 122 62 122Z',
      panel: 'M44 306H256L282 368H18Z', lip: 'M18 368H282V382H18Z',
      joy: [70, 338], btns: [[180, 338, 's-btn0'], [210, 342, 's-btn1'], [240, 346, 's-btn0']],
      door: {x: 104, y: 440, w: 92, h: 96},
      extras: '<rect class="s-roofwin" x="74" y="9" width="8" height="5"/><rect class="s-roofwin" x="124" y="6" width="8" height="5"/><rect class="s-roofwin" x="174" y="12" width="8" height="5"/>' +
              '<g class="s-chop"><rect x="44" y="420" width="44" height="44" rx="6"/><path d="M56 428L63 456M76 428L69 456"/></g>' +
              '<g class="s-fork"><rect x="212" y="420" width="44" height="44" rx="6"/><path d="M226 428V438M234 428V438M242 428V438M226 438Q234 450 242 438M234 444V458"/></g>' +
              '<rect class="s-wkey" x="40" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="60" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="80" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="100" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="120" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="140" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="160" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="180" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="200" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="220" y="560" width="19" height="36" rx="2"/><rect class="s-wkey" x="240" y="560" width="19" height="36" rx="2"/><rect class="s-bkey" x="53" y="560" width="12" height="22" rx="1.5"/><rect class="s-bkey" x="73" y="560" width="12" height="22" rx="1.5"/><rect class="s-bkey" x="113" y="560" width="12" height="22" rx="1.5"/><rect class="s-bkey" x="133" y="560" width="12" height="22" rx="1.5"/><rect class="s-bkey" x="153" y="560" width="12" height="22" rx="1.5"/><rect class="s-bkey" x="193" y="560" width="12" height="22" rx="1.5"/><rect class="s-bkey" x="213" y="560" width="12" height="22" rx="1.5"/>',
      slots: {marquee: [34, 22, 232, 86], screen: [62, 132, 176, 156], start: [80, 386, 140, 46]},
    },
    /* highway: the Music Highway cabinet. A flat top with a road sign-style marquee, the neon highway painted down both
       side panels (lane lines running to a horizon, two neon pads on it), a strike line across the control panel and three colored buttons */
    highway: {
      outline: 'M26 18H274V112H264V300L286 318V380H270V598H30V380H14V318L36 300V112H26Z',
      face: 'M50 112H250V300H50ZM38 386H262V598H38Z', kick: [38, 262],
      bezel: 'M62 122H238Q246 122 246 130V288Q246 296 238 296H62Q54 296 54 288V130Q54 122 62 122Z',
      panel: 'M44 306H256L282 368H18Z', lip: 'M18 368H282V382H18Z',
      joy: [70, 338], btns: [[180, 338, 's-btn0'], [210, 342, 's-btn1'], [240, 346, 's-btn0']],
      door: {x: 104, y: 470, w: 92, h: 90},
      extras: '<path class="s-road" d="M130 398H170L250 596H50Z"/><path class="s-roadedge" d="M130 398L50 596M170 398L250 596"/>' +
              '<path class="s-roadlane" d="M143 398L117 596M157 398L183 596"/><path class="s-strike" d="M26 360H274"/>' +
              '<rect class="s-card s-c1" x="116" y="424" width="20" height="10" rx="5"/><rect class="s-card s-c2" x="160" y="446" width="26" height="13" rx="6.5"/>',
      slots: {marquee: [34, 24, 232, 82], screen: [62, 132, 176, 156], start: [80, 392, 140, 46]},
    },
    /* ink: the Ink Master's cabinet (Vanishing Ink). The marquee is an unrolled scroll with wooden rods standing out at
       both ends; an ink splash with drips on the lower left side, a fading note on the right, a brush on the kick plate */
    ink: {
      outline: 'M24 16H276V30H268V112H262V300L284 318V380H270V598H30V380H16V318L38 300V112H32V30H24Z',
      face: 'M50 112H250V300H50ZM38 386H262V598H38Z', kick: [38, 262],
      bezel: 'M62 122H238Q246 122 246 130V288Q246 296 238 296H62Q54 296 54 288V130Q54 122 62 122Z',
      panel: 'M44 306H256L282 368H18Z', lip: 'M18 368H282V382H18Z',
      joy: [70, 338], btns: [[180, 338], [210, 342], [240, 346]],
      door: {x: 104, y: 462, w: 92, h: 96},
      extras: '<rect class="s-rod" x="12" y="10" width="18" height="100" rx="8"/><rect class="s-rod" x="270" y="10" width="18" height="100" rx="8"/>' +
              '<rect class="s-rodcap" x="10" y="6" width="22" height="9" rx="4"/><rect class="s-rodcap" x="10" y="105" width="22" height="9" rx="4"/>' +
              '<rect class="s-rodcap" x="268" y="6" width="22" height="9" rx="4"/><rect class="s-rodcap" x="268" y="105" width="22" height="9" rx="4"/>' +
              '<path class="s-ink" d="M58 488q10-14 22-4q12-6 14 8q12 4 4 14q6 12-8 12q-4 14-14 6q-12 8-16-6q-12-2-6-14q-8-10 4-16z"/>' +
              '<path class="s-ink" d="M64 520v26q0 5 3.5 5t3.5-5v-22zM82 514v14q0 4 3 4t3-4v-12z"/><circle class="s-ink" cx="98" cy="482" r="3"/><circle class="s-ink" cx="50" cy="514" r="2.5"/>' +
              '<g class="s-fnote"><ellipse cx="228" cy="530" rx="10" ry="7" transform="rotate(-20 228 530)"/><path d="M237 528V484"/></g>' +
              '<path class="s-brush" d="M120 582H176"/><path class="s-brushtip" d="M176 578q14 2 18 4q-4 2-18 4z"/>',
      slots: {marquee: [34, 22, 232, 84], screen: [62, 132, 176, 156], start: [80, 392, 140, 46]},
    },
    /* taiko: the Rhythm Dojo cabinet. Its top swells like the side of a taiko drum (a barrel with a row of studs), a
       pair of drumsticks crossed on the lower side panels, and a little drum on the kick plate */
    taiko: {
      outline: 'M24 36Q150 -8 276 36V112H262V300L284 318V380H270V598H30V380H16V318L38 300V112H24Z',
      face: 'M50 112H250V300H50ZM38 386H262V598H38Z', kick: [38, 262],
      bezel: 'M62 122H238Q246 122 246 130V288Q246 296 238 296H62Q54 296 54 288V130Q54 122 62 122Z',
      panel: 'M44 306H256L282 368H18Z', lip: 'M18 368H282V382H18Z',
      joy: [70, 338], btns: [[180, 338], [210, 342], [240, 346]],
      door: {x: 104, y: 430, w: 92, h: 90},
      extras: '<path class="s-barrel" d="M24 36Q150 -8 276 36V46Q150 4 24 46Z"/>' +
              [40, 70, 100, 130, 170, 200, 230, 260].map((x, i) => `<circle class="s-stud" cx="${x}" cy="${[30, 22, 16, 13, 13, 16, 22, 30][i] + 6}" r="3"/>`).join('') +
              '<path class="s-bachi" d="M52 546L112 470M112 546L52 470"/><path class="s-bachi" d="M188 546L248 470M248 546L188 470"/>' +
              '<ellipse class="s-tkbody" cx="150" cy="566" rx="46" ry="24"/><ellipse class="s-tkhead" cx="150" cy="552" rx="40" ry="9"/>' +
              '<path class="s-tkband" d="M106 566Q150 584 194 566"/>',
      slots: {marquee: [34, 40, 232, 72], screen: [62, 132, 176, 156], start: [80, 386, 140, 46]},
    },
    /* audition: the Scale Trainer cabinet. A classic body with a music-stand desk for its top (the marquee sits on a
       slanted stand desk), a music stand painted down the lower left side and the judge's score sheet (a clipboard
       with ticks) on the lower right */
    audition: {
      outline: 'M22 20H278L268 104H258V598H42V104H32Z',
      face: 'M54 104H246V598H54Z', kick: [54, 246],
      bezel: 'M66 116H234Q242 116 242 124V294Q242 302 234 302H66Q58 302 58 294V124Q58 116 66 116Z',
      panel: 'M50 310H250L280 372H20Z', lip: 'M20 372H280V386H20Z',
      joy: [74, 342], btns: [[178, 338], [208, 338], [238, 338]],
      door: {x: 108, y: 452, w: 84, h: 84},
      extras: '<path class="s-stand" d="M26 18H274"/>' +
              '<path class="s-standpole" d="M86 470V570M86 570L66 590M86 570L106 590"/><path class="s-standdesk" d="M60 440H112L108 470H64Z"/>' +
              '<rect class="s-sheet" x="66" y="422" width="40" height="24" rx="2"/>' +
              '<rect class="s-clip" x="198" y="456" width="36" height="46" rx="3"/><rect class="s-clipbar" x="208" y="452" width="16" height="7" rx="2"/>' +
              '<path class="s-tick" d="M204 472l4 4 8-8M204 486l4 4 8-8"/><path class="s-line" d="M220 474H230M220 488H230"/>',
      slots: {marquee: [36, 26, 228, 72], screen: [70, 128, 160, 162], start: [78, 398, 144, 48]},
    },
    /* showtime: the old cabinet from the back room. A crooked top, a cracked side panel, a dangling wire, tape on the
       control panel and one button missing (Showtime Malfunction) */
    showtime: {
      outline: 'M30 30L270 14V112H258V598H42V112H30Z',
      face: 'M54 112H246V598H54Z', kick: [54, 246],
      bezel: 'M66 122H234Q242 122 242 130V294Q242 302 234 302H66Q58 302 58 294V130Q58 122 66 122Z',
      panel: 'M50 310H250L280 372H20Z', lip: 'M20 372H280V386H20Z',
      joy: [74, 342], btns: [[178, 338], [208, 338]],
      door: {x: 100, y: 464, w: 100, h: 110},
      extras: '<circle class="s-hole" cx="238" cy="338" r="8"/>' +                                      // the missing button
              '<path class="s-tape" d="M112 322l46 20M114 342l42-22"/>' +                               // tape across the panel
              '<path class="s-crack" d="M250 410l-9 18 7 10-10 20 5 12M241 428l-8 4"/>' +               // a cracked side panel
              '<path class="s-wire" d="M262 112q12 34-4 60q-6 12 4 22"/><circle class="s-lamp" cx="262" cy="194" r="3"/>',   // a loose wire
      slots: {marquee: [40, 34, 220, 68], screen: [70, 134, 160, 156], start: [78, 398, 144, 48]},
    },
    /* the default: flat top with an overhanging marquee, straight sides */
    classic: {
      outline: 'M30 22H270V112H258V598H42V112H30Z',
      face: 'M54 112H246V598H54Z', kick: [54, 246],
      bezel: 'M66 122H234Q242 122 242 130V294Q242 302 234 302H66Q58 302 58 294V130Q58 122 66 122Z',
      panel: 'M50 310H250L280 372H20Z', lip: 'M20 372H280V386H20Z',
      joy: [74, 342], btns: [[178, 338], [208, 338], [238, 338]],
      door: {x: 100, y: 464, w: 100, h: 110},
      slots: {marquee: [40, 32, 220, 70], screen: [70, 134, 160, 156], start: [78, 398, 144, 48]},
    },
    /* haunted house: peaked roof, bulging side panels, tombstone screen, steep panel, arched door */
    haunted: {
      outline: 'M150 4L168 24Q238 30 274 92L263 101Q286 198 265 302L267 598H33L35 302Q14 198 37 101L26 92Q62 30 132 24Z',
      face: 'M150 32Q220 38 250 98Q268 198 250 302V598H50V302Q32 198 50 98Q80 38 150 32Z', kick: [50, 250],
      bezel: 'M62 300V178Q62 112 150 112Q238 112 238 178V300Z',
      panel: 'M52 308H248L286 392H14Z', lip: 'M14 392H286V404H14Z',
      joy: [70, 356], btns: [[178, 348], [210, 356], [242, 364]],
      doorPath: 'M104 578V504Q104 472 150 472Q196 472 196 504V578Z', door: {x: 104, y: 472, w: 92, h: 106},
      extras: '<circle class="s-lamp" cx="150" cy="6" r="4"/>' +
              '<path class="s-decal" d="M60 250q-8-10 0-20M240 250q8-10 0-20"/>',
      slots: {marquee: [60, 46, 180, 56], screen: [74, 126, 152, 162], start: [78, 414, 144, 48]},
    },
    /* a smaller "sound check" machine: domed top like an old amp, short and narrow, flat panel */
    soundcheck: {
      outline: 'M46 192Q46 94 150 94Q254 94 254 192V598H46Z',
      face: 'M60 192Q60 108 150 108Q240 108 240 192V598H60Z', kick: [60, 240],
      bezel: 'M74 200H226Q234 200 234 208V326Q234 334 226 334H74Q66 334 66 326V208Q66 200 74 200Z',
      panel: 'M60 344H240L262 382H38Z', lip: 'M38 382H262V394H38Z',
      joy: [86, 364], btns: [[184, 362], [208, 362], [232, 362]],
      door: {x: 110, y: 470, w: 80, h: 100},
      extras: [0, 1, 2, 3, 4].map(i => `<circle class="s-lamp${i % 2 ? ' s-lamp2' : ''}" cx="${102 + i * 24}" cy="104" r="3"/>`).join('') +
              [0, 1, 2, 3, 4, 5].map(i => `<line class="s-grille" x1="72" y1="${478 + i * 16}" x2="98" y2="${478 + i * 16}"/><line class="s-grille" x1="202" y1="${478 + i * 16}" x2="228" y2="${478 + i * 16}"/>`).join(''),
      slots: {marquee: [72, 118, 156, 68], screen: [76, 210, 148, 114], start: [86, 404, 128, 48]},
    },
    /* storm: slanted top, lightning-bolt notches in the side panels, octagon screen, wide flat wings */
    storm: {
      outline: 'M26 12L274 44V128L262 140L276 212L264 222L274 300V598H26V300L36 222L24 212L38 140L26 128Z',
      face: 'M44 36L256 62V598H44Z', kick: [44, 256],
      bezel: 'M72 142H228L246 160V292L228 310H72L54 292V160Z',
      panel: 'M44 318H256L294 374H6Z', lip: 'M6 374H294V386H6Z',
      joy: [64, 346], btns: [[180, 344], [210, 344], [240, 344]],
      door: {x: 100, y: 462, w: 100, h: 110},
      extras: '<path class="s-decal s-bolt" d="M60 420l-10 22h10l-6 22 18-28h-10l8-16z"/><path class="s-decal s-bolt" d="M240 420l10 22h-10l6 22-18-28h10l-8-16z"/>',
      slots: {marquee: [46, 57, 208, 60], screen: [66, 154, 168, 144], start: [78, 398, 144, 48]},
    },
    /* dojo: a pagoda roof with upturned eaves and hanging lanterns, a square paper-screen frame */
    dojo: {
      outline: 'M14 76Q42 72 62 52L112 22H188L238 52Q258 72 286 76L270 88H256V598H44V88H30Z',
      face: 'M56 88H244V598H56Z', kick: [56, 244],
      bezel: 'M66 164H234V322H66Z',
      panel: 'M52 330H248L278 386H22Z', lip: 'M22 386H278V398H22Z',
      joy: [72, 358], btns: [[180, 356], [208, 356], [236, 356]],
      door: {x: 104, y: 470, w: 92, h: 106},
      extras: '<path class="s-decal" d="M112 22L150 8L188 22M70 58H230M34 80V96M266 80V96"/>' +          // ridge, roof beam, lantern cords
              '<rect class="s-lamp" x="27" y="96" width="14" height="18" rx="5"/><rect class="s-lamp" x="259" y="96" width="14" height="18" rx="5"/>' +
              '<path class="s-grille" d="M66 243H234M150 164V322"/>',                                       // paper-screen lattice
      slots: {marquee: [60, 92, 180, 64], screen: [74, 172, 152, 142], start: [80, 408, 140, 48]},
    },
    /* vault: the top is a round vault door ringed with bolts, a round safe door with a combination dial below,
       laser beams across the body (green and red, from the trims) */
    vault: {
      outline: 'M40 598V332L22 320V204A128 128 0 0 1 278 204V320L260 332V598Z',
      face: 'M56 598V332L40 320V208A110 110 0 0 1 260 208V320L244 332V598Z', kick: [56, 244],
      bezel: 'M74 178H226Q238 178 238 190V304Q238 316 226 316H74Q62 316 62 304V190Q62 178 74 178Z',
      panel: 'M50 326H250L280 384H20Z', lip: 'M20 384H280V396H20Z',
      joy: [72, 354], btns: [[180, 352], [208, 352], [236, 352]],
      doorPath: 'M96 512A54 54 0 1 0 204 512A54 54 0 1 0 96 512Z', door: {x: 96, y: 458, w: 108, h: 108}, dial: true,
      extras: [20, 43, 66, 90, 114, 137, 160].map(a => `<circle class="s-rivet" cx="${(150 + 119 * Math.cos(a * Math.PI / 180)).toFixed(1)}" cy="${(206 - 119 * Math.sin(a * Math.PI / 180)).toFixed(1)}" r="4"/>`).join('') +
              '<path class="s-laser" d="M58 452H242"/><path class="s-laser s-laser2" d="M58 578H242"/>' +
              '<circle class="s-lamp" cx="58" cy="452" r="4"/><circle class="s-lamp2" cx="242" cy="578" r="4"/>',
      slots: {marquee: [66, 116, 168, 52], screen: [72, 188, 156, 118], start: [80, 402, 140, 44]},
    },
    /* versus: a wide two-player fighting cabinet. The body flares out to a long control panel with a joystick and
       three buttons for each player (1P in trim2, 2P in trim), a split red/blue face with a lightning seam below */
    versus: {
      outline: 'M22 20H278V112H266L270 298L296 314V394H274V598H26V394H4V314L30 298L34 112H22Z',
      face: 'M48 112H252L256 304H44ZM40 394H260V598H40Z', kick: [40, 260],
      bezel: 'M62 124H238Q246 124 246 132V288Q246 296 238 296H62Q54 296 54 288V132Q54 124 62 124Z',
      panel: 'M34 304H266L296 370H4Z', lip: 'M4 370H296V386H4Z',
      joy: [36, 340], joy2: [166, 340],
      btns: [[76, 338, 's-btn1'], [100, 334, 's-btn1'], [124, 338, 's-btn1'], [206, 338, 's-btn0'], [230, 334, 's-btn0'], [254, 338, 's-btn0']],
      door: {x: 104, y: 462, w: 92, h: 104},
      extras: '<path class="s-side1" d="M40 394H150L140 452L158 500L144 598H40Z"/><path class="s-side2" d="M150 394H260V598H144L158 500L140 452Z"/>' +
              '<path class="s-seam" d="M150 394L140 452L158 500L144 598"/>' +
              '<text class="s-plabel s-p1" x="36" y="318" text-anchor="middle">1P</text><text class="s-plabel s-p2" x="166" y="318" text-anchor="middle">2P</text>',
      slots: {marquee: [30, 28, 240, 76], screen: [64, 134, 172, 152], start: [80, 398, 140, 44]},
    },
    /* rink: an upright with a rounded, rink-shaped top edged in two neons (trim and trim2), a wide landscape screen
       for the table, a puck-shaped light on top and a goal-slot stripe on the coin door */
    rink: {
      outline: 'M34 70Q34 28 76 28H224Q266 28 266 70V112H256L262 304L286 322V392H268V598H32V392H14V322L38 304L44 112H34Z',
      face: 'M58 112H242L246 310H54ZM48 392H252V598H48Z', kick: [48, 252],
      bezel: 'M64 128H236Q244 128 244 136V288Q244 296 236 296H64Q56 296 56 288V136Q56 128 64 128Z',
      panel: 'M40 310H260L286 372H14Z', lip: 'M14 372H286V388H14Z',
      joy: [48, 344], joy2: [252, 344],
      btns: [[92, 340, 's-btn1'], [118, 336, 's-btn1'], [182, 336, 's-btn0'], [208, 340, 's-btn0']],
      door: {x: 104, y: 464, w: 92, h: 104},
      extras: '<ellipse class="s-lamp" cx="150" cy="18" rx="26" ry="8"/><ellipse class="s-lamp2" cx="150" cy="14" rx="18" ry="4"/>' +
              '<path class="s-goal1" d="M60 440H100"/><path class="s-goal2" d="M200 440H240"/>',
      slots: {marquee: [44, 38, 212, 70], screen: [62, 134, 176, 156], start: [80, 400, 140, 44]},
    },
    /* temple: a temple gate. An upswept top beam and a tie beam over two pillars, paper lanterns in the
       Band Ninja belt colors hanging between the beams, the marquee a hand scroll hung from the tie beam */
    temple: {
      outline: 'M4 38Q22 50 44 50H256Q278 50 296 38L288 66H262V96H286V112H262V598H38V112H14V96H38V66H12Z',
      face: 'M54 66H246V598H54Z', kick: [54, 246],
      bezel: 'M66 196H234V336H66Z',
      panel: 'M50 346H250L280 398H20Z', lip: 'M20 398H280V410H20Z',
      joy: [72, 374], btns: [[180, 372], [208, 372], [236, 372]],
      door: {x: 104, y: 478, w: 92, h: 100},
      extras: ['orange', 'green', 'blue', 'purple', 'red', 'brown', 'black', 'diamond'].map((b, i) => {
                const x = 69 + i * 23;
                return `<line class="s-grille" x1="${x}" y1="66" x2="${x}" y2="70"/><circle cx="${x}" cy="80" r="11" style="fill:var(--belt-${b})" opacity=".25"/>` +
                  `<rect class="s-lantern" x="${x - 6}" y="70" width="12" height="17" rx="5" style="fill:var(--belt-${b})"/>`;
              }).join('') +
              '<path class="s-grille" d="M96 112V122M204 112V122"/>',                                   // cords the scroll hangs from
      slots: {marquee: [60, 120, 180, 62], screen: [74, 204, 152, 124], start: [80, 420, 140, 46]},
    },
  };

  function doorSVG(s) {
    const d = s.door, cx = d.x + d.w / 2;
    const body = s.doorPath ? `<path class="s-door" d="${s.doorPath}"/>` : `<rect class="s-door" x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="5"/>`;
    const sy = d.y + d.h * .34;
    if (s.dial) {                                     // a safe door: combination dial with ticks, a spoked handle
      const cy = d.y + d.h / 2, r = d.w / 2;
      return body + `<circle class="s-door" cx="${cx}" cy="${cy}" r="${r - 10}"/>` +
        Array.from({length: 12}, (_, k) => `<line class="s-tick" x1="${cx}" y1="${cy - r + 12}" x2="${cx}" y2="${cy - r + 18}" transform="rotate(${k * 30} ${cx} ${cy})"/>`).join('') +
        `<circle class="s-dial" cx="${cx}" cy="${cy}" r="${r * .42}"/><path class="s-spoke" d="M${cx} ${cy - r * .62}V${cy + r * .62}M${cx - r * .62} ${cy}H${cx + r * .62}"/>` +
        `<circle class="s-ball" cx="${cx}" cy="${cy}" r="${r * .14}"/>`;
    }
    return body +
      `<rect class="s-coin" x="${cx - 30}" y="${sy}" width="22" height="26" rx="3"/><rect class="s-coin" x="${cx + 8}" y="${sy}" width="22" height="26" rx="3"/>` +
      `<line class="s-slit" x1="${cx - 19}" y1="${sy + 6}" x2="${cx - 19}" y2="${sy + 20}"/><line class="s-slit" x1="${cx + 19}" y1="${sy + 6}" x2="${cx + 19}" y2="${sy + 20}"/>` +
      `<rect class="s-return" x="${cx - 16}" y="${d.y + d.h * .74}" width="32" height="12" rx="2"/>`;
  }

  const joystick = ([jx, jy], cls = '') => `<ellipse class="s-joybase" cx="${jx}" cy="${jy + 6}" rx="18" ry="7"/><line class="s-shaft" x1="${jx}" y1="${jy + 5}" x2="${jx}" y2="${jy - 12}"/>` +
    `<circle class="s-ball${cls}" cx="${jx}" cy="${jy - 15}" r="9"/><circle class="s-shine" cx="${jx - 3}" cy="${jy - 18}" r="3"/>`;
  /* a steering wheel seen from the driver's seat: rim, three spokes, a hub in the trim color */
  const wheelSVG = ([x, y, r]) => `<circle class="s-wheel" cx="${x}" cy="${y}" r="${r}"/>` +
    `<path class="s-spokes" d="M${x - r} ${y}H${x + r}M${x} ${y}V${y + r}"/><circle class="s-hub" cx="${x}" cy="${y}" r="${r * .3}"/>` +
    `<path class="s-grip" d="M${x - r * .7} ${y - r * .72}A${r} ${r} 0 0 1 ${x + r * .7} ${y - r * .72}"/>`;
  function shellSVG(s) {
    return `<svg class="cab-shell" viewBox="0 0 300 600" aria-hidden="true" focusable="false">` +
      `<path class="s-side" d="${s.outline}"/>` +
      `<path class="s-face" d="${s.face}"/>` +
      `<path class="s-tube-glow" d="${s.outline}"/><path class="s-tube" d="${s.outline}"/>` +
      `<path class="s-bezel" d="${s.bezel}"/>` +
      `<path class="s-panel" d="${s.panel}"/><path class="s-lip" d="${s.lip}"/>` +
      (s.wheel ? wheelSVG(s.wheel) : joystick(s.joy)) + (s.joy2 ? joystick(s.joy2, ' s-ball2') : '') +
      s.btns.map(([x, y, c], i) => `<ellipse class="s-btn ${c || 's-btn' + i}" cx="${x}" cy="${y}" rx="${s.joy2 ? 9 : 10}" ry="${s.joy2 ? 6.5 : 7}"/><ellipse class="s-shine" cx="${x - 2}" cy="${y - 2}" rx="4" ry="2"/>`).join('') +
      doorSVG(s) +
      `<rect class="s-kick" x="${s.kick[0]}" y="586" width="${s.kick[1] - s.kick[0]}" height="12"/>` +
      (s.extras || '') + `</svg>`;
  }

  /* ---------- attract-mode screens ---------- */
  const TREBLE = ['C5', 'E4', 'A4', 'D5', 'G4', 'B4', 'F4'];
  const noteOf = s => A.music.parseNote(s);
  const SCREENS = {
    /* Ghost Notes: a note on the staff; the ghost holding its name fades away */
    ghost: {
      period: 2600,
      html(g, i) {
        const n = noteOf(TREBLE[i % TREBLE.length]);
        return `<div class="scr scr-ghost">` +
          `<div class="att-ghost">${A.ghostSVG(A.music.noteLabel(n), '')}</div>` +
          `<div class="att-staff">${A.staffSVG('treble', [{n, x: 250}], {fit: TREBLE.map(noteOf), label: 'A note on the staff'})}</div></div>`;
      },
    },
    /* Note Checker: a tuning meter; the needle wobbles, settles in the middle and lights up */
    tuner: {
      period: 3000,
      html(g, i) {
        const name = ['B♭', 'C', 'D', 'E♭', 'F', 'G', 'A'][i % 7];
        return `<div class="scr scr-tuner">` +
          `<div class="att-note">${name}</div>` +
          `<svg class="att-meter" viewBox="0 0 160 70" aria-hidden="true">` +
          `<path class="m-arc" d="M14 64A68 68 0 0 1 146 64"/><path class="m-zone" d="M68 0.8A68 68 0 0 1 92 0.8"/>` +
          [-60, -30, 0, 30, 60].map(a => `<line class="m-tick" x1="80" y1="-2" x2="80" y2="8" transform="rotate(${a} 80 64)"/>`).join('') +
          `<g class="att-needle"><line class="m-needle" x1="80" y1="64" x2="80" y2="10"/></g><circle class="m-hub" cx="80" cy="64" r="5"/></svg>` +
          `<div class="att-verdict">IN TUNE</div></div>`;
      },
    },
    /* Note Storm: notes march left toward Tempo the robot and get zapped */
    storm: {
      html() {
        const lines = [0, 1, 2, 3, 4].map(k => `<line x1="0" y1="${34 + k * 12}" x2="200" y2="${34 + k * 12}"/>`).join('');
        const note = (y, d) => `<g class="att-march" style="animation-delay:${d}s"><g transform="translate(0 ${y})"><ellipse cx="0" cy="0" rx="7" ry="5" transform="rotate(-20)"/><line x1="6.3" y1="-1" x2="6.3" y2="-36"/></g></g>`;
        return `<div class="scr scr-storm"><svg viewBox="0 0 200 120" aria-hidden="true">` +
          `<g class="att-lines">${lines}</g>` +
          `<g class="att-robot"><rect x="10" y="44" width="30" height="28" rx="6"/><rect class="eye" x="16" y="52" width="6" height="6" rx="1"/><rect class="eye" x="28" y="52" width="6" height="6" rx="1"/><line x1="25" y1="44" x2="25" y2="36"/><circle cx="25" cy="34" r="3"/></g>` +
          `<path class="att-zap" d="M44 58L64 52L58 60L80 56"/>` +
          note(64, 0) + note(52, -1) + note(76, -2) + `</svg></div>`;
      },
    },
    /* Note Ninja: a note on a scroll, its letter lights up on the row of buttons, then a slash */
    ninja: {
      period: 2400,
      html(g, i) {
        const n = noteOf(TREBLE[i % TREBLE.length]), L = 'ABCDEFG', y = 20 + (A.noteY('treble', n) - 56) / 16 * 10;
        const lines = [0, 1, 2, 3, 4].map(k => `<line x1="8" y1="${20 + k * 10}" x2="152" y2="${20 + k * 10}"/>`).join('');
        const up = A.noteY('treble', n) > 88;
        return `<div class="scr scr-ninja"><svg viewBox="0 0 160 120" aria-hidden="true">` +
          `<g class="nj-lines">${lines}</g>` +
          `<g class="nj-note"><ellipse cx="96" cy="${y}" rx="6" ry="4.4" transform="rotate(-20 96 ${y})"/><line x1="${up ? 101.5 : 90.5}" y1="${y}" x2="${up ? 101.5 : 90.5}" y2="${up ? y - 32 : y + 32}"/></g>` +
          `<path class="nj-slash" d="M78 ${y + 10}L116 ${y - 10}"/>` +
          [...L].map((l, k) => `<g class="nj-key${l === n.letter ? ' on' : ''}"><rect x="${5 + k * 22}" y="92" width="18" height="20" rx="4"/><text x="${14 + k * 22}" y="107" text-anchor="middle">${l}</text></g>`).join('') +
          `</svg></div>`;
      },
    },
    /* Chime Heist: a note on the security terminal, the matching bar lights on a little bell kit,
       and the next light of the vault code turns green */
    heist: {
      period: 2200,
      html(g, i) {
        const NOTES = ['G4', 'C5', 'E4', 'A4', 'F4', 'D5', 'B4'], n = noteOf(NOTES[i % NOTES.length]), y = 18 + (A.noteY('treble', n) - 56) / 16 * 8;
        const L = 'EFGABCD', idx = L.indexOf(n.letter);
        const lines = [0, 1, 2, 3, 4].map(k => `<line x1="30" y1="${18 + k * 8}" x2="130" y2="${18 + k * 8}"/>`).join('');
        const up = A.noteY('treble', n) > 88;
        return `<div class="scr scr-heist"><svg viewBox="0 0 160 120" aria-hidden="true">` +
          `<rect class="hs-term" x="22" y="6" width="116" height="56" rx="4"/><g class="hs-lines">${lines}</g>` +
          `<g class="hs-note"><ellipse cx="86" cy="${y}" rx="5" ry="3.6" transform="rotate(-20 86 ${y})"/><line x1="${up ? 90.6 : 81.4}" y1="${y}" x2="${up ? 90.6 : 81.4}" y2="${up ? y - 26 : y + 26}"/></g>` +
          [0, 1, 2, 3, 4, 5].map(k => `<circle class="hs-led${k < i % 6 ? ' on' : k === i % 6 ? ' next' : ''}" cx="${55 + k * 10}" cy="70" r="3"/>`).join('') +
          [...L].map((l, k) => `<rect class="hs-bar${k === idx ? ' on' : ''}" x="${8 + k * 21}" y="${80 + k * 1.4}" width="18" height="${34 - k * 2.8}" rx="2"/>`).join('') +
          `</svg></div>`;
      },
    },
    /* Ancient Ninja Scrolls: a scroll unrolls to show a music term and its meaning, under a row of belt lanterns */
    scrolls: {
      period: 2600,
      html(g, i) {
        const T = [['Forte', 'Loud'], ['Allegro', 'Fast'], ['Legato', 'Smooth, connected'], ['Presto', 'Very fast'], ['Tempo', 'Speed of the beat'], ['Subito', 'Suddenly']];
        const [t, m] = T[i % T.length];
        return `<div class="scr scr-scrolls"><span class="ss-lamps" aria-hidden="true">` +
          ['orange', 'green', 'blue', 'purple', 'red', 'brown', 'black', 'diamond'].map(b => `<i style="background:var(--belt-${b})"></i>`).join('') + `</span>` +
          `<span class="ss-scroll"><b>${esc(t)}</b><small>${esc(m)}</small></span></div>`;
      },
    },
    /* Button Masher: two fighters face off under health bars; a combo of input icons builds up, then an energy
       blast flies and the rival's bar drops */
    versus: {
      period: 2400,
      html(g, i) {
        const COMBOS = [['1', '3'], ['1', '2', '3'], ['2'], ['1', '2'], ['0'], ['2', '3']], c = COMBOS[i % COMBOS.length];
        const hp = 60 - (i % 5) * 12;
        return `<div class="scr scr-versus"><svg viewBox="0 0 160 120" aria-hidden="true">` +
          `<rect class="vs-bar" x="8" y="8" width="60" height="7" rx="2"/><rect class="vs-hp1" x="8" y="8" width="60" height="7" rx="2"/>` +
          `<rect class="vs-bar" x="92" y="8" width="60" height="7" rx="2"/><rect class="vs-hp2" x="${152 - hp}" y="8" width="${hp}" height="7" rx="2"/>` +
          `<text class="vs-vs" x="80" y="17" text-anchor="middle">VS</text><line class="vs-floor" x1="0" y1="92" x2="160" y2="92"/>` +
          `<g class="vs-p1"><circle cx="30" cy="48" r="9"/><path d="M22 58H38L40 80H20Z"/><path class="vs-limb" d="M36 64L50 60M24 80L22 92M36 80L38 92"/></g>` +
          `<g class="vs-p2"><circle cx="130" cy="46" r="10"/><path d="M121 58H139L142 82H118Z"/><path class="vs-limb" d="M122 64L110 58M122 82L120 92M138 82L140 92"/></g>` +
          `<circle class="vs-blast" cx="56" cy="60" r="6"/>` +
          c.map((b, k) => `<g class="vs-key" style="animation-delay:${k * .25}s"><circle cx="${62 + k * 18}" cy="106" r="7"/><text x="${62 + k * 18}" y="109.5" text-anchor="middle">${b}</text></g>`).join('') +
          `</svg></div>`;
      },
    },
    /* Neon Face-Off: a tiny air hockey table seen from above; the puck slides between a cyan and a magenta mallet */
    hockey: {
      html() {
        return `<div class="scr scr-hockey"><svg viewBox="0 0 160 110" aria-hidden="true">` +
          `<rect class="hk-table" x="8" y="10" width="144" height="90" rx="14"/><path class="hk-rail1" d="M80 10H22Q8 10 8 24V86Q8 100 22 100H80"/><path class="hk-rail2" d="M80 10H138Q152 10 152 24V86Q152 100 138 100H80"/>` +
          `<line class="hk-line" x1="80" y1="10" x2="80" y2="100"/><circle class="hk-line" cx="80" cy="55" r="14"/>` +
          `<line class="hk-goal1" x1="9" y1="40" x2="9" y2="70"/><line class="hk-goal2" x1="151" y1="40" x2="151" y2="70"/>` +
          `<circle class="hk-m1" cx="22" cy="55" r="8"/><circle class="hk-m2" cx="138" cy="55" r="8"/>` +
          `<g class="hk-puck"><circle cx="0" cy="0" r="5"/></g></svg></div>`;
      },
    },
    /* Showtime Malfunction: static fills the screen and a pair of red eyes glows through it, blinking now and then */
    showtime: {
      html() {
        return `<div class="scr scr-showtime"><span class="st-static"></span><span class="st-eyes"><i></i><i></i></span><span class="st-label">SHOWTIME?</span></div>`;
      },
    },
    /* Sustain Speedway: a synthwave road to a striped sun; the lane lines rush toward you and a car holds the middle */
    speedway: {
      html() {
        return `<div class="scr scr-speedway"><svg viewBox="0 0 160 110" aria-hidden="true">` +
          `<rect class="sw-sky" x="0" y="0" width="160" height="52"/><circle class="sw-sun" cx="80" cy="50" r="24"/>` +
          `<path class="sw-cut" d="M50 40H110M50 45H110M52 49H108"/><rect class="sw-ground" x="0" y="52" width="160" height="58"/>` +
          `<path class="sw-grid" d="M0 62H160M0 74H160M0 92H160M80 52L-40 110M80 52L20 110M80 52L140 110M80 52L200 110"/>` +
          `<path class="sw-road" d="M74 52H86L130 110H30Z"/><path class="sw-edge" d="M74 52L30 110M86 52L130 110"/>` +
          `<path class="sw-dash" d="M80 54V110"/>` +
          `<g class="sw-car"><rect x="66" y="92" width="28" height="10" rx="2"/><rect class="sw-glass" x="71" y="87" width="18" height="6" rx="2"/>` +
          `<rect class="sw-tail" x="67" y="95" width="6" height="2.5"/><rect class="sw-tail" x="87" y="95" width="6" height="2.5"/></g>` +
          `<text class="sw-cap" x="80" y="20" text-anchor="middle">HOLD THE NOTE</text></svg></div>`;
      },
    },
    /* Dojo Duel: two little ninjas face each other across a glowing center line, a note between them; they take
       turns hopping (a point!) while the score ticks up */
    duel: {
      html() {
        return `<div class="scr scr-duel"><svg viewBox="0 0 160 110" aria-hidden="true">` +
          `<rect class="dd-floor" x="0" y="80" width="160" height="30"/><path class="dd-line" d="M80 20V110"/>` +
          `<rect class="dd-card" x="58" y="18" width="44" height="30" rx="3"/>` + [24, 30, 36, 42].map(y => `<path class="dd-staff" d="M62 ${y}H98"/>`).join('') +
          `<ellipse class="dd-note" cx="82" cy="33" rx="4" ry="3" transform="rotate(-20 82 33)"/><path class="dd-stem" d="M85.6 32V20"/>` +
          `<g class="dd-n1"><circle cx="34" cy="60" r="9"/><rect class="dd-band1" x="25" y="56" width="18" height="3.5"/><path d="M26 70H42L44 90H24Z"/></g>` +
          `<g class="dd-n2"><circle cx="126" cy="60" r="9"/><rect class="dd-band2" x="117" y="56" width="18" height="3.5"/><path d="M118 70H134L136 90H116Z"/></g>` +
          `<text class="dd-sc dd-s1" x="34" y="18" text-anchor="middle">3</text><text class="dd-sc dd-s2" x="126" y="18" text-anchor="middle">2</text>` +
          `<text class="dd-cap" x="80" y="104" text-anchor="middle">FIRST TO TAP!</text></svg></div>`;
      },
    },
    /* Lost Signal: a radar screen, the sweep turning, blips fading in and out, "INCOMING…" */
    signal: {
      html() {
        return `<div class="scr scr-signal"><svg viewBox="0 0 160 110" aria-hidden="true">` +
          `<circle class="sg-ring" cx="80" cy="52" r="14"/><circle class="sg-ring" cx="80" cy="52" r="28"/><circle class="sg-ring" cx="80" cy="52" r="42"/>` +
          `<path class="sg-ring" d="M38 52H122M80 10V94"/>` +
          `<g class="sg-sweep"><path d="M80 52L80 10A42 42 0 0 1 110 22Z"/><line x1="80" y1="52" x2="80" y2="10"/></g>` +
          `<circle class="sg-blip b1" cx="104" cy="34" r="3"/><circle class="sg-blip b2" cx="62" cy="74" r="3"/><circle class="sg-blip b3" cx="96" cy="78" r="3"/>` +
          `<text class="sg-cap" x="80" y="106" text-anchor="middle">INCOMING…</text></svg></div>`;
      },
    },
    /* Keys to the City: a little skyline keyboard; a key's windows switch on, then its name appears ("FIND THE KEY!") */
    keys: {
      html() {
        const wk = [0, 1, 2, 3, 4, 5, 6].map(i => `<rect class="kc-w${i === 3 ? ' kc-t' : ''}" x="${24 + i * 16}" y="54" width="15" height="36" rx="2"/>`).join('');
        const bk = [0, 1, 3, 4, 5].map(i => `<rect class="kc-b${i === 4 ? ' kc-lit' : ''}" x="${24 + i * 16 + 10}" y="36" width="11" height="36" rx="1.5"/>`).join('');
        return `<div class="scr scr-keys"><svg viewBox="0 0 160 110" aria-hidden="true">` +
          `<path class="kc-chop" d="M42 12L46 28M54 12L50 28"/><path class="kc-fork" d="M98 12V18M104 12V18M110 12V18M98 18Q104 24 110 18M104 22V30"/>` +
          wk + bk + `<text class="kc-cap" x="80" y="104" text-anchor="middle">FIND THE KEY!</text></svg></div>`;
      },
    },
    /* Music Highway: the game itself at cabinet size, on a canvas (shared/highway-draw.js, the SAME drawing as the game
       and the 3D cabinet: the first phrase of Hot Cross Buns, looping). A canvas screen has `draw(ctx, W, H, t)`
       (t = null: the still frame); hydrateScreens() draws the still frames, setAttract() animates the front one. */
    highway: {
      html() { return `<div class="scr scr-highway scr-cv"><canvas aria-hidden="true"></canvas></div>`; },
      draw(x, W, H, t) {
        if (A.HighwayDraw) return A.HighwayDraw.attract(x, W, H, t);
        x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--mh-sky'); x.fillRect(0, 0, W, H);
      },
    },
    /* Vanishing Ink: three notes brush onto a little scroll one by one, stay, then the ink fades away (slow, never a
       flash) and "PLAY IT BACK!" */
    ink: {
      html() {
        return `<div class="scr scr-ink"><svg viewBox="0 0 160 110" aria-hidden="true">` +
          `<rect class="vk-paper" x="20" y="16" width="120" height="62"/><rect class="vk-rod" x="13" y="12" width="8" height="70" rx="4"/><rect class="vk-rod" x="139" y="12" width="8" height="70" rx="4"/>` +
          [32, 39, 46, 53, 60].map(y => `<path class="vk-staff" d="M26 ${y}H134"/>`).join('') +
          [[56, 56.5], [84, 49.5], [112, 42.5]].map(([x, y], i) => `<g class="vk-n vk-n${i + 1}"><ellipse cx="${x}" cy="${y}" rx="4.4" ry="3.3" transform="rotate(-20 ${x} ${y})"/><path d="M${x + 3.9} ${y - 1}V${y - 20}"/></g>`).join('') +
          `<text class="vk-cap" x="80" y="100" text-anchor="middle">READ IT… PLAY IT BACK!</text></svg></div>`;
      },
    },
    /* Rhythm Dojo (the bamboo dojo: jade + gold): a rhythm on a one-line staff with its counting; a playhead sweeps it,
       each syllable lights as it sounds (deep jade), and a little wooden taiko's gold rim pulses on the beat (smooth,
       1.3 beats a second), between two jade bamboo stalks. A canvas screen (2D and 3D). */
    taiko: {
      html() { return `<div class="scr scr-taiko scr-cv"><canvas aria-hidden="true"></canvas></div>`; },
      draw(x, W, H, t) {
        const TK = this._tk || (this._tk = {}), css = n => TK[n] || (TK[n] = getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim());
        const beat = .75, loop = 4 * beat + 1.5, tt = t == null ? 1.7 : t % loop, b = tt / beat;
        x.fillStyle = css('rd-night'); x.fillRect(0, 0, W, H);
        // two bamboo stalks in jade neon at the sides (the bamboo dojo)
        x.globalAlpha = .45; x.strokeStyle = css('rd-jade'); x.lineWidth = Math.max(1.5, W * .018);
        [W * .025, W * .975].forEach(bx => { x.beginPath(); x.moveTo(bx, 0); x.lineTo(bx, H); x.stroke();
          for (let j = 1; j < 4; j++) { x.beginPath(); x.moveTo(bx - W * .02, H * j / 4); x.lineTo(bx + W * .02, H * j / 4); x.stroke(); } });
        x.globalAlpha = 1;
        // the paper card with the staff
        const cx0 = W * .06, cy0 = H * .1, cw = W * .88, ch = H * .56;
        x.fillStyle = css('screen'); x.fillRect(cx0, cy0, cw, ch);
        const ly = cy0 + ch * .42, ink = css('ink'), lit = css('rd-lit');
        x.strokeStyle = ink; x.lineWidth = Math.max(1, H * .012);
        x.beginPath(); x.moveTo(cx0 + cw * .04, ly); x.lineTo(cx0 + cw * .96, ly); x.stroke();
        // q | e e | q | q  (1, 2 &, 3, 4)
        const notes = [[0, '1'], [1, '2'], [1.5, '&'], [2, '3'], [3, '4']];
        const ON = [0, 1, 1.5, 2, 3, 4], XS = [.13, .33, .5, .67, .85, .95], r = H * .035;
        const X = p => { let k = 0; while (k < 4 && p >= ON[k + 1]) k++; return cx0 + cw * (XS[k] + (XS[k + 1] - XS[k]) * (p - ON[k]) / (ON[k + 1] - ON[k])); };
        notes.forEach(([p, syl], i) => {
          const on = tt < 4 * beat && b >= p && (i === notes.length - 1 || b < notes[i + 1][0]);
          x.fillStyle = on ? lit : ink; x.strokeStyle = on ? lit : ink;
          x.beginPath(); x.ellipse(X(p), ly, r * 1.3, r, -.35, 0, 7); x.fill();
          x.lineWidth = Math.max(1, H * .012); x.beginPath(); x.moveTo(X(p) + r * 1.15, ly - r * .2); x.lineTo(X(p) + r * 1.15, ly - H * .2); x.stroke();
          x.font = `700 ${H * .11}px "GN Text", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
          x.fillText(syl, X(p), cy0 + ch * .92);
        });
        x.fillStyle = ink; x.fillRect(X(1) + r * 1.15 - 1, ly - H * .2, X(1.5) - X(1) + 2, H * .03);   // the eighths' beam
        if (tt < 4 * beat) { x.fillStyle = lit; x.fillRect(X(Math.min(b, 3.9)) - 1.5, cy0 + ch * .08, 3, ch * .6); }   // the playhead
        // the little taiko: its rim glows on each beat, fading smoothly
        const pulse = tt < 4 * beat ? Math.exp(-(b % 1) * 3) : 0, dx = W * .5, dy = H * .83;
        x.fillStyle = css('rd-body'); x.beginPath(); x.ellipse(dx, dy + H * .03, W * .14, H * .09, 0, 0, 7); x.fill();
        x.fillStyle = css('rd-head'); x.beginPath(); x.ellipse(dx, dy - H * .02, W * .13, H * .04, 0, 0, 7); x.fill();
        x.globalAlpha = .35 + .65 * pulse; x.strokeStyle = css('yellow'); x.lineWidth = Math.max(1.5, H * .02);
        x.beginPath(); x.ellipse(dx, dy - H * .02, W * .13, H * .04, 0, 0, 7); x.stroke(); x.globalAlpha = 1;
      },
    },
    /* Scale Trainer: a scale on a little staff, notes turning green one by one as they are "played" up and down,
       and a time bar under it shrinking; a small ALL-STATE READY tag at the end of each run. A canvas screen (2D and 3D). */
    audition: {
      html() { return `<div class="scr scr-audition scr-cv"><canvas aria-hidden="true"></canvas></div>`; },
      draw(x, W, H, t) {
        const TK = this._tk || (this._tk = {}), css = n => TK[n] || (TK[n] = getComputedStyle(document.documentElement).getPropertyValue('--' + n).trim());
        const seq = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 0], loop = seq.length * .45 + 2, tt = t == null ? 3.2 : t % loop, k = Math.floor(tt / .45);
        x.fillStyle = css('sa-wall'); x.fillRect(0, 0, W, H);
        const cx0 = W * .05, cy0 = H * .1, cw = W * .9, ch = H * .58;
        x.fillStyle = css('screen'); x.fillRect(cx0, cy0, cw, ch);
        const top = cy0 + ch * .22, gap = ch * .12, ink = css('ink');
        x.strokeStyle = ink; x.lineWidth = Math.max(1, H * .008);
        for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(cx0 + cw * .04, top + i * gap); x.lineTo(cx0 + cw * .96, top + i * gap); x.stroke(); }
        seq.forEach((d, i) => {
          const nx = cx0 + cw * (.08 + .84 * i / (seq.length - 1)), ny = top + 5 * gap - d * gap / 2;
          x.fillStyle = i < k ? css('sa-ok') : i === k && tt < seq.length * .45 ? css('sa-cur') : ink;
          x.beginPath(); x.ellipse(nx, ny, H * .028, H * .02, -.35, 0, 7); x.fill();
        });
        // the time bar (no alarm: amber near the end)
        const f = Math.max(0, 1 - tt / (seq.length * .45 + .6));
        x.fillStyle = css('floor-3'); x.fillRect(cx0, H * .76, cw, H * .06);
        x.fillStyle = f < .25 ? css('amber') : css('cyan'); x.fillRect(cx0, H * .76, cw * f, H * .06);
        if (tt >= seq.length * .45) {
          x.globalAlpha = Math.min(1, (tt - seq.length * .45) * 2);
          x.fillStyle = css('yellow'); x.font = `${H * .1}px "GN Display", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.fillText('ALL-STATE READY!', W / 2, H * .91); x.globalAlpha = 1;
        }
        // the loop restarts through a soft fade (never a jump: nothing changes much in one frame)
        const edge = Math.min(tt, loop - tt);
        if (t != null && edge < .6) { x.globalAlpha = 1 - edge / .6; x.fillStyle = css('sa-wall'); x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
      },
    },
    /* Arcade Quest: glitchy static, and an 8-bit microphone flickering through it (something is waking up) */
    quest: {
      html() {
        return `<div class="scr scr-quest"><span class="q-static"></span><span class="q-bars"></span>${pixelSVG(QUEST_MIC, 'q-mic')}<span class="q-label">?? ??? ??</span></div>`;
      },
    },
    /* the default for a game with no custom screen: its name, blinking PRESS START */
    insert: {
      html(g) {
        return `<div class="scr scr-insert"><span class="att-title">${esc(g.name)}</span>` +
          `<span class="att-blink"><span>Press start</span><span>Insert coin</span></span></div>`;
      },
    },
  };

  /** a game's cabinet settings with every default filled in (never throws on a missing or odd entry) */
  A.cabinetOf = function (g) {
    const c = g.cabinet || {};
    const main = TRIMS.includes(g.color) ? g.color : 'cyan';
    const trim = TRIMS.includes(c.trim) ? c.trim : main;
    return {
      shape: SHAPES[c.shape] ? c.shape : 'classic',
      trim,
      trim2: TRIMS.includes(c.trim2) ? c.trim2 : (trim === 'cyan' ? 'pink' : 'cyan'),
      marquee: MARQUEES.includes(c.marquee) ? c.marquee : 'bungee',
      screen: SCREENS[c.screen] ? c.screen : 'insert',
    };
  };
  const pos = ([x, y, w, h]) => `left:${x / 3}%;top:${y / 6}%;width:${w / 3}%;height:${h / 6}%`;

  /** the lit marquee: the animated canvas sign from shared/marquees.js (call Arcade.Marquee.hydrate on the element
      after adding it); without that file, the older all-CSS sign (the name, and a mascot for some styles) */
  A.marqueeHTML = function (g, tag = 'p') {
    if (A.Marquee) return A.Marquee.html(g, tag);
    const c = A.cabinetOf(g);
    return `<${tag} class="mq mq-${c.marquee}">` +
      (c.marquee === 'haunt' ? `<span class="mq-mascot" aria-hidden="true">${A.ghostSVG('', '')}</span>` : '') +
      (c.marquee === 'quest' ? `<span class="mq-mascot mq-mic">${pixelSVG(QUEST_MIC, 'mq-micsvg')}</span>` : '') +
      (c.marquee === 'dojo' && A.ninjaSVG ? `<span class="mq-mascot mq-ninja" aria-hidden="true">${A.ninjaSVG({belt: 'belt-black'})}</span>` : '') +
      `<span class="mq-text">` +
      `<span class="mq-name">${c.marquee === 'faceoff' ? esc(g.name).replace(/^(\S+) (.+)$/, '$1 <span class="fo2">$2</span>')
        : c.marquee === 'showtime' ? esc(g.name).replace(/^(\S+) (.+)$/, (m, a, b) => `<span class="st1">${a}</span> <span class="st2">${b.replace('F', '<i class="dead">F</i>')}</span>`)   // one bulb is out
        : esc(g.name)}</span></span></${tag}>`;
  };
  /** class names that give an element this game's neon colors (--t…, --u…) */
  A.trimClasses = g => { const c = A.cabinetOf(g); return `trim-${c.trim} trim2-${c.trim2}`; };

  /** one whole cabinet. opts.href: where START goes. */
  A.cabinetHTML = function (g, opts = {}) {
    const c = A.cabinetOf(g), s = SHAPES[c.shape];
    return `<div class="cab shape-${c.shape} ${A.trimClasses(g)}" data-game="${esc(g.id)}">` +
      shellSVG(s) +
      `<div class="cab-mq" style="${pos(s.slots.marquee)}">${A.marqueeHTML(g)}</div>` +
      `<div class="cab-screen" style="${pos(s.slots.screen)}" data-screen="${c.screen}">${SCREENS[c.screen].html(g, 0)}</div>` +
      `<a class="cab-start" style="${pos(s.slots.start)}" href="${opts.href || '#'}">Start<span class="sr"> ${esc(g.name)}</span></a>` +
      `</div>`;
  };

  /* CANVAS SCREENS (a SCREENS entry with draw()): the canvas is sized to its screen (pixel ratio ≤ 1.5) the first time
     it's drawn; every cabinet shows the still frame, only the front one moves (setAttract, ≤ SCREEN_FPS, nothing while
     the tab is hidden or the floor is paused, still frames with reduced motion) */
  const SCREEN_FPS = 30;
  function sizeCanvas(cv) {
    const r = cv.parentElement.getBoundingClientRect(), dpr = Math.min(1.5, devicePixelRatio || 1);
    const w = Math.max(64, Math.round((r.width || 176) * dpr)), h = Math.max(56, Math.round((r.height || 156) * dpr));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    return cv.getContext('2d');
  }
  function drawScreen(box, g, t) {
    const scr = SCREENS[A.cabinetOf(g).screen], cv = box && box.querySelector('canvas');
    if (!scr || !scr.draw || !cv) return;
    scr.draw(sizeCanvas(cv), cv.width, cv.height, t);
  }
  /** draw the still frame of every canvas screen under root (call after adding cabinets to the page) */
  A.hydrateScreens = function (root) {
    (root || document).querySelectorAll('.cab .cab-screen').forEach(box => {
      const g = (A.ALL_GAMES || A.GAMES || []).find(x => x.id === box.closest('.cab').dataset.game);
      if (g) drawScreen(box, g, null);
    });
  };

  /* Attract mode: only one cabinet (the one in front) animates. CSS runs the loops for
     `.cab.attract`; screens with a `period` are also redrawn on a timer, canvas screens every frame (≤ SCREEN_FPS). */
  let attractTimer = 0, attractRaf = 0, attractBox = null, attractG = null;
  A.setAttract = function (cabEl, g) {
    clearInterval(attractTimer); cancelAnimationFrame(attractRaf); attractRaf = 0;
    if (attractBox && attractG) drawScreen(attractBox, attractG, null);    // the old front screen goes still
    attractBox = attractG = null;
    if (A.Marquee) A.Marquee.animate(cabEl ? cabEl.querySelector('.mq-live') : null, 'floor');   // only the front marquee moves
    document.querySelectorAll('.cab.attract').forEach(el => el.classList.remove('attract'));
    if (!cabEl || (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)')).matches) return;
    cabEl.classList.add('attract');
    const c = A.cabinetOf(g), scr = SCREENS[c.screen], box = cabEl.querySelector('.cab-screen');
    if (scr.draw) {
      attractBox = box; attractG = g;
      const t0 = performance.now(); let last = 0;
      const loop = now => {
        attractRaf = requestAnimationFrame(loop);
        if (document.hidden || A.floorPaused || now - last < 1000 / SCREEN_FPS - 1) return;
        last = now; drawScreen(box, g, (now - t0) / 1000);
      };
      attractRaf = requestAnimationFrame(loop);
      return;
    }
    if (!scr.period) return;
    let i = 0;
    box.innerHTML = scr.html(g, i);
    attractTimer = setInterval(() => { if (!document.hidden) box.innerHTML = scr.html(g, ++i); }, scr.period);
  };

  /** a small flat silhouette of a game's cabinet (the lobby's zone signs): its outline in the body color, trim neon edge */
  A.cabSilhouetteSVG = function (g, cls = '') {
    const c = A.cabinetOf(g), s = SHAPES[c.shape];
    return `<svg class="cab-sil ${cls} ${A.trimClasses(g)}" viewBox="-10 -10 320 620" aria-hidden="true"><path d="${s.outline}"/></svg>`;
  };
  A.CAB_SHAPES = SHAPES;
  A.CAB_SCREENS = SCREENS;
})(window.Arcade);
