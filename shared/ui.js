/* Band Arcade — drawing helpers: staff notation, the ghost mascot, stars, top bar. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const {noteLabel, stepOf} = A.music;
  const INK = '#18203a';
  const MUSIC_FONT = `font-family='"GN Music","Noto Music",serif'`;

  A.$ = id => document.getElementById(id);

  /* ---------- staff ----------
     Lines at y = 56..120 (16px per space). One diatonic step = 8px.
     items: [{n, x, id?, color?, caption?}]
     opts:  {label, fit: notes[] to size the drawing for (default: items), width} */
  const STAFF_BOTTOM = 120, MID_LINE = 88;
  function noteY(clef, n) {
    const base = clef === 'treble' ? 30 /* E4 */ : 18 /* G2 */;
    return STAFF_BOTTOM - (stepOf(n) - base) * 8;
  }
  A.staffSVG = function (clef, items, opts = {}) {
    const W = opts.width || 400;
    const ys = (opts.fit || items.map(i => i.n)).map(n => noteY(clef, n));
    const hasCap = items.some(i => i.caption);
    const top = Math.min(30, Math.min(...ys.map(y => y > MID_LINE ? y - 60 : y - 14)));
    const bot = Math.max(146, Math.max(...ys.map(y => y > MID_LINE ? y + 14 : y + 60))) + (hasCap ? 34 : 6);
    const capY = bot - 10;
    let s = `<svg class="staff" viewBox="0 ${top} ${W} ${bot - top}" role="img" aria-label="${opts.label || 'Music staff'}">`;
    for (let i = 0; i < 5; i++) {
      const y = 56 + i * 16;
      s += `<line x1="8" y1="${y}" x2="${W - 8}" y2="${y}" stroke="${INK}" stroke-width="1.6"/>`;
    }
    s += clef === 'treble'
      ? `<text x="14" y="119" ${MUSIC_FONT} font-size="64" fill="${INK}">𝄞</text>`
      : `<text x="16" y="111" ${MUSIC_FONT} font-size="62" fill="${INK}">𝄢</text>`;
    items.forEach(it => {
      const x = it.x, y = noteY(clef, it.n), col = it.color || INK;
      let g = `<g${it.id ? ` id="${it.id}"` : ''}>`;
      for (let ly = 136; ly <= y; ly += 16) g += `<line x1="${x - 15}" y1="${ly}" x2="${x + 15}" y2="${ly}" stroke="${INK}" stroke-width="1.6"/>`;
      for (let ly = 40; ly >= y; ly -= 16)  g += `<line x1="${x - 15}" y1="${ly}" x2="${x + 15}" y2="${ly}" stroke="${INK}" stroke-width="1.6"/>`;
      if (it.n.acc) g += `<text class="head" x="${x - 31}" y="${y + 6}" ${MUSIC_FONT} font-size="54" fill="${col}">${it.n.acc < 0 ? '♭' : '♯'}</text>`;
      g += `<ellipse class="head" cx="${x}" cy="${y}" rx="9" ry="6.6" transform="rotate(-20 ${x} ${y})" fill="${col}"/>`;
      g += y > MID_LINE
        ? `<line class="stem" x1="${x + 8.3}" y1="${y - 2}" x2="${x + 8.3}" y2="${y - 52}" stroke="${col}" stroke-width="2"/>`
        : `<line class="stem" x1="${x - 8.3}" y1="${y + 2}" x2="${x - 8.3}" y2="${y + 52}" stroke="${col}" stroke-width="2"/>`;
      if (it.caption) g += `<text x="${x}" y="${capY}" text-anchor="middle" font-family='"GN Text",system-ui,sans-serif' font-weight="700" font-size="15" fill="#4b5570">${it.caption}</text>`;
      s += g + `</g>`;
    });
    return s + `</svg>`;
  };
  /** five notes spread across a staff, labeled (used by hub cards and the Note Checker) */
  A.fiveNoteStaff = function (inst, colorFor) {
    const xs = [120, 175, 230, 285, 340];
    return A.staffSVG(inst.clef, inst.notes.map((n, i) => ({
      n, x: xs[i], id: 'five' + i, caption: noteLabel(n), color: colorFor ? colorFor(i) : undefined
    })), {label: 'Your five notes: ' + inst.notes.map(noteLabel).join(', ')});
  };
  A.colorNote = function (gid, col) {
    const g = document.getElementById(gid); if (!g) return;
    g.querySelectorAll('.head').forEach(e => e.setAttribute('fill', col));
    g.querySelectorAll('.stem').forEach(e => e.setAttribute('stroke', col));
  };

  /* ---------- ghost mascot ---------- */
  A.ghostSVG = function (text = '', cls = 'bob') {
    const ey = text ? 32 : 40, er = text ? 4 : 6;
    return `<svg class="ghost ${cls}" viewBox="0 0 80 100" aria-hidden="true">` +
      `<path class="g-body" d="M4 44C4 22 20 4 40 4S76 22 76 44V88Q70 98 64 88T52 88T40 88T28 88T16 88T4 88Z"/>` +
      `<circle class="g-eye" cx="29" cy="${ey}" r="${er}"/><circle class="g-eye" cx="51" cy="${ey}" r="${er}"/>` +
      (text ? `<text x="40" y="74" text-anchor="middle" class="g-text">${text}</text>` : '') + `</svg>`;
  };

  A.starStr = n => [0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('');

  /** Standard game top bar: back to the arcade on the left, instrument chip on the right.
      Call on a page that has <div id="topbar"></div>. */
  A.mountTopbar = function (inst, extraRightHTML = '') {
    const el = A.$('topbar'); if (!el) return;
    el.className = 'topbar';
    el.innerHTML =
      `<a class="brand" href="${A.link('../index.html')}">${A.ghostSVG('', '')}<span>Arcade</span></a>` +
      `<div class="topbar-right">${extraRightHTML}` +
      `<a class="chip" href="${A.link('../index.html')}" title="Change instrument">${inst ? inst.shortName : 'Choose instrument'}</a></div>`;
  };
})(window.Arcade);
