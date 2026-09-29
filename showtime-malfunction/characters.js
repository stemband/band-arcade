/* Showtime Malfunction: THE SHOWTIME BAND, the arcade's old animatronic house band, drawn in SVG (original designs).
   Cartoon-creepy machines: worn felt, metal joints and bolts, glowing eyes (red while malfunctioning, friendly blue
   once rebooted: the eye color comes from CSS, .bot.glitch / .bot.fixed). No gore, nobody inside: just machines.
     Arcade.Showtime.botSVG(kind, {label, plates})   kind: 'walrus' | 'owl' | 'gator' | 'raccoon' | 'moose',
       or a SPECIAL MACHINE: 'turbo-tin' | 'tuba-tank' | 'long-tone-lurker' | 'duet-dolls' | 'glitch-jester' |
       'split-sprocket' (+ 'sprocket-mini', its two halves) | 'blackout-bot' | 'oil-can-ollie' (levels.js SHOWTIME_SPECIALS)
       plates: Tuba Tank's armor plates (.a-plate, data-i 0…n-1; game.js pops them off with .popped)
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
    // the SPECIAL MACHINES (levels.js SHOWTIME_SPECIALS): original designs, same worn-felt-and-bolts style
    'turbo-tin':        {name: 'Turbo Tin',        plays: 'horn',    felt: 'anim-tin',      felt2: 'anim-tin-2',      special: true},
    'tuba-tank':        {name: 'Tuba Tank',        plays: 'tuba',    felt: 'anim-tank',     felt2: 'anim-tank-2',     special: true},
    'long-tone-lurker': {name: 'Long Tone Lurker', plays: 'bassoon', felt: 'anim-lurker',   felt2: 'anim-lurker-2',   special: true},
    'duet-dolls':       {name: 'Duet Dolls',       plays: null,      felt: 'anim-doll',     felt2: 'anim-doll-2',     special: true},
    'glitch-jester':    {name: 'Glitch Jester',    plays: 'clarinet', felt: 'anim-jester',  felt2: 'anim-jester-2',   special: true},
    'split-sprocket':   {name: 'Split Sprocket',   plays: 'bells',   felt: 'anim-sprocket', felt2: 'anim-sprocket-2', special: true},
    'sprocket-mini':    {name: 'Sprocket Mini',    plays: null,      felt: 'anim-sprocket', felt2: 'anim-sprocket-2'},
    'blackout-bot':     {name: 'Blackout Bot',     plays: 'lantern', felt: 'anim-blackout', felt2: 'anim-blackout-2', special: true},
    'oil-can-ollie':    {name: 'Oil Can Ollie',    plays: 'oilcan',  felt: 'anim-ollie',    felt2: 'anim-ollie-2',    special: true},
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
    gator: () => `<path class="a-felt" d="M34 50Q32 22 62 22Q80 22 84 34H122Q130 36 128 46Q126 52 118 52H84Q80 66 62 66Q36 66 34 50Z"/>` +
      `<path class="a-teeth" d="M86 52l4 6 4-6 4 6 4-6 4 6 4-6 4 6 4-6Z"/><path class="a-felt2" d="M84 56H118Q124 58 122 64Q120 68 112 68H84Z"/>` +
      `<circle class="a-felt" cx="54" cy="26" r="11"/><circle class="a-felt" cx="74" cy="26" r="11"/>` + eyes([[54, 26], [74, 26]], 5) +
      `<circle class="a-dark" cx="120" cy="40" r="1.8"/><circle class="a-dark" cx="114" cy="40" r="1.8"/>` + bolt(84, 54),
    raccoon: () => `<path class="a-felt" d="M40 24L50 10L60 24Q70 20 80 24L90 10L100 24Q108 36 104 52Q98 70 70 70Q42 70 36 52Q32 36 40 24Z"/>` +
      `<path class="a-mask" d="M40 36Q54 28 70 38Q86 28 100 36L98 48Q84 50 70 44Q56 50 42 48Z"/>` + eyes([[55, 40], [85, 40]], 4.8) +
      `<path class="a-felt2" d="M58 52Q70 46 82 52Q80 64 70 64Q60 64 58 52Z"/><ellipse class="a-nose" cx="70" cy="54" rx="4" ry="3"/>` + bolt(40, 52) + bolt(100, 52),
    moose: () => `<path class="a-antler" d="M42 26Q24 22 18 6M30 22Q26 12 30 4M38 24Q34 12 40 6M98 26Q116 22 122 6M110 22Q114 12 110 4M102 24Q106 12 100 6"/>` +
      `<path class="a-felt" d="M44 34Q44 18 70 18Q96 18 96 34L94 60Q92 72 84 78Q70 86 56 78Q48 72 46 60Z"/>` +
      `<path class="a-felt2" d="M52 58Q70 50 88 58Q88 78 70 80Q52 78 52 58Z"/><ellipse class="a-dark" cx="62" cy="66" rx="3" ry="2"/><ellipse class="a-dark" cx="78" cy="66" rx="3" ry="2"/>` +
      eyes([[58, 38], [82, 38]], 5) + `<path class="a-seam" d="M46 50Q70 44 94 50"/>` + bolt(44, 44) + bolt(96, 44),
  };
  Object.assign(HEADS, {
    // a tin can with a racing visor, a lightning stripe and a stubby antenna
    'turbo-tin': () => `<path class="a-felt" d="M44 22H96Q100 22 100 26V62Q100 66 96 66H44Q40 66 40 62V26Q40 22 44 22Z"/>` +
      `<path class="a-seam" d="M40 32H100M40 56H100"/><path class="a-felt2" d="M46 36H94V50H46Z"/>` + eyes([[60, 43], [80, 43]], 4.4) +
      `<path class="a-felt2" d="M96 24L84 44H92L80 64L104 38H96L104 24Z"/><path class="a-rod" d="M56 22V10"/><circle class="a-bolt" cx="56" cy="9" r="3"/>` + bolt(44, 61) + bolt(96, 61),
    // a riveted tank helmet with a narrow slit and a little turret on top
    'tuba-tank': () => `<path class="a-felt" d="M32 46Q32 18 70 18Q108 18 108 46V64H32Z"/><path class="a-felt2" d="M58 8H82V20H58Z"/><path class="a-rod" d="M82 13H100"/>` +
      `<path class="a-dark" d="M42 40H98" style="stroke-width:12;opacity:.85"/>` + eyes([[58, 40], [82, 40]], 4) +
      bolt(38, 58) + bolt(52, 60) + bolt(70, 60) + bolt(88, 60) + bolt(102, 58),
    // a long-necked wading bird on a telescoping neck, with one half-closed eye lid
    'long-tone-lurker': () => `<path class="a-rod" d="M70 76V40"/>${bolt(70, 58, 2.2)}` +
      `<path class="a-felt" d="M50 30Q50 10 70 10Q90 10 90 30Q90 44 70 44Q50 44 50 30Z"/><path class="a-beak" d="M88 28L130 34L88 38Z"/>` +
      `<path class="a-felt2" d="M52 16Q60 2 72 8Q64 10 58 20Z"/>` + eyes([[62, 26], [78, 26]], 4.2) + `<path class="a-dark" d="M56 21H68M72 21H84"/>`,
    // a gear for a head: the teeth turn a little when it twitches
    'split-sprocket': () => `<g class="a-gear"><path class="a-felt2" d="${gear(70, 40, 30, 23, 10)}"/></g><circle class="a-felt" cx="70" cy="40" r="19"/>` +
      eyes([[62, 38], [78, 38]], 4.4) + `<path class="a-seam" d="M70 21V59"/>` + bolt(70, 52, 2.4),
    'sprocket-mini': () => `<g class="a-gear"><path class="a-felt2" d="${gear(70, 40, 30, 23, 8)}"/></g><circle class="a-felt" cx="70" cy="40" r="19"/>` +
      eyes([[70, 38]], 6) + `<path class="a-seam" d="M52 48H88"/>`,
    // a desk-lamp head with a deep shade: its eyes glow out of the dark under it
    'blackout-bot': () => `<path class="a-rod" d="M70 76L60 60L74 44"/>${bolt(60, 60, 2.4)}` +
      `<path class="a-felt" d="M42 36L60 8H88L106 36Z"/><path class="a-dark" d="M44 36H104Q100 50 74 50Q48 50 44 36Z"/>` + eyes([[62, 42], [86, 42]], 3.6) + bolt(74, 9, 2.2),
    // an oil can with a long spout for a nose and a thumb-pump cap
    'oil-can-ollie': () => `<path class="a-felt" d="M42 30Q42 20 52 20H88Q98 20 98 30V60Q98 68 88 68H52Q42 68 42 60Z"/>` +
      `<path class="a-felt2" d="M56 20Q56 8 70 8Q84 8 84 20Z"/><path class="a-rod" d="M70 8V2"/>` +
      `<path class="a-felt2" d="M96 44L126 26L128 30L98 52Z"/><path class="a-oil" d="M127 32Q124 38 127 41Q130 38 127 32Z"/>` +
      eyes([[58, 38], [80, 38]], 4.6) + `<path class="a-seam" d="M42 52H98"/>` + bolt(48, 62) + bolt(92, 62),
    // a two-point jester's hood with little bells (unpitched: they never ring), and a crooked grin
    'glitch-jester': () => `<path class="a-felt2" d="M40 34Q30 10 12 14Q28 22 34 40ZM100 34Q110 10 128 14Q112 22 106 40Z"/>` +
      `<circle class="a-brass-fill" cx="12" cy="14" r="5"/><circle class="a-brass-fill" cx="128" cy="14" r="5"/>` +
      `<path class="a-felt" d="M36 36Q38 18 70 18Q102 18 104 36Q106 68 70 70Q34 68 36 36Z"/><path class="a-felt2" d="M36 36Q70 24 104 36Q70 30 36 36Z"/>` +
      eyes([[56, 44], [84, 42]], 4.8) + `<path class="a-dark" d="M54 58Q70 66 88 56"/><path class="a-seam" d="M70 20V70"/>`,
  });
  /** a cog outline: n teeth, outer radius R, inner r */
  function gear(cx, cy, R, r, n) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const a0 = (i / (n * 2)) * Math.PI * 2, a1 = ((i + 1) / (n * 2)) * Math.PI * 2, rad = i % 2 ? r : R;
      const p = a => `${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`;
      d += (i ? 'L' : 'M') + p(a0) + 'L' + p(a1);
    }
    return d + 'Z';
  }
  /* the Duet Dolls: two small wind-up dolls, button eyes, cheek dots, a big key between them (their own drawing, no
     shared frame). .doll-a / .doll-b: game.js lights the one whose note comes next (.duet-a / .duet-b on the bot) */
  function dolls() {
    const doll = (x, cls, felt) => `<g class="doll ${cls}" style="--felt:var(--${felt})">` +
      `<path class="a-rod" d="M${x - 8} 150V186M${x + 8} 150V186"/><path class="a-boot" d="M${x - 16} 184h14v8H${x - 18}ZM${x + 2} 184h14q2 0 2 8H${x + 2}Z"/>` +
      `<path class="a-felt" d="M${x - 20} 150L${x - 12} 108H${x + 12}L${x + 20} 150Q${x} 158 ${x - 20} 150Z"/><path class="a-seam" d="M${x - 16} 138H${x + 16}"/>` +
      `<circle class="a-felt2" cx="${x}" cy="90" r="20"/><path class="a-felt" d="M${x - 22} 84Q${x - 20} 64 ${x} 66Q${x + 20} 64 ${x + 22} 84Q${x} 74 ${x - 22} 84Z"/>` +
      eyes([[x - 8, 90], [x + 8, 90]], 3.6) + `<circle class="a-cheek" cx="${x - 12}" cy="99" r="3"/><circle class="a-cheek" cx="${x + 12}" cy="99" r="3"/>` +
      `<path class="a-dark" d="M${x - 4} 102h8"/>${bolt(x, 120, 2.2)}</g>`;
    return `<path class="a-rod" d="M48 124H92"/><path class="a-brass-fill" d="M62 112Q70 104 78 112L74 124H66Z"/>` +
      doll(36, 'doll-a', 'anim-doll') + doll(104, 'doll-b', 'anim-doll-b');
  }
  /* what each one holds in front of its torso */
  const HOLDS = {
    tuba: `<path class="a-brass" d="M50 104Q40 116 48 132Q60 146 80 138Q94 130 90 112Q86 100 74 102"/><path class="a-brass-fill" d="M84 108L104 80H118L96 116Z"/><path class="a-rod" d="M62 112v14M68 110v14M74 110v14"/>`,
    flute: `<path class="a-silver" d="M20 106L122 92"/><path class="a-dark" d="M44 102.5h1M56 101h1M68 99.4h1M80 97.8h1"/>`,
    snare: `<path class="a-drum" d="M44 118V138Q70 148 96 138V118Z"/><ellipse class="a-drumhead" cx="70" cy="118" rx="26" ry="7"/><path class="a-dark" d="M52 124v16M70 126v16M88 124v16"/>` +
      `<path class="a-stick" d="M36 122L64 112M104 122L78 110"/>`,
    sax: `<path class="a-brass" d="M88 84Q76 88 76 104V128Q76 142 64 142Q54 142 52 132"/><path class="a-brass-fill" d="M44 132Q46 122 58 126Q60 136 50 140Z"/><path class="a-dark" d="M74 104h4M74 112h4M74 120h4"/>`,
    horn: `<path class="a-brass" d="M46 112H88Q98 112 98 102"/><path class="a-brass-fill" d="M92 100L112 88V116L92 104Z"/><path class="a-rod" d="M60 112v-8M68 112v-8M76 112v-8"/>`,
    bassoon: `<path class="a-felt2" d="M84 70L94 150H104L94 70Z"/><path class="a-silver" d="M86 76Q76 70 70 80"/><path class="a-dark" d="M90 100h6M92 112h6M93 124h6"/>`,
    clarinet: `<path class="a-dark" d="M66 84L60 146" style="stroke-width:8"/><path class="a-silver" d="M58 144Q60 152 66 150" /><path class="a-bolt" d="M60 104h6M59 114h6M58 124h6"/>`,
    bells: `<path class="a-brass-fill" d="M46 112H94V122H46Z"/><path class="a-dark" d="M54 112v10M62 112v10M70 112v10M78 112v10M86 112v10"/><path class="a-stick" d="M40 100L56 110M100 100L84 110"/>`,
    lantern: `<path class="a-rod" d="M96 96V110"/><path class="a-felt2" d="M86 110H106L102 132H90Z"/><path class="a-dark" d="M90 118H102"/>`,
    oilcan: `<path class="a-felt2" d="M84 112Q84 104 94 104H104Q112 104 112 112V132H84Z"/><path class="a-silver" d="M110 112L128 100"/><path class="a-oil" d="M129 104Q126 110 129 113Q132 110 129 104Z"/>`,
    baton: `<path class="a-coat" d="M42 92L36 150H56L70 110L84 150H104L98 92Z"/><path class="a-bow" d="M60 80L70 86L80 80V92L70 86L60 92Z"/>` +
      `<path class="a-felt2 arm-r" d="M96 92Q112 84 116 64L108 60Q104 78 90 86Z"/><path class="a-stick" d="M112 62L128 30"/>${bolt(94, 95)}`,
  };
  /** Tuba Tank's armor: n plates over the torso and arms (a 2 × 4 grid, filled in order) */
  function plates(n) {
    const spots = [[46, 96], [74, 96], [46, 116], [74, 116], [46, 134], [74, 134], [28, 104], [100, 104]];
    return spots.slice(0, n).map(([x, y], i) => `<g class="a-plate" data-i="${i}"><rect x="${x}" y="${y}" width="${i > 5 ? 12 : 22}" height="${i > 5 ? 18 : 16}" rx="2"/>` +
      `<circle cx="${x + 3}" cy="${y + 3}" r="1.3"/><circle cx="${x + (i > 5 ? 9 : 19)}" cy="${y + 3}" r="1.3"/></g>`).join('');
  }
  /** one animatronic as an SVG string */
  function botSVG(kind, {label = '', plates: nPlates = 0} = {}) {
    const b = BAND[kind] || BAND.gator;
    const style = `--felt:var(--${b.felt});--felt2:var(--${b.felt2})`;
    const aria = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
    if (kind === 'duet-dolls') return `<svg class="bot-svg" viewBox="0 0 140 200" style="${style}" ${aria} overflow="visible"><g class="bot-body bot-head">${dolls()}</g>` +
      `<path class="a-spark" d="M96 70l6-8-2 7 7-4-6 9"/></svg>`;
    const body = kind === 'moose' ? frame({torso: 'M42 92Q40 80 52 76H88Q100 80 98 92L100 146Q70 156 40 146Z', arms: false})
      : kind === 'tuba-tank' ? frame({torso: 'M34 94Q32 78 50 74H90Q108 78 106 94L108 148Q70 160 32 148Z'})
      : kind === 'long-tone-lurker' ? frame({torso: 'M48 92Q46 80 56 76H84Q94 80 92 92L94 146Q70 154 46 146Z'})
      : frame();
    return `<svg class="bot-svg" viewBox="0 0 140 200" style="${style}" ${aria} overflow="visible">` +
      `<g class="bot-body">${body}${HOLDS[b.plays] || ''}${nPlates ? plates(nPlates) : ''}</g><g class="bot-head">${HEADS[kind] ? HEADS[kind]() : ''}</g>` +
      `<path class="a-spark" d="M96 70l6-8-2 7 7-4-6 9"/></svg>`;
  }
  /** the special machines' ids, in the Malfunction Files' order */
  const SPECIAL_IDS = Object.keys(BAND).filter(k => BAND[k].special);
  A.Showtime = Object.assign(A.Showtime || {}, {BAND, botSVG, SPECIAL_IDS});
})(window.Arcade);
