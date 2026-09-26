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
  /* ---------- music symbols for vocabulary games (Ancient Ninja Scrolls) ----------
     Each is drawn on a short staff so it looks the way it does in a part. */
  const SYMBOLS = {
    'treble-clef':    {name: 'Treble clef', svg: `<text x="46" y="119" ${MUSIC_FONT} font-size="64" fill="${INK}">𝄞</text>`},
    'bass-clef':      {name: 'Bass clef', svg: `<text x="46" y="111" ${MUSIC_FONT} font-size="62" fill="${INK}">𝄢</text>`},
    'fermata':        {name: 'Fermata', svg: note(80, true) + `<path d="M52 42A18 18 0 0 1 88 42H84.6A14.6 13 0 0 0 55.4 42Z" fill="${INK}"/><circle cx="70" cy="37" r="3.4" fill="${INK}"/>`},
    'accent':         {name: 'Accent', svg: note(80, true) + `<path d="M56 32L84 40L56 48" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linejoin="miter"/>`},
    'repeat':         {name: 'Repeat sign', svg:
      `<rect x="14" y="56" width="6" height="64" fill="${INK}"/><line x1="25" y1="56" x2="25" y2="120" stroke="${INK}" stroke-width="1.8"/>` +
      `<circle cx="33" cy="80" r="3.6" fill="${INK}"/><circle cx="33" cy="96" r="3.6" fill="${INK}"/>` +
      `<circle cx="107" cy="80" r="3.6" fill="${INK}"/><circle cx="107" cy="96" r="3.6" fill="${INK}"/>` +
      `<line x1="115" y1="56" x2="115" y2="120" stroke="${INK}" stroke-width="1.8"/><rect x="120" y="56" width="6" height="64" fill="${INK}"/>`},
    'measure-repeat': {name: 'Measure repeat sign', svg:
      `<line x1="12" y1="56" x2="12" y2="120" stroke="${INK}" stroke-width="1.8"/><line x1="128" y1="56" x2="128" y2="120" stroke="${INK}" stroke-width="1.8"/>` +
      `<path d="M56 106L78 70H86L64 106Z" fill="${INK}"/><circle cx="60" cy="78" r="4" fill="${INK}"/><circle cx="82" cy="98" r="4" fill="${INK}"/>`},
  };
  function note(y, stemDown) {         // a quarter note at x = 70 for symbols that sit on a note
    return `<ellipse cx="70" cy="${y}" rx="9" ry="6.6" transform="rotate(-20 70 ${y})" fill="${INK}"/>` +
      (stemDown ? `<line x1="61.7" y1="${y + 2}" x2="61.7" y2="${y + 52}" stroke="${INK}" stroke-width="2"/>` : '');
  }
  A.SYMBOL_IDS = Object.keys(SYMBOLS);
  A.symbolName = id => (SYMBOLS[id] || {}).name || id;
  /** one symbol on a short staff (viewBox 140 × 130), for answer buttons and prompts */
  A.symbolSVG = function (id, label) {
    const sym = SYMBOLS[id]; if (!sym) return '';
    let s = `<svg class="symbol" viewBox="0 20 140 130" role="img" aria-label="${label || sym.name}">`;
    for (let i = 0; i < 5; i++) s += `<line x1="6" y1="${56 + i * 16}" x2="134" y2="${56 + i * 16}" stroke="${INK}" stroke-width="1.6"/>`;
    return s + sym.svg + `</svg>`;
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

  /* ---------- the Note Ninja mascot: an original kid martial artist ----------
     White gi, red headband, a practice sword (bokken), and a belt in the current belt's color.
     Face showing, no mask or hood, so it doesn't read as any existing ninja character.
     Colors are theme tokens, resolved here, so the same drawing works inline and as a canvas image.
     Parts with classes for animation: .nj-arm (sword arm), .nj-tails (headband tails), .nj-body. */
  A.ninjaSVG = function ({belt = 'belt-white', cls = '', label = ''} = {}) {
    const css = getComputedStyle(document.documentElement), c = n => css.getPropertyValue('--' + n).trim() || '#888';
    const gi = c('ninja-gi'), line = c('ink'), skin = c('ninja-skin'), hair = c('ninja-hair'), band = c('ninja-band'), wood = c('belt-brown'), b = c(belt);
    return `<svg class="ninja ${cls}" viewBox="0 0 100 120" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>` +
      `<g class="nj-body" stroke="${line}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">` +
        `<path d="M36 86L30 114H44L50 94L56 114H70L64 86Z" fill="${gi}"/>` +                                  // pants
        `<path d="M32 58Q50 50 68 58L70 88H30Z" fill="${gi}"/>` +                                            // jacket
        `<path d="M42 57L50 72L58 57" fill="none"/>` +                                                       // lapels
        `<rect x="29" y="76" width="42" height="8" rx="2" fill="${b}"/>` +                                   // belt
        `<path d="M46 84L42 97M54 84L58 96" stroke="${b}" stroke-width="5"/>` +                              // belt ends
        `<path d="M34 62Q24 72 30 82" fill="none" stroke-width="7" stroke="${line}"/><path d="M34 62Q24 72 30 82" fill="none" stroke-width="4" stroke="${gi}"/>` +  // back arm
        `<g class="nj-arm"><path d="M65 62Q76 66 80 56" fill="none" stroke-width="7" stroke="${line}"/><path d="M65 62Q76 66 80 56" fill="none" stroke-width="4" stroke="${gi}"/>` +
          `<line x1="80" y1="57" x2="94" y2="16" stroke="${wood}" stroke-width="4"/><circle cx="80" cy="56" r="4" fill="${skin}"/></g>` +   // sword arm + bokken
        `<circle cx="50" cy="36" r="17" fill="${skin}"/>` +                                                  // head
        `<path d="M33 33Q34 16 50 17Q66 16 67 33Q60 26 50 27Q40 26 33 33Z" fill="${hair}"/>` +               // hair
        `<path d="M47 17Q49 9 55 11Q51 14 52 18Z" fill="${hair}"/>` +                                        // tuft
        `<path d="M33 30Q50 24 67 30L67 35Q50 29 33 35Z" fill="${band}"/>` +                                 // headband
        `<path class="nj-tails" d="M34 32Q24 30 16 36M34 34Q25 38 20 46" fill="none" stroke="${band}" stroke-width="3.5"/>` +
      `</g>` +
      `<ellipse cx="44" cy="40" rx="2.2" ry="3" fill="${line}"/><ellipse cx="56" cy="40" rx="2.2" ry="3" fill="${line}"/>` +   // eyes
      `<path d="M45 47Q50 51 55 47" fill="none" stroke="${line}" stroke-width="2" stroke-linecap="round"/>` +                  // smile
      `</svg>`;
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
  /** the "Select player" page for a game. root: path back to the site root from this page ('' or '../').
      A two-player game (games.js `players: 2`) gets &players=2, so Player 2 picks too. */
  A.playerLink = (gameId, root = '../') => {
    const g = (A.GAMES || []).find(x => x.id === gameId);
    return A.linkTo(root + 'select-player/index.html', {game: gameId, players: g && g.players > 1 ? g.players : null});
  };
  /** where a game's START goes: Select Player, or straight into a game with its own fixed player (games.js `player`:
      an instrument group like 'bells', or 'all' for a game that needs no instrument) */
  A.startLink = (g, root = '../') => g.player ? A.linkTo(root + g.id + '/index.html') : A.playerLink(g.id, root);
  /** the arcade floor, turned to this game's cabinet */
  A.homeLink = (gameId, root = '../') => A.linkTo(root + 'index.html') + (gameId ? '#' + gameId : '');

  /** For game pages: the saved instrument, or (if none) send the student to pick one for this game.
      Usage: const inst = A.requireInstrument(GAME_ID); if (!inst) return; */
  A.requireInstrument = function (gameId) {
    const inst = A.store.player ? A.currentInstrument() : null;      // the exact instrument must be chosen (a member)
    if (!inst) location.replace(A.playerLink(gameId));
    return inst;
  };

  /** Standard game top bar: "← Arcade" back to the arcade floor on the left, instrument chip on the right.
      The chip opens Select Player for this game. Call on a page that has <div id="topbar"></div>. */
  /* {fixed: 'Bell Kit'}: a game with its own instrument shows it as a plain label, not a link to Select Player.
     {portrait: 'bells'}: the portrait for a fixed label. The chip shows the saved instrument's tiny portrait
     (shared/portraits.js, when the page loads it) and its name. */
  A.mountTopbar = function (inst, extraRightHTML = '', gameId = '', {fixed, portrait} = {}) {
    const el = A.$('topbar'); if (!el) return;
    el.className = 'topbar';
    const m = !fixed && A.currentMember ? A.currentMember() : null;
    const pic = id => id && A.portraitHTML ? `<span class="chip-pic" aria-hidden="true">${A.portraitHTML(id, {size: 'chip'})}</span>` : '';
    el.innerHTML =
      `<a class="brand" href="${A.homeLink(gameId)}" aria-label="Back to the arcade"><span aria-hidden="true">←</span><span>Arcade</span></a>` +
      `<div class="topbar-right">${extraRightHTML}` +
      (fixed ? `<span class="chip">${pic(portrait)}<span class="sr">Playing </span><span class="chip-name">${fixed}</span></span></div>`
             : `<a class="chip" href="${A.playerLink(gameId)}" title="Change instrument">${pic(m && m.id)}` +
               `<span class="sr">Change instrument. Playing as </span><span class="chip-name">${m ? m.short : inst ? inst.shortName : 'Choose instrument'}</span></a></div>`);
  };
})(window.Arcade);
