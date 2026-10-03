/* THE SEASONAL LOOK of the arcade's MENUS (the floor page only: the lobby, a zone, ALL GAMES, the FULL ARCADE in 2D and
   3D, Choose Your Instrument and PRESS START; never inside a game). shared/seasons.js decides WHICH look shows today
   (Arcade.Seasons.look(): an event's, else a background-only season's) and whether the device wants it
   (Arcade.Seasons.lookOn(): the "Seasonal look" switch in the Settings panel and the event panel). This file DRAWS it:
     one full-screen backdrop behind the floor (`.slook`, before `.room`; the 3D canvas is see-through, so it shows
     behind the 3D cabinets too), and a copy of it inside PRESS START and Choose Your Instrument (both cover the page).
     Each one has a FRONT layer beside it (`.slook-front`, after `.room`): the props that stand ON the floor (a prop's
     {front: true}: jack-o'-lanterns, gourds, drums…) so the floor's lines never cross them; still under every sign,
     card and bar. In a zone / the FULL ARCADE it rises over the 3D canvas / 2D floor and its props are placed in free
     spots, clear of every cabinet and control (placeFront()).
     Everything is CSS gradients + small inline SVGs (no pictures to download), colors are theme tokens (arcade.css
     "SEASONAL LOOKS"), the middle of the screen stays dark (.sl-dim) so every text on top keeps its contrast, and the
     props sit at the edges. A few things drift slowly (bats, snow, hearts, notes, petals, leaves; the spotlights sway):
     transforms and opacity only, ≥ 3 s cycles, never a flash; STILL with reduced motion or MOTION off (Settings).
     The 3D room: Arcade.SeasonLook.palette() gives arcade3d.js the haze and light colors; Floor3D.look() re-reads it.
   ADD A LOOK: an entry in LOOKS below ({props: [[svg, css position/size, class, {front: true}?]], fx: particle kind, n, palette}) +
   its colors in arcade.css (html[data-slook="<id>"] …), then use its id as an event's or a season's `look`.
     Arcade.SeasonLook.apply()   draw what today wants (seasons.js' switch fires 'arcade:seasonlook', which calls it)
     Arcade.SeasonLook.state()   tests: {look, id, kind, on, still, hosts, fronts}; .place() / .placeFront() / .batPass() run those now */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';

  /* ---------- the little pictures (fills/strokes come from classes in arcade.css) ---------- */
  const SVG = {
    moon: '<svg viewBox="0 0 100 100"><circle class="mn" cx="50" cy="50" r="40"/><circle class="mc" cx="36" cy="40" r="7"/><circle class="mc" cx="60" cy="62" r="9"/><circle class="mc" cx="64" cy="32" r="4"/></svg>',
    // a jack-o'-lantern in three layers so its candle glow sits BEHIND the carved face: ground shadow, body, glow, face
    pumpkin: '<b class="pks"></b><svg viewBox="0 0 52 46"><path class="st" d="M26 11V3l6-2"/><ellipse class="pk" cx="26" cy="28" rx="24" ry="17"/><path class="pr" d="M18 12Q12 28 18 45M34 12Q40 28 34 45M26 11V45"/></svg>' +
      '<b class="pkg"></b><svg viewBox="0 0 52 46"><path class="pf" d="M13 24l5-5 5 5ZM29 24l5-5 5 5ZM15 32q11 8 22 0l-3 3-3-2-3 3-3-2-3 3-3-2Z"/></svg>',
    /* THE HAUNTED BAND HALL (spooky): a cute little concert hall on a hilltop, a silhouette backlit by the moon. A crooked
       bell tower with an eighth-note weathervane, a bandshell arch over the front, arched windows glowing amber (one high in
       the gable), a crooked path down the hill. (The hill's foot fades into the fog: .sl-hall::after.) */
    bandhall: '<svg viewBox="0 0 200 176"><g class="hs">' +
      '<path d="M0 176Q18 156 66 148Q100 141 134 148Q182 156 200 176Z"/>' +                 // the hilltop
      '<g transform="rotate(-6 100 66)"><path d="M99.2 32V15H100.8V32Z"/><path d="M90 66V46H110V66Z"/><path d="M86 47L100 30L114 47Z"/>' +   // the crooked bell tower
      '<g class="vane" transform="rotate(10 100 14)"><ellipse cx="97" cy="14" rx="3.6" ry="2.6" transform="rotate(-20 97 14)"/><path class="vs" d="M100.3 14V2Q107 5 106 12"/></g></g>' +
      '<path d="M26 94L100 56L174 94Z"/><path d="M36 92H164V150H36Z"/></g>' +                       // the roof and the hall
      '<path class="hb" d="M66 150V126A34 34 0 0 1 134 126V150Z"/>' +                                 // the bandshell arch
      '<path class="hr" d="M74 150V127A26 26 0 0 1 126 127V150M82 150V128A18 18 0 0 1 118 128V150"/>' +
      '<path class="hw w0" d="M90 150V132A10 10 0 0 1 110 132V150Z"/>' +                              // the stage inside, softly lit
      '<path class="hw w1" d="M46 124V110A6 6 0 0 1 58 110V124Z"/><path class="hw w2" d="M142 124V110A6 6 0 0 1 154 110V124Z"/>' +
      '<path class="hw w3" d="M96.5 60V53.5A3.5 3.5 0 0 1 103.5 53.5V60Z" transform="rotate(-6 100 66)"/>' + // the bell's window
      '<path class="hw w4" d="M95 89V78A5 5 0 0 1 105 78V89Z"/>' +                                    // the gable's window
      '<path class="hp" d="M100 151Q94 156 99 160T93 168Q90 172 96 176"/></svg>',
    bat: '<svg viewBox="0 0 40 20"><path class="bt" d="M20 6c2 0 3 2 3 4 3-4 9-7 17-6-4 2-5 6-4 9-3-2-6-1-8 2-2-2-5-3-8-2-3-1-6 0-8 2-2-3-5-4-8-2 1-3 0-7-4-9 8-1 14 2 17 6 0-2 1-4 3-4Z"/></svg>',
    fog: '<svg viewBox="0 0 400 60" preserveAspectRatio="none"><path class="fg" d="M0 40Q50 18 100 36T200 34T300 38T400 32V60H0Z"/></svg>',
    flake: '<svg viewBox="0 0 20 20"><path class="fk" d="M10 1v18M2.2 5.5l15.6 9M2.2 14.5l15.6-9M10 4l-2-2M10 4l2-2M10 16l-2 2M10 16l2 2"/></svg>',
    crystal: '<svg viewBox="0 0 100 100"><g class="cr"><path d="M50 4v92M10 27l80 46M10 73l80-46"/><path d="M50 18l-8-8M50 18l8-8M50 82l-8 8M50 82l8 8M22 34l-11 3M22 34l-3-11M78 66l11-3M78 66l3 11M22 66l-11-3M22 66l-3 11M78 34l11 3M78 34l3-11"/><circle cx="50" cy="50" r="7"/></g></svg>',
    hills: '<svg viewBox="0 0 400 60" preserveAspectRatio="none"><path class="sn" d="M0 34Q60 10 130 30T260 24T400 30V60H0Z"/><path class="sn2" d="M0 46Q80 30 170 44T400 40V60H0Z"/></svg>',
    lights: '<svg viewBox="0 0 200 44"><path class="wr" d="M0 4Q100 40 200 4"/>' +
      [[22, 15, 'l1'], [60, 25, 'l2'], [100, 26, 'l3'], [140, 25, 'l4'], [178, 15, 'l1']].map(([x, y, c]) => `<ellipse class="lb ${c}" cx="${x}" cy="${y + 6}" rx="4.5" ry="6.5"/><rect class="lc" x="${x - 3}" y="${y - 2}" width="6" height="4"/>`).join('') + '</svg>',
    heart: '<svg viewBox="0 0 24 22"><path class="ht" d="M12 21C-5 10 4-3 12 5c8-8 17 5 0 16Z"/></svg>',
    bigheart: '<svg viewBox="0 0 24 22"><path class="hto" d="M12 20C-4 10 4-2 12 5c8-7 16 5 0 15Z"/></svg>',
    note: '<svg viewBox="0 0 20 26"><path class="ns" d="M10.5 20V2l8 4v5l-8-4"/><ellipse class="nt" cx="6" cy="21" rx="5.5" ry="4" transform="rotate(-20 6 21)"/></svg>',
    bunting: '<svg viewBox="0 0 200 44"><path class="wr" d="M0 2Q100 22 200 2"/>' +
      [[8, 'f1'], [40, 'f2'], [72, 'f3'], [104, 'f4'], [136, 'f1'], [168, 'f2']].map(([x, c], i) => { const y = 3 + 18 * Math.sin(Math.PI * (x + 12) / 200); return `<path class="fl ${c}" d="M${x} ${y}h24l-12 ${22 - (i % 2) * 2}Z"/>`; }).join('') + '</svg>',
    drum: '<svg viewBox="0 0 100 80"><ellipse class="dh" cx="50" cy="40" rx="42" ry="36"/><path class="dr" d="M14 22L50 76L86 22M14 58L50 4L86 58"/><ellipse class="dr" cx="50" cy="40" rx="42" ry="36"/></svg>',
    branch: '<svg viewBox="0 0 220 140"><path class="br" d="M0 18Q60 20 110 48T210 70M70 30Q84 60 80 96M140 58Q150 30 180 22"/>' +
      [[40, 16], [80, 36], [112, 50], [150, 62], [196, 70], [78, 72], [82, 98], [168, 26], [184, 20], [128, 40]].map(([x, y], i) =>
        `<g class="bl${i % 3 ? '' : ' b2'}" transform="translate(${x} ${y})"><circle cx="0" cy="-5" r="4.6"/><circle cx="4.8" cy="-1.5" r="4.6"/><circle cx="3" cy="4" r="4.6"/><circle cx="-3" cy="4" r="4.6"/><circle cx="-4.8" cy="-1.5" r="4.6"/><circle class="bc" r="2.2"/></g>`).join('') + '</svg>',
    petal: '<svg viewBox="0 0 12 12"><path class="pt" d="M6 0C10 3 10 9 6 12C2 9 2 3 6 0Z"/></svg>',
    grass: '<svg viewBox="0 0 400 40" preserveAspectRatio="none"><path class="gr" d="M0 40V30l8-12 4 12 10-18 5 18 9-10 4 10 12-16 4 16 10-12 6 12 8-20 5 20 12-14 3 14 10-10 6 10 12-18 4 18 10-12 4 12 9-16 5 16 12-10 3 10 10-18 6 18 8-12 5 12 12-16 3 16 10-10 6 10 12-18 4 18 9-12 5 12 10-16 4 16 12-10 6 10 8-18 5 18 12-12 4 12 10-14 6 14V40Z"/></svg>',
    // the sunset sun: a half disc on the horizon cut into bands (each band = the disc between two gaps)
    sun: (() => {
      const R = 90, cx = 100, gaps = [[58, 61], [70, 74], [80, 85], [88, 94]], edges = [[10, 58]].concat(gaps.map((g, i) => [g[1], (gaps[i + 1] || [100])[0]]));
      const half = y => Math.sqrt(Math.max(0, R * R - (100 - y) * (100 - y)));
      return '<svg viewBox="0 0 200 100">' + edges.map(([a, b]) => {
        const pts = []; for (let y = a; y <= b; y += 2) pts.push([cx - half(y), y]); pts.push([cx - half(b), b]);
        const right = pts.slice().reverse().map(([x, y]) => [2 * cx - x, y]);
        return `<path class="su" d="M${pts.concat(right).map(p => p[0].toFixed(1) + ' ' + p[1]).join('L')}Z"/>`;
      }).join('') + '</svg>';
    })(),
    wheel: '<svg viewBox="0 0 120 130"><g class="wh"><circle cx="60" cy="60" r="52"/><circle cx="60" cy="60" r="6"/>' +
      Array.from({length: 8}, (_, i) => { const a = i * Math.PI / 4; return `<path d="M60 60L${60 + 52 * Math.cos(a)} ${60 + 52 * Math.sin(a)}"/>`; }).join('') +
      Array.from({length: 8}, (_, i) => { const a = i * Math.PI / 4 + .39; return `<rect x="${60 + 52 * Math.cos(a) - 5}" y="${60 + 52 * Math.sin(a) - 4}" width="10" height="8" rx="2"/>`; }).join('') +
      '<path d="M60 60L34 128M60 60L86 128"/></g></svg>',
    palm: '<svg viewBox="0 0 120 160"><path class="pm" d="M64 160Q56 110 66 60"/><path class="pml" d="M66 60Q40 40 8 52M66 60Q60 30 34 14M66 60Q80 30 108 26M66 60Q96 52 116 72M66 60Q48 62 30 86"/></svg>',
    boards: '<svg viewBox="0 0 400 40" preserveAspectRatio="none"><path class="bw" d="M0 14H400V40H0Z"/><path class="bwl" d="M0 14H400M0 24H400M40 14V40M100 14V40M160 14V40M220 14V40M280 14V40M340 14V40"/></svg>',
    wave: '<svg viewBox="0 0 400 20" preserveAspectRatio="none"><path class="wv" d="M0 12Q25 2 50 12T100 12T150 12T200 12T250 12T300 12T350 12T400 12"/></svg>',
    curtain: '<svg viewBox="0 0 100 400" preserveAspectRatio="none"><path class="ct" d="M0 0H100V400Q80 380 70 400Q55 382 42 400Q28 384 16 400Q6 388 0 396Z"/>' +
      [16, 34, 52, 70, 88].map(x => `<path class="cf" d="M${x} 0V396"/>`).join('') + '</svg>',
    valance: '<svg viewBox="0 0 400 40" preserveAspectRatio="none"><path class="ct" d="M0 0H400V26' + Array.from({length: 10}, (_, i) => `Q${400 - i * 40 - 20} 42 ${400 - (i + 1) * 40} 26`).join('') + 'Z"/><path class="vt" d="M0 8H400"/></svg>',
    spot: '',                                          // a CSS cone (arcade.css .sl-spot)
    foot: '<svg viewBox="0 0 400 20" preserveAspectRatio="none"><path class="fb" d="M0 10H400V20H0Z"/></svg>',
    doodles: {
      star: '<svg viewBox="0 0 40 40"><path class="dd d1" d="M20 3l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z"/></svg>',
      plane: '<svg viewBox="0 0 60 40"><path class="dd d2" d="M2 20L58 4L40 36L28 24ZM28 24L58 4M28 24L26 34L34 29"/><path class="dd d2 dash" d="M2 30Q-10 38 -24 32"/></svg>',
      aplus: '<svg viewBox="0 0 60 40"><path class="dd d3" d="M4 36L16 4L28 36M9 24H23M40 14V32M31 23H49"/><circle class="dd d3" cx="27" cy="21" r="24" transform="scale(1 .82) translate(0 4)"/></svg>',
      pencil: '<svg viewBox="0 0 80 20"><path class="dd d4" d="M4 10L16 4H72V16H16ZM16 4V16M62 4V16M4 10H10"/></svg>',
      note: '<svg viewBox="0 0 30 36"><path class="dd d1" d="M10 30V6L26 2V24"/><ellipse class="dd d1" cx="6" cy="30" rx="5" ry="4"/><ellipse class="dd d1" cx="22" cy="25" rx="5" ry="4"/></svg>',
      bolt: '<svg viewBox="0 0 30 44"><path class="dd d3" d="M18 2L4 24H14L10 42L26 16H16Z"/></svg>',
      smile: '<svg viewBox="0 0 40 40"><circle class="dd d4" cx="20" cy="20" r="16"/><path class="dd d4" d="M12 24Q20 32 28 24M14 15v2M26 15v2"/></svg>',
    },
    leaf: '<svg viewBox="0 0 20 24"><path class="lf" d="M10 0L12 6 18 4 15 10 20 12 14 15 16 22 10 18 4 22 6 15 0 12 5 10 2 4 8 6Z"/><path class="lv" d="M10 4V24"/></svg>',
    wheat: '<svg viewBox="0 0 30 120"><path class="wt" d="M15 120V20"/>' + [20, 32, 44, 56].map(y => `<ellipse class="wg" cx="10" cy="${y}" rx="4" ry="7" transform="rotate(-25 10 ${y})"/><ellipse class="wg" cx="20" cy="${y + 4}" rx="4" ry="7" transform="rotate(25 20 ${y + 4})"/>`).join('') + '</svg>',
    gourd: '<svg viewBox="0 0 52 46"><path class="st" d="M26 11V3l6-2"/><ellipse class="pk" cx="26" cy="28" rx="24" ry="17"/><path class="pr" d="M18 12Q12 28 18 45M34 12Q40 28 34 45M26 11V45"/></svg>',
  };
  const D = SVG.doodles;
  /* each look: props [[picture, where (css), classes]], particles fx: [picture, how many, class] */
  const LOOKS = {
    /* SPOOKY: the moon is the hero (Mr. Graham's favorite: keep its drawing), a bat crosses it now and then, the haunted
       band hall stands in front of its lower part; jack-o'-lanterns on the floor (front layer). The moon's top follows
       --sl-top (place() below: under the top bar and every bare text); sizes: --mw, --hw in arcade.css. */
    spooky: {props: [[SVG.moon, 'right:4%;top:var(--mt);width:var(--mw);aspect-ratio:1', 'sl-moon'],
      ['moonbat', 'right:4%;top:var(--mt);width:var(--mw);aspect-ratio:1', 'sl-mbat'],
      [SVG.bandhall, 'right:var(--hr);top:var(--ht);width:var(--hw);aspect-ratio:200/176', 'sl-hall'],
      [SVG.fog, 'left:-10%;right:-10%;bottom:0;height:22%', 'sl-fog'], [SVG.fog, 'left:-30%;right:-10%;bottom:4%;height:16%', 'sl-fog f2'],
      [SVG.pumpkin, 'left:2.5%;bottom:3%;width:clamp(44px,8vmin,90px);aspect-ratio:52/46;--ph:0s', 'sl-pk', {front: true}],
      [SVG.pumpkin, 'left:calc(2.5% + clamp(40px,7vmin,80px));bottom:2.5%;width:clamp(30px,5.5vmin,60px);aspect-ratio:52/46;--ph:-1.7s', 'sl-pk', {front: true}],
      [SVG.pumpkin, 'right:3%;bottom:3%;width:clamp(40px,7vmin,80px);aspect-ratio:52/46;--ph:-3.1s', 'sl-pk', {front: true}]],
      fx: [SVG.bat, 4, 'sl-bat'], palette: {haze: ['purple', 'amber', 'purple'], lights: ['purple', 'amber']}},
    winter: {props: [[SVG.hills, 'left:0;right:0;bottom:0;height:16%', 'sl-hills', {front: true}], ['lights', 'left:0;right:0;top:0', 'sl-lights']],
      fx: [SVG.flake, 10, 'sl-snow'], palette: {haze: ['blue', 'cyan', 'white'], lights: ['cyan', 'blue']}},
    friendship: {props: [[SVG.bigheart, 'left:-2%;top:18%;width:clamp(90px,18vmin,220px);aspect-ratio:24/22', 'sl-bh'],
      [SVG.bigheart, 'right:-3%;bottom:6%;width:clamp(110px,22vmin,260px);aspect-ratio:24/22', 'sl-bh b2']],
      fx: [SVG.heart, 8, 'sl-heart'], palette: {haze: ['pink', 'red', 'pink'], lights: ['pink', 'red']}},
    miosm: {props: [['bunting', 'left:0;right:0;top:0', 'sl-bunting'], [SVG.drum, 'left:2%;bottom:3%;width:clamp(60px,11vmin,130px);aspect-ratio:100/80', 'sl-drum', {front: true}],
      [SVG.drum, 'right:2.5%;bottom:3%;width:clamp(46px,8vmin,100px);aspect-ratio:100/80', 'sl-drum d2', {front: true}]],
      fx: [SVG.note, 7, 'sl-note'], palette: {haze: ['red', 'yellow', 'blue'], lights: ['yellow', 'red']}},
    spring: {props: [[SVG.branch, 'left:0;top:0;width:clamp(130px,24vmin,300px);aspect-ratio:220/140', 'sl-branch'],
      [SVG.branch, 'right:0;top:0;width:clamp(120px,22vmin,280px);aspect-ratio:220/140;transform:scaleX(-1)', 'sl-branch'],
      [SVG.grass, 'left:0;right:0;bottom:0;height:5%', 'sl-grass', {front: true}]],
      fx: [SVG.petal, 9, 'sl-petal'], palette: {haze: ['green', 'pink', 'green'], lights: ['pink', 'green']}},
    summer: {props: [[SVG.sun, 'left:50%;bottom:10%;width:clamp(180px,44vmin,520px);aspect-ratio:2;transform:translateX(-50%)', 'sl-sun'],
      [SVG.wheel, 'right:3%;bottom:9%;width:clamp(80px,17vmin,190px);aspect-ratio:120/130', 'sl-wheel', {front: true}],
      [SVG.palm, 'left:1%;bottom:8%;width:clamp(60px,12vmin,140px);aspect-ratio:120/160', 'sl-palm', {front: true}],
      [SVG.boards, 'left:0;right:0;bottom:3%;height:6%', 'sl-boards', {front: true}], [SVG.wave, 'left:0;right:0;bottom:0;height:3%', 'sl-wave', {front: true}]],
      fx: null, palette: {haze: ['amber', 'pink', 'purple'], lights: ['amber', 'pink']}},
    concert: {props: [[SVG.spot, 'left:14%;top:0;width:clamp(120px,22vw,340px);height:92%', 'sl-spot s1'],
      [SVG.spot, 'right:14%;top:0;width:clamp(120px,22vw,340px);height:92%', 'sl-spot s2'],
      [SVG.curtain, 'left:0;top:0;bottom:0;width:clamp(40px,9vw,150px)', 'sl-curtain'],
      [SVG.curtain, 'right:0;top:0;bottom:0;width:clamp(40px,9vw,150px);transform:scaleX(-1)', 'sl-curtain'],
      [SVG.valance, 'left:0;right:0;top:0;height:clamp(22px,5vh,48px)', 'sl-valance'], ['foot', 'left:0;right:0;bottom:0', 'sl-foot', {front: true}]],
      fx: null, palette: {haze: ['yellow', 'red', 'amber'], lights: ['yellow', 'amber']}},
    school: {props: [[D.star, 'left:4%;top:16%;width:clamp(26px,5vmin,52px);aspect-ratio:1', 'sl-dood'],
      [D.plane, 'right:6%;top:14%;width:clamp(44px,8vmin,90px);aspect-ratio:3/2', 'sl-dood'],
      [D.aplus, 'left:3%;bottom:9%;width:clamp(44px,8vmin,90px);aspect-ratio:3/2', 'sl-dood'],
      [D.pencil, 'right:4%;bottom:6%;width:clamp(60px,12vmin,140px);aspect-ratio:4', 'sl-dood'],
      [D.note, 'left:9%;top:44%;width:clamp(22px,4vmin,44px);aspect-ratio:30/36', 'sl-dood'],
      [D.bolt, 'right:9%;top:46%;width:clamp(20px,3.6vmin,40px);aspect-ratio:30/44', 'sl-dood'],
      [D.smile, 'right:18%;bottom:13%;width:clamp(26px,5vmin,52px);aspect-ratio:1', 'sl-dood']],
      fx: null, palette: {haze: ['green', 'cyan', 'yellow'], lights: ['green', 'cyan']}},
    harvest: {props: [[SVG.wheat, 'left:1%;bottom:0;width:clamp(22px,4vmin,40px);aspect-ratio:30/120', 'sl-wheat', {front: true}],
      [SVG.wheat, 'left:calc(1% + clamp(16px,3vmin,30px));bottom:0;width:clamp(20px,3.6vmin,36px);aspect-ratio:30/120', 'sl-wheat w2', {front: true}],
      [SVG.gourd, 'left:calc(1% + clamp(40px,7vmin,72px));bottom:2%;width:clamp(36px,6.5vmin,72px);aspect-ratio:52/46', 'sl-gourd', {front: true}],
      [SVG.gourd, 'right:3%;bottom:2%;width:clamp(40px,7vmin,80px);aspect-ratio:52/46', 'sl-gourd g2', {front: true}],
      [SVG.wheat, 'right:calc(3% + clamp(36px,7vmin,80px));bottom:0;width:clamp(20px,3.6vmin,36px);aspect-ratio:30/120', 'sl-wheat', {front: true}]],
      fx: [SVG.leaf, 8, 'sl-leaf'], palette: {haze: ['amber', 'red', 'amber'], lights: ['amber', 'red']}},
    frost: {props: [[SVG.crystal, 'left:-3%;top:-4%;width:clamp(110px,24vmin,280px);aspect-ratio:1', 'sl-crystal'],
      [SVG.crystal, 'right:-4%;bottom:-6%;width:clamp(130px,28vmin,320px);aspect-ratio:1', 'sl-crystal c2'],
      [SVG.crystal, 'right:10%;top:6%;width:clamp(40px,8vmin,90px);aspect-ratio:1', 'sl-crystal c3']],
      fx: [SVG.flake, 5, 'sl-snow quiet'], palette: {haze: ['cyan', 'blue', 'white'], lights: ['cyan', 'blue']}},
  };
  // the repeating strips along the top/bottom: a row of fixed-shape pieces (never stretched), cut off at the right
  const STRIP = {lights: [SVG.lights, 12, 'sl-seg'], bunting: [SVG.bunting, 12, 'sl-seg'],
    foot: ['<i class="sl-fl"></i>', 40, 'sl-fls']};

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  /* one layer of a look's scene. 'back' = the sky, the props, the drifting bits and the middle's dimming (behind the
     room's floor); 'front' = only the props marked {front: true} (things standing ON the floor: in front of its lines).
     In a zone / the FULL ARCADE the front layer rises above the 3D canvas and the 2D floor, and each front prop with its
     own size (.sl-pl: pumpkins, gourds, drums…) is PLACED in a free spot by placeFront() below; the strips across the
     whole screen (snow hills, grass, boardwalk, footlights) can't dodge anything, so there they show the backdrop's
     copy instead (.sl-fb), behind the floor and the cabinets. */
  function sceneHTML(id, layer) {
    const L = LOOKS[id];
    if (!L) return '';
    const front = layer === 'front';
    const props = L.props.filter(p => front ? p[3] && p[3].front : true).map(([pic, pos, cls, opt]) => {
      // a front prop with its own size (not a strip across the screen) can be PLACED in a carousel view: .sl-pl
      if (opt && opt.front && !/left:0;right:0/.test(pos)) cls += ' sl-pl';
      if (!front && opt && opt.front) cls += ' sl-fb';
      if (STRIP[pic]) { const [svg, n, c] = STRIP[pic]; return `<div class="sl-p ${cls}" style="${pos}">${Array.from({length: n}, () => `<span class="${c}">${svg}</span>`).join('')}</div>`; }
      if (pic === 'moonbat') return `<i class="sl-p ${cls}" style="${pos}"><i class="mb"><i class="mby">${SVG.bat}</i></i></i>`;
      return `<i class="sl-p ${cls}" style="${pos}">${pic}</i>`;
    }).join('');
    if (front) return props;
    let fx = '';
    if (L.fx) {
      const [pic, n, cls] = L.fx;
      // spread evenly across the width (kept off the very middle), each with its own speed and start
      fx = Array.from({length: n}, (_, i) => {
        const x = ((i + .5) / n) * 100, left = x > 36 && x < 64 ? (x < 50 ? x - 16 : x + 16) : x;
        const dur = 16 + hash(i + 3) * 14, delay = -hash(i + 11) * dur, s = .6 + hash(i + 7) * .7;
        return `<i class="sl-x ${cls}" style="left:${left.toFixed(1)}%;--d:${dur.toFixed(1)}s;--dl:${delay.toFixed(1)}s;--s:${s.toFixed(2)}">${pic}</i>`;
      }).join('');
    }
    return `<div class="sl-sky"></div>${props}<div class="sl-fx">${fx}</div><div class="sl-dim"></div>`;
  }

  /* ---------- where it's drawn ---------- */
  const still = () => !!(A.reducedMotion ? A.reducedMotion.matches : matchMedia('(prefers-reduced-motion: reduce)').matches);
  let cur = null;                                      // the look shown now (id) or null
  // a host's two layers: the backdrop (.slook) and, just after it, the front layer (.slook-front). Both are fixed, full
  // screen, z-index -1: the front one comes later, so it paints over the backdrop and the room's floor (.room, also -1),
  // and under everything else on the page (every sign, card, bar, panel and toast is in the normal flow or above 0)
  function host(parent, cls, after) {
    if (!parent) return [];
    const mk = c => { const h = document.createElement('div'); h.className = c + ' ' + cls; h.setAttribute('aria-hidden', 'true'); return h; };
    let back = parent.querySelector(':scope > .slook'), front = parent.querySelector(':scope > .slook-front');
    if (!back) { back = mk('slook'); parent.insertBefore(back, after || parent.firstChild); }
    if (!front) { front = mk('slook-front'); const at = after || back; parent.insertBefore(front, at.nextSibling); }
    return [back, front];
  }
  const HOSTS = () => [
    // the body: the backdrop before .room (its checkered floor stays on top), the front layer right after .room
    [document.body, 'sl-page', document.querySelector('body > .room')],
    [document.getElementById('pressStart'), 'sl-in', null],
    [document.getElementById('selectView'), 'sl-in', null],
  ];
  function info() { const S = A.Seasons; return S && S.look ? S.look() : null; }
  function apply() {
    const S = A.Seasons, L = info();
    const on = !!(L && LOOKS[L.look] && (L.preview || (S && S.lookOn())));
    const id = on ? L.look : null, root = document.documentElement;
    root.classList.toggle('slook-still', still());
    if (id !== cur) {
      cur = id;
      if (id) {
        root.dataset.slook = id;
        HOSTS().forEach(([p, cls, after]) => host(p, cls, after).forEach((h, i) => { h.dataset.look = id; h.innerHTML = sceneHTML(id, i ? 'front' : 'back'); }));
      } else { delete root.dataset.slook; document.querySelectorAll('.slook,.slook-front').forEach(h => h.remove()); }
      if (A.Floor3D && A.Floor3D.look) A.Floor3D.look();
      watch(); place(); placeSoon(); batLater();
    }
    // the lobby's signs get their small touch (snow on top…) only with the look on
    if (A.SeasonLobby && A.SeasonLobby.render && document.getElementById('lobby') && !document.getElementById('lobby').hidden) A.SeasonLobby.render();
  }
  /* ---------- THE MOON'S HEIGHT: under the top bar, and under every bare text it would sit behind ----------
     The moon is light, so no text may land on it. Each layer gets --sl-top: the lowest of 12 % of the screen, the top
     bar's bottom (+10 px), and the bottom of any text WITHOUT its own solid background (the neon sign, its tagline, ALL
     GAMES' count, PRESS START's sign, Choose Your Instrument's title…) in the moon's column in the top half of the screen (at
     the page's top: everything that scrolls moves up, away from it). Signs, cards, buttons and bars have solid
     backgrounds: the moon may sit behind those. Measured again when the view or the screen size changes. */
  function bareTexts(root, skip) {
    const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), r = document.createRange(), seen = new Map();
    const solid = el => {
      if (!seen.has(el)) { const c = getComputedStyle(el); seen.set(el, c.backgroundImage !== 'none' || /^rgb\(|,\s*1\)$/.test(c.backgroundColor)); }
      return seen.get(el);
    };
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.nodeValue.trim()) continue;
      const el = n.parentElement;
      if (!el || el.closest('.slook,.slook-front,[hidden],.sr' + (skip ? ',' + skip : '')) || (el.checkVisibility && !el.checkVisibility({visibilityProperty: true, opacityProperty: true}))) continue;
      let bare = true;
      for (let e = el; e && e !== root; e = e.parentElement) if (solid(e)) { bare = false; break; }   // (the view's own background is under the backdrop)
      if (!bare) continue;
      r.selectNodeContents(n);
      const b = r.getBoundingClientRect();
      if (b.width > 2 && b.height > 2) out.push(b);
    }
    return out;
  }
  function place() {
    if (!cur) return;
    const H = innerHeight;
    document.querySelectorAll('.slook').forEach(h => {
      const moon = h.querySelector('.sl-moon');
      if (!moon) return;
      const inSelect = h.parentElement.id === 'selectView', press = h.parentElement.id === 'pressStart';
      const view = inSelect || press ? h.parentElement : document.body;
      if (view && !view.getClientRects().length) return;                 // hidden: measured when it shows
      const sy = inSelect ? h.parentElement.scrollTop : scrollY;          // measure as if scrolled to the top
      const bar = inSelect ? h.parentElement.querySelector('.topbar') : press ? null : document.getElementById('fbar');
      const m = moon.getBoundingClientRect(), size = m.width, x0 = m.left - 12, x1 = m.right + 12;
      let top = Math.max(H * .12, bar ? bar.getBoundingClientRect().bottom + sy + 10 : 0);
      const texts = view ? bareTexts(view, view === document.body ? '#pressStart,#selectView' : '').map(b => ({top: b.top + sy, bottom: b.bottom + sy, left: b.left, right: b.right}))
        .filter(b => b.right > x0 && b.left < x1 && b.top < H * .5).sort((a, b) => a.top - b.top) : [];
      for (const b of texts) if (b.bottom + 6 > top && b.top - 6 < top + size) top = b.bottom + 10;
      h.style.setProperty('--sl-top', Math.round(Math.min(top, H * .55)) + 'px');
      const f = h.parentElement.querySelector(':scope > .slook-front');
      if (f) f.style.setProperty('--sl-top', Math.round(Math.min(top, H * .55)) + 'px');
    });
  }
  /* ---------- THE FRONT PROPS IN A CAROUSEL VIEW (a zone, the FULL ARCADE; 2D and 3D) ----------
     There the front layer sits above the floor (the 3D canvas, the 2D floor) but must never cover a control or a
     cabinet. Each placeable prop (.sl-pl) goes to the nearest free spot to its home corner, along the bottom (it may
     step in from the corner and up over the floor), at full size if it fits, else as small as 60 %; with no free spot
     at that screen size, just that one hides (.sl-hide). Obstacles: the cabinets (Arcade.Arcade.cabinets(): 3D
     projected, 2D the visible slots), START, the Prize Counter, the arrows, the lights, the zone tags, QUICK JUMP, the
     info panel's words and hi-score, the top bar, and the props already placed. Measured on a view change, a resize
     or rotation and a scroll (debounced), never every frame. */
  const MARGIN = 6, SCALES = [1, .9, .8, .7, .6];
  function obstacles() {
    const out = [], add = b => { if (b && b.right - b.left > 1 && b.bottom - b.top > 1) out.push(b); };
    const shown = e => e.getClientRects().length && (!e.checkVisibility || e.checkVisibility({visibilityProperty: true, opacityProperty: true}));
    if (A.Arcade && A.Arcade.cabinets) A.Arcade.cabinets().forEach(add);
    const fbar = document.getElementById('fbar');
    if (fbar) add(fbar.getBoundingClientRect());
    const zv = document.getElementById('zoneView');
    if (!zv) return out;
    zv.querySelectorAll('.nav, .start3d, .prize3d, .prize2d, .cab-start, #lights > *, #aisleFlags > *, #jumpStrip, #hiscore')
      .forEach(e => { if (!e.hidden && shown(e)) add(e.getBoundingClientRect()); });
    const r = document.createRange(), w = document.createTreeWalker(zv.querySelector('.info') || zv, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!n.nodeValue.trim() || !n.parentElement || !shown(n.parentElement)) continue;
      r.selectNodeContents(n); [...r.getClientRects()].forEach(add);
    }
    return out;
  }
  const hits = (b, list) => list.some(o => b.left < o.right + MARGIN && o.left - MARGIN < b.right && b.top < o.bottom + MARGIN && o.top - MARGIN < b.bottom);
  function placeFront() {
    const f = document.querySelector('body > .slook-front');
    if (!f) return;
    const items = [...f.querySelectorAll('.sl-pl')];
    items.forEach(e => { e.style.transform = ''; e.classList.remove('sl-hide'); });
    if (!document.body.classList.contains('v-zone') || document.body.classList.contains('in-select')) return;
    const W = innerWidth, H = innerHeight, obs = obstacles(), placed = [], step = 6;
    items.forEach(e => {
      const h0 = e.getBoundingClientRect(), cx0 = h0.left + h0.width / 2, b0 = h0.bottom, dir = cx0 < W / 2 ? 1 : -1;
      let best = null;
      for (const s of SCALES) {
        const w = h0.width * s, h = h0.height * s;
        let bd = Infinity;
        for (let dy = 0; dy <= H * .45 && dy < bd; dy += step) {
          for (let dx = 0; dx <= W * .42; dx += step) {
            const d = Math.hypot(dx, dy);
            if (d >= bd) break;
            const cx = cx0 + dir * dx, b = Math.min(H, b0 - dy), box = {left: cx - w / 2, right: cx + w / 2, top: b - h, bottom: b};
            if (box.left < 0 || box.right > W || box.top < 0 || hits(box, obs) || hits(box, placed)) continue;
            bd = d; best = {cx, b, s, box};
            break;
          }
        }
        if (best) break;
      }
      if (!best) { e.classList.add('sl-hide'); return; }
      placed.push(best.box);
      e.style.transform = `translate(${(best.cx - cx0).toFixed(1)}px,${(best.b - b0).toFixed(1)}px) scale(${best.s})`;
    });
  }

  let placeT = 0, placeT2 = 0, mo = null;
  const placeAll = () => { place(); placeFront(); };
  // once soon, and once more after the 3D cabinets have had a moment to take their places
  const placeSoon = () => { clearTimeout(placeT); clearTimeout(placeT2); placeT = setTimeout(placeAll, 120); placeT2 = setTimeout(placeFront, 700); };
  function watch() {
    if (mo || !cur || typeof MutationObserver === 'undefined') return;
    // a view change (the body's v-* / in-select classes, a [hidden] view) or new content (the lobby's cards, the banner)
    mo = new MutationObserver(list => { if (list.some(m => !(m.target.closest && m.target.closest('.slook,.slook-front')))) placeSoon(); });
    mo.observe(document.body, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden']});
    addEventListener('resize', placeSoon);
    addEventListener('scroll', placeSoon, {passive: true});
    // the top bar can change height on its own (a font or a line arriving late, WebKit): the moon follows it
    if (typeof ResizeObserver !== 'undefined') { const bar = document.getElementById('fbar'); if (bar) new ResizeObserver(placeSoon).observe(bar); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeSoon);
  }

  /* ---------- THE BAT ACROSS THE MOON: now and then (every 20–35 s) one bat flies across the moon's disc ----------
     .fly starts its 3 s CSS flight (transforms/opacity only, a slow flap); never with reduced motion or MOTION off
     (there it isn't drawn at all). */
  let batT = 0;
  function batLater() {
    clearTimeout(batT);
    if (!cur || !document.querySelector('.sl-mbat')) return;
    batT = setTimeout(batPass, 20000 + Math.random() * 15000);
  }
  function batPass() {
    const bats = document.querySelectorAll('.sl-mbat');
    if (!bats.length) return;
    if (!still() && !document.hidden) {
      bats.forEach(b => { b.classList.remove('fly'); void b.offsetWidth; b.classList.add('fly'); });
      setTimeout(() => bats.forEach(b => b.classList.remove('fly')), 3300);
    }
    batLater();
  }

  /** the 3D room's colors for the look (token names), or null for the normal arcade */
  function palette() { return cur && LOOKS[cur] ? LOOKS[cur].palette : null; }
  function state() {
    const L = info();
    return {look: cur, id: L && L.id, kind: L && L.kind, on: A.Seasons ? A.Seasons.lookOn() : null, still: document.documentElement.classList.contains('slook-still'),
      hosts: [...document.querySelectorAll('.slook')].map(h => h.parentElement.id || h.parentElement.tagName.toLowerCase()),
      fronts: [...document.querySelectorAll('.slook-front')].map(h => h.parentElement.id || h.parentElement.tagName.toLowerCase())};
  }
  A.SeasonLook = {apply, palette, state, LOOKS: Object.keys(LOOKS), sceneHTML, place, placeFront, batPass, front: id => (LOOKS[id] ? LOOKS[id].props : []).filter(p => p[3] && p[3].front).map(p => p[2])};

  addEventListener('arcade:seasonlook', apply);
  if (A.reducedMotion && A.reducedMotion.addEventListener) A.reducedMotion.addEventListener('change', () => document.documentElement.classList.toggle('slook-still', still()));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
})(window.Arcade);
