/* Showtime Malfunction: THE SHOWTIME BAND, the arcade's old animatronic house band, drawn in SVG (original designs).
   Cartoon-creepy machines: worn felt, metal joints and bolts, glowing eyes (red while malfunctioning, friendly blue
   once rebooted: the eye color comes from CSS, .bot.glitch / .bot.fixed). No gore, nobody inside: just machines.
     Arcade.Showtime.botSVG(kind, {label, unit})   kind: 'walrus' | 'owl' | 'gator' | 'raccoon' | 'moose' | 'clone'
     Arcade.Showtime.BAND                           who is who (name, instrument, felt colors: theme.css --anim-* tokens)
   Every drawing is on a 140 × 200 grid, feet at the bottom. Colors are classes styled in style.css. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const BAND = {
    walrus:  {name: 'Tubby Tusk',      plays: 'tuba',   felt: 'anim-walrus',  felt2: 'anim-walrus-2'},
    owl:     {name: 'Professor Hoot',  plays: 'flute',  felt: 'anim-owl',     felt2: 'anim-owl-2'},
    gator:   {name: 'Snapjaw Sal',     plays: 'snare',  felt: 'anim-gator',   felt2: 'anim-gator-2'},
    raccoon: {name: 'Rico Bandit',     plays: 'sax',    felt: 'anim-raccoon', felt2: 'anim-raccoon-2'},
    moose:   {name: 'Maestro Moose',   plays: 'baton',  felt: 'anim-moose',   felt2: 'anim-moose-2'},
    clone:   {name: 'Sal Unit',        plays: 'snare',  felt: 'anim-clone',   felt2: 'anim-gator-2'},
  };

  const bolt = (x, y, r = 2.6) => `<circle class="a-bolt" cx="${x}" cy="${y}" r="${r}"/><path class="a-boltx" d="M${x - r * .6} ${y}h${r * 1.2}"/>`;
  const eyes = (pts, r = 5) => pts.map(([x, y]) => `<circle class="a-eyeglow" cx="${x}" cy="${y}" r="${r * 2.2}"/><circle class="a-eye" cx="${x}" cy="${y}" r="${r}"/><circle class="a-pupil" cx="${x + r * .25}" cy="${y - r * .2}" r="${r * .35}"/>`).join('');
  /* the shared robot frame: rod legs with knee bolts, boots, a felt torso with a worn patch, metal-jointed arms */
  function frame({torso = 'M42 92Q40 80 52 76H88Q100 80 98 92L100 146Q70 156 40 146Z', arms = true} = {}) {
    return `<g class="a-legs"><path class="a-rod" d="M56 146V184M84 146V184"/>${bolt(56, 166)}${bolt(84, 166)}` +
      `<path class="a-boot" d="M44 184h22v10H40q0-10 4-10ZM74 184h22q4 0 4 10H74Z"/></g>` +
      `<path class="a-felt" d="${torso}"/><path class="a-patch" d="M78 118l12 4-3 12-11-3Z"/><path class="a-seam" d="M70 80V150"/>` +
      (arms ? `<path class="a-felt2 arm-l" d="M44 92Q30 104 32 124L40 126Q42 108 50 100Z"/><path class="a-felt2 arm-r" d="M96 92Q110 104 108 124L100 126Q98 108 90 100Z"/>` +
        bolt(46, 95) + bolt(94, 95) : '') +
      `<path class="a-rod" d="M70 76V64"/>${bolt(70, 70, 2.2)}`;
  }
  const HEADS = {
    walrus: () => `<path class="a-felt" d="M36 44Q36 18 70 18Q104 18 104 44Q104 66 70 68Q36 66 36 44Z"/>` +
      `<ellipse class="a-felt2" cx="60" cy="52" rx="13" ry="10"/><ellipse class="a-felt2" cx="80" cy="52" rx="13" ry="10"/>` +
      `<path class="a-tusk" d="M58 58Q56 78 60 88Q64 76 64 60ZM82 58Q84 78 80 88Q76 76 76 60Z"/>` +
      `<path class="a-dark" d="M50 50h1M54 54h1M48 56h1M90 50h1M86 54h1M92 56h1"/><ellipse class="a-nose" cx="70" cy="44" rx="6" ry="4"/>` +
      eyes([[56, 34], [84, 34]], 4.6) + `<path class="a-seam" d="M38 60Q70 72 102 60"/>${bolt(38, 48)}${bolt(102, 48)}`,
    owl: () => `<path class="a-felt" d="M34 24L46 34Q70 26 94 34L106 24L104 50Q104 72 70 72Q36 72 36 50Z"/>` +
      `<path class="a-felt2" d="M44 44Q44 30 58 30Q70 32 70 44Q70 58 58 58Q44 58 44 44ZM70 44Q70 32 82 30Q96 30 96 44Q96 58 82 58Q70 58 70 44Z"/>` +
      eyes([[57, 44], [83, 44]], 6) + `<path class="a-beak" d="M64 54L70 64L76 54Z"/>` +
      `<path class="a-cap" d="M40 20L70 10L100 20L70 28Z"/><path class="a-rod" d="M92 18V30"/><circle class="a-bolt" cx="92" cy="31" r="2.4"/>`,
    gator: (unit) => `<path class="a-felt" d="M34 50Q32 22 62 22Q80 22 84 34H122Q130 36 128 46Q126 52 118 52H84Q80 66 62 66Q36 66 34 50Z"/>` +
      `<path class="a-teeth" d="M86 52l4 6 4-6 4 6 4-6 4 6 4-6 4 6 4-6Z"/><path class="a-felt2" d="M84 56H118Q124 58 122 64Q120 68 112 68H84Z"/>` +
      `<circle class="a-felt" cx="54" cy="26" r="11"/><circle class="a-felt" cx="74" cy="26" r="11"/>` + eyes([[54, 26], [74, 26]], 5) +
      `<circle class="a-dark" cx="120" cy="40" r="1.8"/><circle class="a-dark" cx="114" cy="40" r="1.8"/>` + bolt(84, 54) +
      (unit ? `<rect class="a-tag" x="42" y="44" width="30" height="12" rx="2"/><text class="a-tagtxt" x="57" y="53.5" text-anchor="middle">SAL-${unit}</text>` : ''),
    raccoon: () => `<path class="a-felt" d="M40 24L50 10L60 24Q70 20 80 24L90 10L100 24Q108 36 104 52Q98 70 70 70Q42 70 36 52Q32 36 40 24Z"/>` +
      `<path class="a-mask" d="M40 36Q54 28 70 38Q86 28 100 36L98 48Q84 50 70 44Q56 50 42 48Z"/>` + eyes([[55, 40], [85, 40]], 4.8) +
      `<path class="a-felt2" d="M58 52Q70 46 82 52Q80 64 70 64Q60 64 58 52Z"/><ellipse class="a-nose" cx="70" cy="54" rx="4" ry="3"/>` + bolt(40, 52) + bolt(100, 52),
    moose: () => `<path class="a-antler" d="M42 26Q24 22 18 6M30 22Q26 12 30 4M38 24Q34 12 40 6M98 26Q116 22 122 6M110 22Q114 12 110 4M102 24Q106 12 100 6"/>` +
      `<path class="a-felt" d="M44 34Q44 18 70 18Q96 18 96 34L94 60Q92 72 84 78Q70 86 56 78Q48 72 46 60Z"/>` +
      `<path class="a-felt2" d="M52 58Q70 50 88 58Q88 78 70 80Q52 78 52 58Z"/><ellipse class="a-dark" cx="62" cy="66" rx="3" ry="2"/><ellipse class="a-dark" cx="78" cy="66" rx="3" ry="2"/>` +
      eyes([[58, 38], [82, 38]], 5) + `<path class="a-seam" d="M46 50Q70 44 94 50"/>` + bolt(44, 44) + bolt(96, 44),
  };
  HEADS.clone = HEADS.gator;
  /* what each one holds in front of its torso */
  const HOLDS = {
    tuba: `<path class="a-brass" d="M50 104Q40 116 48 132Q60 146 80 138Q94 130 90 112Q86 100 74 102"/><path class="a-brass-fill" d="M84 108L104 80H118L96 116Z"/><path class="a-rod" d="M62 112v14M68 110v14M74 110v14"/>`,
    flute: `<path class="a-silver" d="M20 106L122 92"/><path class="a-dark" d="M44 102.5h1M56 101h1M68 99.4h1M80 97.8h1"/>`,
    snare: `<path class="a-drum" d="M44 118V138Q70 148 96 138V118Z"/><ellipse class="a-drumhead" cx="70" cy="118" rx="26" ry="7"/><path class="a-dark" d="M52 124v16M70 126v16M88 124v16"/>` +
      `<path class="a-stick" d="M36 122L64 112M104 122L78 110"/>`,
    sax: `<path class="a-brass" d="M88 84Q76 88 76 104V128Q76 142 64 142Q54 142 52 132"/><path class="a-brass-fill" d="M44 132Q46 122 58 126Q60 136 50 140Z"/><path class="a-dark" d="M74 104h4M74 112h4M74 120h4"/>`,
    baton: `<path class="a-coat" d="M42 92L36 150H56L70 110L84 150H104L98 92Z"/><path class="a-bow" d="M60 80L70 86L80 80V92L70 86L60 92Z"/>` +
      `<path class="a-felt2 arm-r" d="M96 92Q112 84 116 64L108 60Q104 78 90 86Z"/><path class="a-stick" d="M112 62L128 30"/>${bolt(94, 95)}`,
  };
  /** one animatronic as an SVG string. unit = a clone's number */
  function botSVG(kind, {label = '', unit = null} = {}) {
    const b = BAND[kind] || BAND.gator;
    const style = `--felt:var(--${b.felt});--felt2:var(--${b.felt2})`;
    const body = kind === 'moose' ? frame({torso: 'M42 92Q40 80 52 76H88Q100 80 98 92L100 146Q70 156 40 146Z', arms: false}) : frame();
    return `<svg class="bot-svg" viewBox="0 0 140 200" style="${style}" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'} overflow="visible">` +
      `<g class="bot-body">${body}${HOLDS[b.plays] || ''}</g><g class="bot-head">${HEADS[kind] ? HEADS[kind](unit) : ''}</g>` +
      `<path class="a-spark" d="M96 70l6-8-2 7 7-4-6 9"/></svg>`;
  }
  A.Showtime = Object.assign(A.Showtime || {}, {BAND, botSVG});
})(window.Arcade);
