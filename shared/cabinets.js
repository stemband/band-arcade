/* Band Arcade — arcade cabinets, drawn in SVG + HTML (no image files).
   Used by the arcade floor (home page) and the Select Player page.
   A game picks its look with the `cabinet` field in shared/games.js; this file holds the
   pieces it picks from:
     SHAPES   silhouettes. Each is drawn on a 300 × 600 grid (the cabinet's own units).
              outline  the whole cabinet seen from the front, side panels included (gets the neon tube)
              face     the front board, inside the side panels
              bezel    the dark surround the screen sits in
              panel    the control panel (a trapezoid; taller = steeper), lip = its front edge
              joy      joystick [x, y];  btns  buttons [[x, y], …]
              door     coin door {x, y, w, h} (and `doorPath` for an odd shape);  kick  kick plate [x1, x2]
              extras   optional extra SVG (decals, lights), drawn last
              slots    where the HTML parts go, as [x, y, w, h]: marquee, screen, start
     SCREENS  attract-mode loops for the screen: html(game, i) draws frame i; `period` (ms) is how
              often the front cabinet redraws. Loops without a period are pure CSS.
   Styles live in shared/cabinets.css. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const TRIMS = ['pink', 'cyan', 'yellow', 'purple', 'amber', 'green', 'red', 'white'];
  const MARQUEES = ['bungee', 'haunt', 'pixel', 'shade', 'dojo'];

  /* ---------- silhouettes ---------- */
  const SHAPES = {
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
  };

  function doorSVG(s) {
    const d = s.door, cx = d.x + d.w / 2;
    const body = s.doorPath ? `<path class="s-door" d="${s.doorPath}"/>` : `<rect class="s-door" x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="5"/>`;
    const sy = d.y + d.h * .34;
    return body +
      `<rect class="s-coin" x="${cx - 30}" y="${sy}" width="22" height="26" rx="3"/><rect class="s-coin" x="${cx + 8}" y="${sy}" width="22" height="26" rx="3"/>` +
      `<line class="s-slit" x1="${cx - 19}" y1="${sy + 6}" x2="${cx - 19}" y2="${sy + 20}"/><line class="s-slit" x1="${cx + 19}" y1="${sy + 6}" x2="${cx + 19}" y2="${sy + 20}"/>` +
      `<rect class="s-return" x="${cx - 16}" y="${d.y + d.h * .74}" width="32" height="12" rx="2"/>`;
  }

  function shellSVG(s) {
    const [jx, jy] = s.joy;
    return `<svg class="cab-shell" viewBox="0 0 300 600" aria-hidden="true" focusable="false">` +
      `<path class="s-side" d="${s.outline}"/>` +
      `<path class="s-face" d="${s.face}"/>` +
      `<path class="s-tube-glow" d="${s.outline}"/><path class="s-tube" d="${s.outline}"/>` +
      `<path class="s-bezel" d="${s.bezel}"/>` +
      `<path class="s-panel" d="${s.panel}"/><path class="s-lip" d="${s.lip}"/>` +
      `<ellipse class="s-joybase" cx="${jx}" cy="${jy + 6}" rx="18" ry="7"/><line class="s-shaft" x1="${jx}" y1="${jy + 5}" x2="${jx}" y2="${jy - 12}"/>` +
      `<circle class="s-ball" cx="${jx}" cy="${jy - 15}" r="9"/><circle class="s-shine" cx="${jx - 3}" cy="${jy - 18}" r="3"/>` +
      s.btns.map(([x, y], i) => `<ellipse class="s-btn s-btn${i}" cx="${x}" cy="${y}" rx="10" ry="7"/><ellipse class="s-shine" cx="${x - 2}" cy="${y - 2}" rx="4" ry="2"/>`).join('') +
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
      kicker: c.kicker || '',
      screen: SCREENS[c.screen] ? c.screen : 'insert',
    };
  };
  const pos = ([x, y, w, h]) => `left:${x / 3}%;top:${y / 6}%;width:${w / 3}%;height:${h / 6}%`;

  /** the lit marquee (game name, and the ghost mascot for the haunted style) */
  A.marqueeHTML = function (g, tag = 'p') {
    const c = A.cabinetOf(g);
    return `<${tag} class="mq mq-${c.marquee}">` +
      (c.marquee === 'haunt' ? `<span class="mq-mascot" aria-hidden="true">${A.ghostSVG('', '')}</span>` : '') +
      (c.marquee === 'dojo' && A.ninjaSVG ? `<span class="mq-mascot mq-ninja" aria-hidden="true">${A.ninjaSVG({belt: 'belt-black'})}</span>` : '') +
      `<span class="mq-text">${c.kicker ? `<span class="mq-kicker">${esc(c.kicker)}</span>` : ''}` +
      `<span class="mq-name">${esc(g.name)}</span></span></${tag}>`;
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

  /* Attract mode: only one cabinet (the one in front) animates. CSS runs the loops for
     `.cab.attract`; screens with a `period` are also redrawn on a timer. */
  let attractTimer = 0;
  A.setAttract = function (cabEl, g) {
    clearInterval(attractTimer);
    document.querySelectorAll('.cab.attract').forEach(el => el.classList.remove('attract'));
    if (!cabEl || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cabEl.classList.add('attract');
    const c = A.cabinetOf(g), scr = SCREENS[c.screen], box = cabEl.querySelector('.cab-screen');
    if (!scr.period) return;
    let i = 0;
    box.innerHTML = scr.html(g, i);
    attractTimer = setInterval(() => { if (!document.hidden) box.innerHTML = scr.html(g, ++i); }, scr.period);
  };

  A.CAB_SHAPES = SHAPES;
  A.CAB_SCREENS = SCREENS;
})(window.Arcade);
