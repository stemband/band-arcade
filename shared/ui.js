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
     items: [{n, x, id?, color?, caption?}]   (n.natural: draw a natural sign, for a note the key signature would change)
     opts:  {label, fit: notes[] to size the drawing for (default: items), width, keySig: {type: '#'|'b', count}}
     With a key signature, start the notes keySigWidth(sig) further right so nothing collides. */
  const STAFF_BOTTOM = 120, MID_LINE = 88;
  function noteY(clef, n) {
    const base = clef === 'treble' ? 30 /* E4 */ : 18 /* G2 */;
    return STAFF_BOTTOM - (stepOf(n) - base) * 8;
  }
  A.noteY = noteY;
  /* one note (ledger lines, accidental, head, stem, optional caption at capY) at it.x.
     staffSVG uses it; games that move notes on their own layer can use it too. */
  A.noteGlyph = function (clef, it, capY) {
    const x = it.x, y = noteY(clef, it.n), col = it.color || INK;
    let g = '';
    for (let ly = 136; ly <= y; ly += 16) g += `<line x1="${x - 15}" y1="${ly}" x2="${x + 15}" y2="${ly}" stroke="${INK}" stroke-width="1.6"/>`;
    for (let ly = 40; ly >= y; ly -= 16)  g += `<line x1="${x - 15}" y1="${ly}" x2="${x + 15}" y2="${ly}" stroke="${INK}" stroke-width="1.6"/>`;
    if (it.n.acc) g += `<text class="head" x="${x - 31}" y="${y + 6}" ${MUSIC_FONT} font-size="54" fill="${col}">${it.n.acc < 0 ? '♭' : '♯'}</text>`;
    else if (it.n.natural) g += `<text class="head" x="${x - 27}" y="${y + 6}" ${MUSIC_FONT} font-size="54" fill="${col}">♮</text>`;
    g += `<ellipse class="head" cx="${x}" cy="${y}" rx="9" ry="6.6" transform="rotate(-20 ${x} ${y})" fill="${col}"/>`;
    g += y > MID_LINE
      ? `<line class="stem" x1="${x + 8.3}" y1="${y - 2}" x2="${x + 8.3}" y2="${y - 52}" stroke="${col}" stroke-width="2"/>`
      : `<line class="stem" x1="${x - 8.3}" y1="${y + 2}" x2="${x - 8.3}" y2="${y + 52}" stroke="${col}" stroke-width="2"/>`;
    if (it.caption && capY) g += `<text class="ncap" x="${x}" y="${capY}" text-anchor="middle" font-family='"GN Text",system-ui,sans-serif' font-weight="700" font-size="15" fill="#4b5570">${it.caption}</text>`;
    return g;
  };
  /* ---------- key signatures: the standard positions (sharps F C G D A E B, flats B E A D G C F) ---------- */
  const SIG_STEPS = {
    treble: {'#': ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'], b: ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4']},
    bass:   {'#': ['F3', 'C3', 'G3', 'D3', 'A2', 'E3', 'B2'], b: ['B2', 'E3', 'A2', 'D3', 'G2', 'C3', 'F2']},
  };
  const SIG_X = {treble: 54, bass: 60}, SIG_GAP = 12;
  /** extra room a key signature takes after the clef (add it to the first note's x) */
  A.keySigWidth = sig => sig && sig.count ? 14 + sig.count * SIG_GAP : 0;
  function keySigSVG(clef, sig) {
    if (!sig || !sig.count) return '';
    return SIG_STEPS[clef][sig.type].slice(0, sig.count).map((nm, i) =>
      `<text class="ksig" x="${SIG_X[clef] + i * SIG_GAP}" y="${noteY(clef, A.music.parseNote(nm)) + 5}" ${MUSIC_FONT} font-size="48" fill="${INK}">${sig.type === 'b' ? '♭' : '♯'}</text>`).join('');
  }
  A.keySigSVG = keySigSVG;

  /* opts.captions: leave room for captions even when no item has one yet (for notes drawn on another layer) */
  A.staffSVG = function (clef, items, opts = {}) {
    const W = opts.width || 400;
    const ys = (opts.fit || items.map(i => i.n)).map(n => noteY(clef, n));
    const hasCap = opts.captions || items.some(i => i.caption);
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
    s += keySigSVG(clef, opts.keySig);
    items.forEach(it => { s += `<g${it.id ? ` id="${it.id}"` : ''}>${A.noteGlyph(clef, it, capY)}</g>`; });
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

  /* ---------- links between pages ----------
     linkTo(path, {game}) keeps ?demo (like Arcade.link) but sets or drops ?game=, so the
     select-player page's ?game= never leaks into a game's own links. */
  A.linkTo = function (path, extra = {}) {
    const p = new URLSearchParams();
    Object.keys(extra).forEach(k => extra[k] != null && p.set(k, extra[k]));
    A.params.forEach((v, k) => { if (k !== 'game' && !(k in extra)) p.append(k, v); });
    const q = p.toString().replace(/=(?=&|$)/g, '');          // "?demo=" -> "?demo"
    return path + (q ? '?' + q : '');
  };
  /** the "Select player" page for a game. root: path back to the site root from this page ('' or '../') */
  A.playerLink = (gameId, root = '../') => A.linkTo(root + 'select-player/index.html', {game: gameId});
  /** the arcade floor, turned to this game's cabinet */
  A.homeLink = (gameId, root = '../') => A.linkTo(root + 'index.html') + (gameId ? '#' + gameId : '');

  /** For game pages: the saved instrument, or (if none) send the student to pick one for this game.
      Usage: const inst = A.requireInstrument(GAME_ID); if (!inst) return; */
  A.requireInstrument = function (gameId) {
    const inst = A.currentInstrument();
    if (!inst) location.replace(A.playerLink(gameId));
    return inst;
  };

  /** Standard game top bar: "← Arcade" back to the arcade floor on the left, instrument chip on the right.
      The chip opens Select Player for this game. Call on a page that has <div id="topbar"></div>. */
  A.mountTopbar = function (inst, extraRightHTML = '', gameId = '') {
    const el = A.$('topbar'); if (!el) return;
    el.className = 'topbar';
    el.innerHTML =
      `<a class="brand" href="${A.homeLink(gameId)}" aria-label="Back to the arcade"><span aria-hidden="true">←</span><span>Arcade</span></a>` +
      `<div class="topbar-right">${extraRightHTML}` +
      `<a class="chip" href="${A.playerLink(gameId)}" title="Change instrument">` +
      `<span class="sr">Change instrument. Playing as </span>${inst ? inst.shortName : 'Choose instrument'}</a></div>`;
  };
})(window.Arcade);
