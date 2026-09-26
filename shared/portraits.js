/* Band Arcade: instrument portraits. Mat's artwork in shared/portraits/ (Arcade.portraitHTML, below) is shown when
   it loads; these drawn SVG portraits are always underneath as the fallback. Drawn portraits: one per instrument member
   (Arcade.PLAYERS). Used big on Select Player, on its tiles, and tiny in every game's top-bar chip.

     Arcade.portraitSVG(id, {size, color, glow, style, cls, label})
       size   'big' | 'tile' (default) | 'chip'   (chip: thicker lines, no glow layer, still the same drawing)
       color  any CSS color; default the instrument's signature neon, var(--pt-<id>) in theme.css
       glow   the glow color (default = color)
       style  'neon' (glowing tubes, default) | 'line' (one plain stroke: for print or a future skin)
       cls, label   extra class; an accessible name (otherwise the SVG is decoration, aria-hidden)
     Arcade.PORTRAITS[id].color   the token name for that signature color

   Each drawing is on a 100 × 100 grid, made of parts:
     tube   a centerline drawn as a neon TUBE: a wide stroke in the color with a dark core, so it reads as two
            glowing edges. w = the tube's width
     shape  a closed outline (bells of the instruments, bars), dark fill, neon edge
     line   a single neon line (keys, rods, mouthpieces)
     ring   a key ring {x, y, r}
   A skin can pass its own color/glow/style; the parts never hard-code a color. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";

  const rings = (x, ys, r = 2.2) => ys.map(y => ({ring: [x, y, r]}));
  const P = {
    flute: {color: 'pt-flute', rot: -26, parts: [
      {tube: 'M8 50H92', w: 7}, {shape: 'M13 43.5h9v3h-9Z'}, {line: 'M84 44V56'}, {line: 'M30 57H76'},
      ...[30, 37, 44, 58, 65, 72].map(x => ({ring: [x, 50, 2]}))]},
    oboe: {color: 'pt-oboe', rot: 18, parts: [
      {line: 'M50 5V16', w: 2.6}, {tube: 'M50 16V80', w: 7}, {shape: 'M46.2 80Q45 88 41 93H59Q55 88 53.8 80Z'},
      ...rings(50, [27, 34, 41, 55, 62, 69], 1.9), {line: 'M54.5 46h5M54.5 50h5M45.5 74h-5'}]},
    clarinet: {color: 'pt-clarinet', rot: -18, parts: [
      {shape: 'M47.6 17L48.6 6H51.4L52.4 17Z'}, {tube: 'M50 17V24', w: 10}, {tube: 'M50 24V78', w: 8},
      {shape: 'M46 78Q45 88 36 94H64Q55 88 54 78Z'}, ...rings(50, [31, 38, 45, 56, 63, 70]), {line: 'M55 42h5M55 60h5'}]},
    basscl: {color: 'pt-basscl', rot: 0, parts: [
      {tube: 'M46 20Q46 8 56 7Q63 7 64 13', w: 4}, {line: 'M64 13l1 7', w: 2.6}, {tube: 'M46 20V84', w: 8},
      {tube: 'M46 84Q46 94 55 94Q63 94 63 87', w: 8}, {shape: 'M59.5 87Q59 81 56 78H70Q67 81 66.5 87Z'},
      ...rings(46, [28, 35, 42, 54, 61, 68]), {line: 'M51 48h5M41 58h-5M51 74h5'}]},
    bassoon: {color: 'pt-bassoon', rot: 0, parts: [
      {shape: 'M36.5 14L38.5 5H45.5L47.5 14Z'}, {tube: 'M42 14V86', w: 9}, {tube: 'M57 36V86', w: 9},
      {tube: 'M42 86Q42 95 49.5 95Q57 95 57 86', w: 9}, {tube: 'M57 36Q57 23 67 21Q77 19 79 27', w: 3.4}, {line: 'M79 27l2 7', w: 2.6},
      ...rings(57, [46, 54, 62]), ...rings(42, [62, 70, 78]), {line: 'M62.5 70h5M36.5 50h-5'}]},
    altosax: {color: 'pt-altosax', rot: 0, parts: [
      {tube: 'M40 20Q40 9 50 9H57', w: 5}, {line: 'M57 9h8', w: 2.6}, {tube: 'M40 20V64Q40 88 57 88Q73 88 73 72V62', w: 10},
      {shape: 'M67.5 62Q66 53 60 48H86Q80 53 78.5 62Z'}, ...rings(40, [28, 35, 42, 50, 57], 2.4), {line: 'M46 70l5 4M34 34h-5'}]},
    tenorsax: {color: 'pt-tenorsax', rot: 0, parts: [
      {tube: 'M40 20Q40 7 50 10Q57 13 61 7', w: 5}, {line: 'M61 7l5 -4', w: 2.6}, {tube: 'M40 20V66Q40 91 57 91Q74 91 74 74V62', w: 11},
      {shape: 'M68 62Q66 52 59 47H89Q82 52 80 62Z'}, ...rings(40, [29, 36, 43, 52, 59], 2.6), {line: 'M46 72l5 4M34 35h-5'}]},
    barisax: {color: 'pt-barisax', rot: 0, parts: [
      {tube: 'M44 34Q44 12 31 12Q19 12 19 24Q19 34 30 34Q41 34 44 24Q47 13 56 11H61', w: 5}, {line: 'M61 11h8', w: 2.6},
      {tube: 'M44 34V68Q44 92 60 92Q77 92 77 76V64', w: 11}, {shape: 'M71 64Q69 54 62 49H92Q85 54 83 64Z'},
      ...rings(44, [42, 49, 56, 63], 2.6), {line: 'M50 74l5 4'}]},
    trumpet: {color: 'pt-trumpet', rot: 0, parts: [
      {shape: 'M5 42L12 44V46L5 48Z'}, {tube: 'M12 45H62', w: 4}, {shape: 'M62 42Q76 41 90 28V62Q76 49 62 48Z'},
      {tube: 'M30 45V62Q30 68 36 68H60Q66 68 66 62V55', w: 4}, {tube: 'M40 36V60', w: 6}, {tube: 'M48 36V60', w: 6}, {tube: 'M56 36V60', w: 6},
      {line: 'M37 32.5h6M45 32.5h6M53 32.5h6'}]},
    horn: {color: 'pt-horn', rot: 0, parts: [
      {tube: 'M20 52A26 26 0 1 0 72 52A26 26 0 1 0 20 52', w: 5}, {tube: 'M28 52A18 18 0 1 0 64 52A18 18 0 1 0 28 52', w: 4},
      {shape: 'M64 66Q76 80 92 82V96Q72 94 58 74Z'}, {tube: 'M24 38L11 24', w: 3}, {line: 'M11 24l-4 -4', w: 2.6},
      {ring: [40, 30, 3.6]}, {ring: [47.5, 28, 3.6]}, {ring: [55, 30, 3.6]}, {line: 'M40 26V20M47.5 24V18M55 26V20'}]},
    trombone: {color: 'pt-trombone', rot: 0, parts: [
      {tube: 'M9 58H74', w: 4}, {tube: 'M9 70H74', w: 4}, {tube: 'M9 58Q2 64 9 70', w: 4},
      {tube: 'M74 64H81Q87 64 87 56V33Q87 26 80 26H52', w: 4}, {shape: 'M52 22Q37 20 25 9V43Q37 32 52 30Z'},
      {line: 'M74 70h11', w: 2.6}, {line: 'M22 58V70M66 58V70'}]},
    baritonetc: {color: 'pt-baritonetc', rot: 0, parts: [
      {tube: 'M38 36Q38 27 28 25', w: 3}, {line: 'M28 25l-6 -1', w: 2.6}, {tube: 'M38 36V82', w: 9},
      {tube: 'M38 82Q38 92 50 92H56Q66 92 66 82V62', w: 9}, {shape: 'M65 62Q63 40 56 18H86Q79 40 77 62Z'}, {line: 'M56 18Q71 13 86 18'},
      {tube: 'M45 48V64', w: 5}, {tube: 'M51 48V64', w: 5}, {tube: 'M57 50V64', w: 4}, {line: 'M42.5 44.5h5M48.5 44.5h5'}]},
    euphbc: {color: 'pt-euphbc', rot: 0, parts: [
      {tube: 'M36 38Q36 28 25 26', w: 3}, {line: 'M25 26l-6 -1', w: 2.6}, {tube: 'M36 38V82', w: 10},
      {tube: 'M36 82Q36 93 49 93H57Q68 93 68 82V64', w: 10}, {shape: 'M63 64Q61 40 50 12H94Q83 40 79 64Z'}, {line: 'M50 12Q72 5 94 12'},
      {tube: 'M43 48V66', w: 5}, {tube: 'M49 48V66', w: 5}, {tube: 'M55 50V66', w: 4}, {tube: 'M76 70V84', w: 5},
      {line: 'M40.5 44.5h5M46.5 44.5h5M73.5 67h5'}]},
    tuba: {color: 'pt-tuba', rot: 0, parts: [
      {tube: 'M34 42Q34 32 23 30', w: 3.4}, {line: 'M23 30l-7 -1', w: 2.6}, {tube: 'M34 42V86', w: 12},
      {tube: 'M34 86Q34 97 48 97H60Q72 97 72 86V60', w: 12}, {shape: 'M65 60Q61 32 44 6H98Q85 32 81 60Z'}, {line: 'M44 6Q71 -2 98 6'},
      {tube: 'M43 58V76', w: 5}, {tube: 'M50 58V76', w: 5}, {tube: 'M57 58V76', w: 5}, {tube: 'M64 60V76', w: 4}, {line: 'M40.5 54h5M47.5 54h5M54.5 54h5'}]},
    bells: {color: 'pt-bells', rot: 0, parts: [
      {shape: 'M6 30H94V92H6Z'},
      ...[0, 1, 2, 3, 4, 5, 6].map(i => ({shape: `M${12 + i * 11.5} ${60 + i * 1.6}h8v${28 - i * 3.2}h-8Z`})),
      ...[0, 1, 3, 4, 5].map(i => ({shape: `M${18 + i * 11.5} ${37 + i * 1.4}h7v${18 - i * 2}h-7Z`})),
      {line: 'M64 22L84 6M72 26L92 12', w: 2.4}, {ring: [85, 5, 3.4]}, {ring: [93, 11, 3.4]}]},
    /* not an instrument: the CPU opponent in two-player games (Select Player's CPU tile) */
    cpu: {color: 'pt-cpu', rot: 0, parts: [
      {shape: 'M24 30H76Q84 30 84 38V70Q84 78 76 78H24Q16 78 16 70V38Q16 30 24 30Z'}, {line: 'M50 30V16', w: 2.6}, {ring: [50, 12, 4]},
      {shape: 'M30 44H44V56H30Z'}, {shape: 'M56 44H70V56H56Z'}, {line: 'M34 66H66'}, {line: 'M16 50H8M84 50H92', w: 3}]},
  };
  const FAMILY_COLOR = {woodwind: 'pink', brass: 'amber', percussion: 'cyan'};

  const SIZE = {big: {glow: 7, edge: 1.5, line: 2.2}, tile: {glow: 6, edge: 1.7, line: 2.4}, chip: {glow: 0, edge: 2.6, line: 3.4}};
  function portraitSVG(id, {size = 'tile', color, glow, style = 'neon', cls = '', label = ''} = {}) {
    const p = P[id]; if (!p) return '';
    const c = color || `var(--${p.color})`, g = glow || c, S = SIZE[size] || SIZE.tile, neon = style !== 'line';
    const part = (x, layer) => {
      if (x.ring) { const [cx, cy, r] = x.ring; return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`; }
      return `<path d="${x.tube || x.shape || x.line}"${x.tube && layer ? ` stroke-width="${layer(x)}"` : x.line && x.w && layer ? ` stroke-width="${x.w}"` : ''}/>`;
    };
    const tubes = p.parts.filter(x => x.tube);
    let s = `<svg class="portrait pt-${size} ${cls}" viewBox="0 0 100 100" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"'}>` +
      `<g transform="rotate(${p.rot} 50 50)" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
    if (neon && S.glow) s += `<g class="pt-glow" stroke="${g}" stroke-width="${S.glow}" opacity=".22">${p.parts.map(x => part(x, t => t.w + S.glow)).join('')}</g>`;
    // tubes: the colored width, then a dark core leaves two glowing edges
    s += `<g stroke="${c}">${tubes.map(x => part(x, t => t.w + (neon ? S.edge * 2 : 0))).join('')}</g>`;
    if (neon) s += `<g stroke="var(--deep)">${tubes.map(x => part(x, t => Math.max(.6, t.w - S.edge * 1.2))).join('')}</g>`;
    s += `<g stroke="${c}" stroke-width="${S.line}" fill="var(--deep)">${p.parts.filter(x => x.shape).map(x => part(x)).join('')}</g>`;
    s += `<g stroke="${c}" stroke-width="${S.line * .8}">${p.parts.filter(x => x.line || x.ring).map(x => part(x, () => 0)).join('')}</g>`;
    if (neon && size !== 'chip') s += `<g class="pt-core" stroke="var(--white-hi)" stroke-width=".6" opacity=".55">${p.parts.filter(x => x.shape).map(x => part(x)).join('')}</g>`;
    return s + `</g></svg>`;
  }

  /* ---------- Mat's artwork (shared/portraits/, see its README.md), with the drawn SVG as the fallback ----------
     Arcade.portraitHTML(memberId, {size, full, skin, label, cls, color})
       skin: {color, acc} from shared/skins.js; left out = the instrument's equipped skin (Arcade.Skins.equipped),
       false = none. Color skins become effects around/over the image (or a recolor of the SVG fallback), and
       accessories are SVG overlays placed by Arcade.Skins.ANCHORS.
       A box holding the drawn SVG with the image on top. The image shows only once it has loaded; a missing or
       broken file tries the next candidate, and with none left the SVG stays, so a broken image never shows.
       Candidates: the color skin's drawn variant ('<file>--<skin>'), the accessory's, then the base image. `full` (the big
       Select Player preview) tries '<file>-full' first and falls back to the square image. For every name:
       optimized/<name>.webp when listed in OPTIMIZED, then <name>.png, then <name>.webp.
       `color` (a recolored CPU rival) or an id without a file ('cpu') gives the SVG alone. */
  const FILES = {                                   // instrument member id -> image file name(s), first match wins
    flute: 'flute', oboe: 'oboe', clarinet: 'clarinet', basscl: 'bass-clarinet', bassoon: 'bassoon',
    altosax: 'alto-sax', tenorsax: 'tenor-sax', barisax: 'bari-sax',
    trumpet: 'trumpet', horn: 'horn', trombone: 'trombone', baritonetc: 'baritone-tc', euphbc: ['euphonium', 'euphonium-bc'], tuba: 'tuba',
    bells: 'bells',
  };
  /* smaller WebP copies made for files over 250 KB or 1024 px (the originals stay untouched). If you replace one
     of these originals, delete its copy in optimized/ and take its name off this list (or make a new copy). */
  const OPTIMIZED = ['alto-sax', 'tenor-sax', 'bells', 'horn'];
  const here = document.currentScript && document.currentScript.src;
  const BASE = here ? new URL('portraits/', here).href : 'shared/portraits/';
  /* files that failed: never asked for twice on this page. Skin variants and -full pictures (which usually don't
     exist) are also remembered for this browser tab, so each costs one request per visit, not one per page. */
  const MISS_KEY = 'bandarcade.pt-miss', miss = new Set();
  try { JSON.parse(sessionStorage.getItem(MISS_KEY) || '[]').forEach(u => miss.add(u)); } catch (e) {}
  const remember = (u, tag) => {
    miss.add(u);
    if (tag) try { sessionStorage.setItem(MISS_KEY, JSON.stringify([...miss].filter(x => /--|-full\./.test(x)))); } catch (e) {}
  };
  const variants = name => (OPTIMIZED.includes(name) ? [`optimized/${name}.webp`] : []).concat(`${name}.png`, `${name}.webp`);
  /* each candidate is 'tag>url': tag f = a -full picture, c = the color skin's drawn variant, a = the accessory's */
  function candidates(id, {full, vc, va}) {
    const names = [].concat(FILES[id] || []), list = [];
    const add = (suffix, tag) => names.forEach(n => variants(n + suffix).forEach(f => list.push(tag + '>' + BASE + f)));
    const set = (pre, tag) => { if (vc) add(`${pre}--${vc}`, tag + 'c'); if (va) add(`${pre}--${va}`, tag + 'a'); add(pre, tag); };
    if (full) set('-full', 'f');
    set('', '');
    return list.filter(c => !miss.has(c.split('>')[1]));
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  /* skin: {color, acc} (shared/skins.js); left out = the instrument's equipped skin on this device; false = none */
  function portraitHTML(id, opts = {}) {
    const {size = 'tile', full = false, label = '', cls = '', color} = opts;
    const m = A.memberById && A.memberById(id), name = label || (m ? m.short : '');
    const eq = color || opts.skin === false || !A.Skins || !P[id] ? null : opts.skin || A.Skins.equipped(id);
    const d = eq ? A.Skins.decorate(id, eq, size) : null;
    const alt = d && A.Skins.label(eq) ? `${name}, ${A.Skins.label(eq)}` : name;
    const svg = portraitSVG(id, {size, color: color || (d && d.svgColor), glow: d && d.svgGlow, label: alt});
    const list = color ? [] : candidates(id, {full, vc: d && d.variants.c, va: d && d.variants.a});
    const box = `pt-box pt-box-${size} ${d ? d.cls : ''} ${cls}`;
    const keep = esc(JSON.stringify({size, full, label, cls}));
    if (!list.length) return `<span class="${box}" data-pt="${esc(id)}" data-opts="${keep}"${d && d.style ? ` style="${d.style}"` : ''}>` +
      `${d ? d.parts.before + d.parts.cape : ''}${svg}${d ? d.parts.after : ''}</span>`;
    const [tag, src] = list[0].split('>');
    return `<span class="${box}" data-pt="${esc(id)}" data-opts="${keep}"${d && d.style ? ` style="${d.style}"` : ''}>` +
      `${d ? d.parts.before + d.parts.cape : ''}${svg}` +
      `<img class="pt-img" src="${esc(src)}" data-tag="${tag}" data-next="${esc(list.slice(1).join('|'))}" alt="${esc(alt)}" decoding="async" draggable="false">` +
      `${d ? d.parts.after : ''}</span>`;
  }
  /* an image that loaded: show it; a drawn skin variant switches that effect off; Pixel redraws it pixelated */
  function loaded(t) {
    const box = t.parentNode, tag = t.dataset.tag || '';
    box.classList.add('pt-ok');
    box.classList.toggle('pt-full', tag.includes('f'));
    box.classList.toggle('pt-var-c', tag.includes('c'));
    box.classList.toggle('pt-var-a', tag.includes('a'));
    box.style.setProperty('--sk-src', `url("${t.src}")`);            // masks the Chrome Gold sweep / Diamond shimmer to the art
    if (box.classList.contains('sk-pixel') && !tag.includes('c') && !box.querySelector('.pt-pix')) pixelate(t, box);
  }
  function pixelate(img, box) {
    const long = box.classList.contains('pt-box-big') ? 44 : box.classList.contains('pt-box-chip') ? 14 : 30;
    const k = long / Math.max(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.className = 'pt-pix'; c.setAttribute('aria-hidden', 'true');
    try { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); } catch (e) { return; }
    img.after(c); box.classList.add('pt-pixd');
  }
  // load/error don't bubble (and never reach window), so the document listens in the capture phase for every portrait image
  document.addEventListener('load', e => { const t = e.target; if (t.classList && t.classList.contains('pt-img')) loaded(t); }, true);
  document.addEventListener('error', e => {
    const t = e.target; if (!t.classList || !t.classList.contains('pt-img')) return;
    remember(t.src, t.dataset.tag);
    const next = (t.dataset.next || '').split('|').filter(c => c && !miss.has(c.split('>')[1]));
    if (next.length) { const [tag, src] = next[0].split('>'); t.dataset.next = next.slice(1).join('|'); t.dataset.tag = tag; t.src = src; }
    else { t.parentNode.classList.remove('pt-ok'); t.remove(); }         // nothing left: the drawn SVG stays
  }, true);

  A.PORTRAITS = P;
  A.PORTRAIT_FILES = FILES;
  A.FAMILY_COLOR = FAMILY_COLOR;
  A.portraitSVG = portraitSVG;
  A.portraitHTML = portraitHTML;
})(window.Arcade);
