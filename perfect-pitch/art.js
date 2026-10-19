/* PERFECT PITCH: THE PICTURES (Arcade.PP2Art; docs/games/perfect-pitch.md). Each instrument's TUNING AREA, large and
   seen from the side, as an SVG (a 1000 × 400 sheet, each cropped to its own `vb`; colors: the --p2-* tokens in shared/theme.css). Generic shapes
   only: no brand names or logos.
     THE MOVING PART (`#mech`, game.js translates it): the headjoint, the barrel, the neck, the mouthpiece or the
       tuning slide's U. It is drawn where it sits PUSHED ALL THE WAY IN; a pull of d mm (from the middle, + = out)
       moves it shift(d) = outDir × (d + travel) × span / (2 × travel) units.
     THE EXPOSED PART (lighter metal, or cork): drawn under the moving part, so the more it is pulled out the more of it
       shows. "Pulled out" is visible at a glance.
     THE SILHOUETTE: a small whole instrument in a top corner with a dot where the tuning area is.
   Each art: {outDir: -1 (out = left) | 1 (out = right), span (units for the whole travel), vb: [top, height] (the
   drawing's crop of the 1000-wide sheet), sil + silAt ('l' | 'r': the silhouette's corner), body(), mech(), under(),
   over(): SVG strings}. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const W = 1000, H = 400, CY = 230;

  /* ---------- the parts ---------- */
  const rect = (cls, x, y, w, h, rx = 0) => `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
  const tubeH = (cls, x0, x1, y, w) => rect(cls, Math.min(x0, x1), y - w / 2, Math.abs(x1 - x0), w);
  const shine = (x0, x1, y) => `<path class="p2-shine" d="M${x0} ${y}H${x1}"/>`;
  /* A U-SHAPED TUNING SLIDE (the brass): the fixed tubes end at x0 (their ferrules); the slide's two sleeves start
     there and run `len` the way it pulls out (dir), joined by the crook; the exposed inner tubes are under them */
  function uSlide({dir, x0, y1, y2, w, len, span}) {
    const r = (y2 - y1) / 2, xe = x0 + dir * len, sw = w + 6;
    const under = tubeH('p2-exp', x0, x0 + dir * (span + 30), y1, w - 4) + tubeH('p2-exp', x0, x0 + dir * (span + 30), y2, w - 4);
    const crook = `<path class="p2-tube-brass" style="stroke-width:${sw}" d="M${xe} ${y1}A${r} ${r} 0 0 ${dir > 0 ? 1 : 0} ${xe} ${y2}"/>`;
    const mech = tubeH('p2-brass', x0, xe, y1, sw) + tubeH('p2-brass', x0, xe, y2, sw) + crook +
      shine(x0 + dir * 10, xe, y1 - sw / 4) + shine(x0 + dir * 10, xe, y2 - sw / 4) +
      rect('p2-brace', Math.min(x0, xe) + len * .45, y1, 14, y2 - y1, 3) +
      `<circle class="p2-key" cx="${xe + dir * (r * .7)}" cy="${y2 - 4}" r="${Math.max(6, w * .3)}"/>` +                // the water key
      rect('p2-ring', Math.min(x0, x0 + dir * 16), y1 - sw / 2 - 3, 16, sw + 6, 3) + rect('p2-ring', Math.min(x0, x0 + dir * 16), y2 - sw / 2 - 3, 16, sw + 6, 3);
    const over = rect('p2-ring', x0 - (dir > 0 ? 14 : 0), y1 - w / 2 - 5, 14, w + 10, 3) + rect('p2-ring', x0 - (dir > 0 ? 14 : 0), y2 - w / 2 - 5, 14, w + 10, 3);
    return {under, mech, over, hit: [Math.min(x0, xe) - (dir < 0 ? r + 20 : 0), y1 - 50, len + r + 40, y2 - y1 + 100]};
  }
  /* the valves (a row of upright cylinders with finger buttons) */
  const valves = (x, y, n, gap, h, w = 34) => Array.from({length: n}, (_, i) => {
    const cx = x + i * gap;
    return rect('p2-brass', cx - w / 2, y, w, h, 6) + rect('p2-ring', cx - w / 2 - 3, y - 6, w + 6, 10, 3) + rect('p2-ring', cx - w / 2 - 3, y + h - 4, w + 6, 10, 3) +
      rect('p2-metal', cx - 5, y - 40, 10, 36, 3) + `<ellipse class="p2-btn" cx="${cx}" cy="${y - 42}" rx="16" ry="6"/>`;
  }).join('');

  /* ---------- THE SILHOUETTES: a whole instrument, small, a dot on the tuning area ---------- */
  const silG = (d, dot) => `<rect class="p2-silbox" width="120" height="104" rx="12"/><path class="p2-sil" d="${d}"/><circle class="p2-sil-dot" cx="${dot[0]}" cy="${dot[1]}" r="7"/>`;
  const sil = (d, dot, right, y0) => `<g class="p2-silwrap" transform="translate(${right ? W - 104 : 8} ${y0 + 8}) scale(.8)">${silG(d, dot)}</g>`;
  const SIL = {
    flute: ['M10 54H112M30 48V60M60 50V58M74 50V58M88 50V58M18 50Q22 44 26 50', [40, 54]],
    clarinet: ['M60 10V86M54 86Q60 98 66 86M56 10H64M52 28H68M54 52H66M54 64H66', [60, 26]],
    basscl: ['M44 18Q58 6 66 18V78Q66 94 54 96Q46 92 50 84M60 30V70', [64, 22]],
    sax: ['M44 12Q60 12 62 24V70Q62 92 82 92Q94 90 92 72V60M56 40H68M56 54H68', [46, 12]],
    trumpet: ['M8 52H86L112 38V70L86 56H8M36 46V36M48 46V36M60 46V36M30 56Q30 74 48 74H62Q70 74 70 56', [44, 74]],
    horn: ['M60 52m-32 0a32 32 0 1 0 64 0a32 32 0 1 0-64 0M88 64L106 86L112 70M50 30V22M60 30V22M70 30V22', [30, 52]],
    trombone: ['M18 40H70L104 26V58L70 46H18M18 40Q6 48 18 56H96M24 62H100', [12, 48]],
    euph: ['M48 92V40Q48 14 70 12L82 6V26L72 22Q62 26 62 40V92Q55 100 48 92M36 50H48M36 60H48M36 70H48M48 82H30Q20 82 22 70', [24, 76]],
    tuba: ['M40 96V34Q40 10 64 8L74 2V24Q58 22 58 36V96Q49 104 40 96M28 50H40M28 60H40M28 70H40M40 84H20Q10 84 12 70', [14, 76]],
  };

  /* ---------- THE ARTS ---------- */
  const ART = {
    /* FLUTE: the headjoint's crown and lip plate (moving, left) slides into the body's tenon (fixed, right) */
    flute: {outDir: -1, span: 110, vb: [100, 220], silAt: 'r', body() {
      return tubeH('p2-metal', 560, 1000, CY, 40) + shine(570, 990, CY - 10) +
        [690, 770, 850, 930].map(x => `<circle class="p2-key" cx="${x}" cy="${CY - 20}" r="17"/><circle class="p2-keyhole" cx="${x}" cy="${CY - 20}" r="5"/>`).join('') +
        rect('p2-ring', 560, CY - 23, 12, 46, 3);
    }, under() { return tubeH('p2-exp', 430, 560, CY, 34); },
    mech() {
      return tubeH('p2-metal', 70, 560, CY, 40) + shine(80, 550, CY - 10) +
        rect('p2-ring', 548, CY - 23, 12, 46, 3) + rect('p2-metal', 40, CY - 24, 36, 48, 8) + `<circle class="p2-ring" cx="40" cy="${CY}" r="14"/>` +   // the crown
        `<path class="p2-plate" d="M200 ${CY - 18}Q250 ${CY - 52} 300 ${CY - 18}Z"/><ellipse class="p2-keyhole" cx="250" cy="${CY - 26}" rx="16" ry="7"/>`;
    }, hit: [20, CY - 70, 560, 140], sil: 'flute'},

    /* CLARINET: the mouthpiece and the barrel (moving, left) on the upper joint's cork tenon (fixed, right) */
    clarinet: {outDir: -1, span: 110, vb: [100, 230], silAt: 'r', body() {
      return tubeH('p2-wood', 612, 1000, CY, 52) + rect('p2-ring', 600, CY - 30, 14, 60, 3) +
        [720, 800, 880].map(x => `<circle class="p2-keyhole" cx="${x}" cy="${CY - 6}" r="9"/>`).join('') +
        `<path class="p2-rod" d="M680 ${CY - 30}H960"/>` + [700, 840, 940].map(x => rect('p2-metal', x, CY - 38, 26, 10, 4)).join('');
    }, under() { return tubeH('p2-cork', 470, 600, CY, 40) + [490, 520, 550, 580].map(x => `<path class="p2-cork-line" d="M${x} ${CY - 18}V${CY + 18}"/>`).join(''); },
    mech() {
      return `<path class="p2-wood" d="M384 ${CY - 30}Q490 ${CY - 36} 600 ${CY - 30}V${CY + 30}Q490 ${CY + 36} 384 ${CY + 30}Z"/>` +        // the barrel
        rect('p2-ring', 380, CY - 32, 14, 64, 3) + rect('p2-ring', 588, CY - 32, 14, 64, 3) +
        `<path class="p2-wood" d="M120 ${CY - 6}L300 ${CY - 24}H384V${CY + 24}H300L120 ${CY + 12}Z"/>` +                                       // the mouthpiece
        `<path class="p2-reed" d="M110 ${CY + 10}L300 ${CY + 26}H330V${CY + 32}H290L106 ${CY + 16}Z"/>` +
        rect('p2-metal', 250, CY - 30, 48, 62, 6) + `<circle class="p2-ring" cx="274" cy="${CY + 36}" r="6"/>`;                                // the ligature
    }, hit: [90, CY - 70, 520, 140], sil: 'clarinet'},

    /* BASS CLARINET: the metal neck (moving, left), its curve up to the mouthpiece, slides into the body (fixed, right);
       pulled out, more of the neck's unpolished tenon shows */
    basscl: {outDir: -1, span: 110, vb: [0, 330], silAt: 'r', body() {
      return tubeH('p2-wood', 620, 1000, CY, 72) + rect('p2-ring', 614, CY - 40, 18, 80, 4) + `<path class="p2-rod" d="M680 ${CY - 42}H960"/>` +
        [720, 820, 920].map(x => `<circle class="p2-keyhole" cx="${x}" cy="${CY - 8}" r="11"/>`).join('');
    }, under() { return ''; },
    mech() {
      return tubeH('p2-exp', 620, 760, CY, 26) +
        `<path class="p2-tube-metal" d="M630 ${CY}H400Q330 ${CY} 300 ${CY - 60}L250 ${CY - 120}"/>` + shine(420, 620, CY - 6) +
        `<path class="p2-wood" d="M262 ${CY - 112}L176 ${CY - 196}L196 ${CY - 214}L282 ${CY - 132}Z"/>` +
        `<path class="p2-reed" d="M166 ${CY - 186}L240 ${CY - 112}L232 ${CY - 104}L160 ${CY - 178}Z"/>` +
        `<path class="p2-metal" d="M206 ${CY - 178}l22 -22l20 20l-22 22Z"/>` + rect('p2-ring', 604, CY - 20, 16, 40, 3);
    }, hit: [150, CY - 230, 500, 290], sil: 'basscl'},

    /* SAXOPHONES: the mouthpiece and ligature (moving, left) on the neck cork (fixed, right); pushing in covers more cork */
    sax: {outDir: -1, span: 110, vb: [100, 300], silAt: 'r', body() {
      return `<path class="p2-tube-brass-n" d="M470 ${CY}H760Q880 ${CY} 940 ${CY + 110}"/>` + shine(480, 760, CY - 8) +
        rect('p2-ring', 462, CY - 20, 14, 40, 3) + `<path class="p2-rod" d="M600 ${CY - 26}H760"/>` + rect('p2-metal', 640, CY - 34, 30, 12, 4);
    }, under() { return tubeH('p2-cork', 330, 466, CY, 34) + [350, 380, 410, 440].map(x => `<path class="p2-cork-line" d="M${x} ${CY - 15}V${CY + 15}"/>`).join(''); },
    mech() {
      return `<path class="p2-rubber" d="M80 ${CY - 4}L220 ${CY - 36}H460V${CY + 36}H220L80 ${CY + 14}Z"/>` +
        `<path class="p2-reed" d="M70 ${CY + 12}L220 ${CY + 38}H300V${CY + 44}H210L66 ${CY + 18}Z"/>` +
        rect('p2-metal', 250, CY - 42, 70, 90, 8) + `<circle class="p2-ring" cx="270" cy="${CY + 54}" r="7"/><circle class="p2-ring" cx="300" cy="${CY + 54}" r="7"/>` +
        rect('p2-ring', 446, CY - 38, 14, 76, 3);
    }, hit: [50, CY - 70, 430, 140], sil: 'sax'},

    /* TRUMPET: the main tuning slide's U (moving, right) off the lead pipe and the valve casing (fixed, left) */
    trumpet: Object.assign(brassArt({dir: 1, x0: 500, y1: CY - 40, y2: CY + 40, w: 22, len: 250, span: 150}), {sil: 'trumpet', vb: [80, 300], silAt: 'r', bodyX() {
      return `<path class="p2-tube-brass-n" d="M500 ${CY - 40}H120L40 ${CY - 70}"/>` + valves(170, CY - 56, 3, 70, 120) +
        `<path class="p2-tube-brass-n" d="M500 ${CY + 40}H330"/>`;
    }}),
    /* HORN: the main tuning slide's U (moving, right) off the coiled tubing (fixed, left) */
    horn: Object.assign(brassArt({dir: 1, x0: 520, y1: CY - 44, y2: CY + 44, w: 22, len: 250, span: 150}), {sil: 'horn', vb: [20, 380], silAt: 'l', bodyX() {
      return `<path class="p2-tube-brass-n" d="M520 ${CY - 44}H260Q150 ${CY - 44} 150 ${CY + 30}Q150 ${CY + 106} 250 ${CY + 106}H420"/>` +
        `<path class="p2-tube-brass-n" d="M520 ${CY + 44}H300Q210 ${CY + 44} 210 ${CY + 10}"/>` + valves(300, CY - 150, 3, 60, 70, 28);
    }}),
    /* TROMBONE: the tuning slide in the BELL SECTION (moving, left): its crook joins the bell tube (top, flaring into
       the bell) and the back tube (bottom, to the slide lock) */
    trombone: Object.assign(brassArt({dir: -1, x0: 420, y1: CY - 50, y2: CY + 50, w: 24, len: 220, span: 140}), {sil: 'trombone', vb: [40, 320], silAt: 'l', bodyX() {
      return `<path class="p2-tube-brass-n" d="M420 ${CY + 50}H990"/>` +
        `<path class="p2-bell" d="M420 ${CY - 62}H640C760 ${CY - 62} 860 ${CY - 90} 960 ${CY - 170}V${CY + 10}C860 ${CY - 40} 760 ${CY - 38} 640 ${CY - 38}H420Z"/>` +
        `<ellipse class="p2-rim" cx="960" cy="${CY - 80}" rx="12" ry="90"/>` + rect('p2-brace', 600, CY - 40, 14, 90, 3) + rect('p2-ring', 960, CY + 34, 24, 32, 4);
    }}),
    /* EUPHONIUM / BARITONE: the main tuning slide's U (moving, right) off the valve block (fixed, left) */
    euph: Object.assign(brassArt({dir: 1, x0: 500, y1: CY - 50, y2: CY + 50, w: 32, len: 240, span: 150}), {sil: 'euph', vb: [60, 340], silAt: 'l', bodyX() {
      return valves(150, CY - 110, 3, 80, 190, 44) + `<path class="p2-tube-brass-n" d="M500 ${CY - 50}H330M500 ${CY + 50}H330"/>`;
    }}),
    /* TUBA: the main tuning slide's U (moving, right) off the valve block (fixed, left); big tubes */
    tuba: Object.assign(brassArt({dir: 1, x0: 520, y1: CY - 58, y2: CY + 58, w: 42, len: 230, span: 150}), {sil: 'tuba', vb: [50, 350], silAt: 'l', bodyX() {
      return valves(140, CY - 120, 4, 74, 210, 48) + `<path class="p2-tube-brass-n p2-fat" d="M520 ${CY - 58}H380M520 ${CY + 58}H380"/>`;
    }}),
  };
  function brassArt(o) {
    const u = uSlide(o);
    return {outDir: o.dir, span: o.span, body() { return this.bodyX(); }, under: () => u.under, mech: () => u.mech, over: () => u.over, hit: u.hit};
  }

  /** the pull's shift on the drawing (units): + = right */
  const shift = (art, d, travel) => art.outDir * (d + travel) * art.span / (2 * travel);
  /** the whole drawing: {mini} = no ids, no labels (level cards, intros, results) */
  function svg(artId, {mini = false, label = ''} = {}) {
    const a = ART[artId], [sd, dot] = SIL[a.sil], [y0, h] = a.vb;
    const outLeft = a.outDir < 0;
    let s = `<svg class="p2-art${mini ? ' p2-mini' : ''}" viewBox="0 ${y0} ${W} ${mini ? h - 40 : h}" ${mini ? 'aria-hidden="true"' : `role="img" aria-label="${label}"`}>`;
    s += `<g class="p2-under">${a.under()}</g>`;
    s += `<g class="p2-mech"${mini ? '' : ' id="mech"'}>${a.mech()}${mini ? '' : rect('p2-hit', ...a.hit)}</g>`;
    s += `<g class="p2-body">${a.body()}${a.over ? a.over() : ''}</g>`;
    s += sil(sd, dot, a.silAt === 'r', y0);
    if (!mini) {
      s += `<text class="p2-dir" x="24" y="${y0 + h - 14}">${outLeft ? '◂ PULL OUT = lower' : '◂ PUSH IN = higher'}</text>` +
        `<text class="p2-dir" x="${W - 24}" y="${y0 + h - 14}" text-anchor="end">${outLeft ? 'PUSH IN = higher ▸' : 'PULL OUT = lower ▸'}</text>`;
    }
    return s + '</svg>';
  }

  /** the silhouette alone: the level cards' little icon */
  const icon = artId => { const [d, dot] = SIL[ART[artId].sil]; return `<svg class="p2-icon" viewBox="0 0 120 104" aria-hidden="true">${silG(d, dot)}</svg>`; };

  A.PP2Art = {ART, SIL, svg, icon, shift, W, H};
})(window.Arcade);
