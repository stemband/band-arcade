/* Button Masher: the fingering diagrams (drawn in SVG, no images) and the fingering table reader.
   A diagram is a picture of the instrument turned sideways, left hand on the left, with every key a real
   tappable button. Chart-style: finger holes are circles, keys are rounded bars, pressed = filled.
     DIAGRAMS[id]   viewBox, the drawing behind the keys (`body`), and `keys`:
                    {id, x, y, r (round) | w, h (bar), label (on the key), name (spoken / chart text),
                     half: true (tap cycles open -> half -> closed: the oboe and bassoon first finger)}
     Arcade.Masher.diagramSVG(id, {interactive, small})   the SVG (state is set later with setState)
     Arcade.Masher.setState(svg, pressed, {glow, hint})   pressed: {keyId: 1 | 'h'}; glow/hint: a fingering to light up
     Arcade.Masher.table(member)   the member's fingerings from fingerings.js:
                    {diagram, notes(midi) -> [{keys, canon, text}], has(midi)}
     Arcade.Masher.canon(pressed)  the pressed keys as one comparable string ('1h 2 3', 'T 1', 'pos6')
     Arcade.Masher.pressedOf(tokens)  a fingering's tokens as a pressed state, to draw it
   Key ids match the names used in fingerings.js. Change positions here, never the ids. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";

  const hole = (id, x, y, extra) => Object.assign({id, x, y, r: 24, label: id, name: `finger ${id}`}, extra);
  const bar = (id, x, y, label, name, extra) => Object.assign({id, x, y, w: 50, h: 32, label, name}, extra);
  const valve = (id, x, y, name) => ({id, x, y, r: 44, label: id, name: name || `valve ${id}`, valve: true});
  const text = (x, y, s, cls = 'dg-cap') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="middle">${s}</text>`;
  const tube = (x0, x1, y = 120, h = 50) => `<rect class="dg-body" x="${x0}" y="${y - h / 2}" width="${x1 - x0}" height="${h}" rx="${h / 2}"/>`;
  const hands = (l, r) => text(l, 166, 'LEFT HAND', 'dg-hand') + text(r, 166, 'RIGHT HAND', 'dg-hand');

  const DIAGRAMS = {
    flute: {
      view: [0, 30, 720, 240],
      body: tube(24, 700) + '<ellipse class="dg-lip" cx="70" cy="120" rx="16" ry="9"/>' + hands(262, 502) +
        text(125, 250, 'left thumb') + text(372, 250, 'left pinky') + text(630, 250, 'right pinky'),
      keys: [
        bar('T', 98, 204, 'B', 'B thumb key'), bar('Tb', 154, 204, 'B♭', 'B♭ thumb lever'),
        hole('1', 200, 120), hole('2', 262, 120), hole('3', 324, 120),
        bar('G#', 372, 204, 'G♯', 'G♯ key (left pinky)'),
        hole('4', 440, 120), hole('5', 502, 120), hole('6', 564, 120),
        bar('Eb', 630, 204, 'E♭', 'E♭ key (right pinky)'),
      ],
    },
    oboe: {
      view: [0, 30, 720, 240],
      body: tube(30, 700, 120, 46) + '<path class="dg-reed" d="M8 114L36 117V123L8 126Z"/>' + hands(272, 540) +
        text(100, 250, 'left thumb') + text(180, 44, 'side octave') + text(404, 256, 'left pinky') + text(668, 256, 'right pinky'),
      keys: [
        bar('Oct', 100, 204, 'Oct', 'thumb octave key'), bar('Oct2', 180, 62, 'Oct 2', 'side octave key'),
        hole('1', 210, 120, {half: true, name: 'finger 1 (tap again for half-hole)'}), hole('2', 272, 120), hole('3', 334, 120),
        bar('G#', 382, 176, 'G♯', 'G♯ key (left pinky)'), bar('LEb', 382, 216, 'E♭', 'left E♭ key'), bar('LF', 434, 196, 'F', 'left F key'),
        hole('4', 478, 120), hole('5', 540, 120), hole('6', 602, 120),
        bar('REb', 668, 176, 'E♭', 'right E♭ key'), bar('RF', 668, 216, 'F', 'right F key'),
      ],
    },
    clarinet: {
      view: [0, 26, 740, 244],
      body: tube(34, 720, 120, 46) + '<path class="dg-reed" d="M6 112L38 116V124L6 128Z"/>' + hands(272, 548) +
        text(98, 252, 'left thumb') + text(178, 40, 'throat keys') + text(410, 256, 'left pinky') + text(530, 40, 'side keys') + text(686, 256, 'right pinky'),
      keys: [
        bar('Reg', 70, 204, 'Reg', 'register key'), hole('Th', 126, 204, {r: 22, label: 'T', name: 'thumb hole'}),
        bar('G#', 150, 58, 'G♯', 'G♯ key'), bar('A', 206, 58, 'A', 'A key'),
        hole('1', 210, 120), hole('2', 272, 120), hole('3', 334, 120),
        bar('LF#', 384, 176, 'F♯', 'left F♯/C♯ key'), bar('LE', 384, 216, 'E', 'left E/B key'), bar('LF', 436, 196, 'F', 'left F/C key'),
        bar('SEb', 500, 58, 'E♭', 'side E♭/B♭ key'), bar('SBb', 560, 58, 'B♭', 'side B♭ trill key'),
        hole('4', 486, 120), hole('5', 548, 120), hole('6', 610, 120),
        bar('RAb', 664, 176, 'A♭', 'right A♭/E♭ key'), bar('RE', 664, 216, 'E', 'right E/B key'), bar('RF', 712, 196, 'F', 'right F/C key', {w: 44}),
      ],
    },
    sax: {
      view: [0, 20, 740, 250],
      body: tube(30, 720, 120, 46) + hands(262, 552) +
        text(72, 252, 'left thumb') + text(170, 30, 'palm keys') + text(410, 260, 'left pinky') + text(552, 30, 'side keys') + text(690, 260, 'right pinky'),
      keys: [
        bar('Oct', 72, 204, 'Oct', 'octave key (left thumb)'),
        bar('pD', 120, 50, 'D', 'palm D key', {w: 44}), bar('pEb', 170, 44, 'E♭', 'palm E♭ key', {w: 44}), bar('pF', 220, 50, 'F', 'palm F key', {w: 44}),
        bar('fF', 290, 62, 'front F', 'front F key', {w: 70, h: 28}),
        hole('1', 180, 120), hole('bis', 222, 120, {r: 12, label: '', name: 'bis key (small B♭ key)', tag: 'bis'}), hole('2', 264, 120), hole('3', 326, 120),
        bar('G#', 384, 176, 'G♯', 'G♯ key (left pinky)', {w: 46}), bar('LC#', 436, 176, 'C♯', 'low C♯ key', {w: 46}),
        bar('LB', 384, 216, 'B', 'low B key', {w: 46}), bar('LBb', 436, 216, 'B♭', 'low B♭ key', {w: 46}),
        bar('SE', 500, 56, 'E', 'side E key (high E)', {w: 44}), bar('SC', 552, 56, 'C', 'side C key', {w: 44}), bar('SBb', 604, 56, 'B♭', 'side B♭ key', {w: 44}),
        hole('4', 490, 120), hole('5', 552, 120), hole('6', 614, 120),
        bar('REb', 690, 176, 'E♭', 'low E♭ key (right pinky)'), bar('RC', 690, 216, 'C', 'low C key (right pinky)'),
      ],
    },
    bassoon: {
      view: [0, 26, 720, 250],
      body: tube(30, 700, 120, 50) + '<path class="dg-reed" d="M4 116L32 118V122L4 124Z"/>' + hands(272, 532) +
        text(200, 36, 'flick keys (left thumb)') + text(96, 252, 'whisper') + text(386, 262, 'left pinky') + text(505, 262, 'right thumb') + text(660, 262, 'right pinky'),
      keys: [
        bar('W', 96, 204, 'W', 'whisper key (left thumb)'),
        bar('fA', 150, 56, 'A', 'A flick key', {w: 44}), bar('fC', 200, 50, 'C', 'C flick key', {w: 44}), bar('fD', 250, 56, 'D', 'D flick key', {w: 44}),
        hole('1', 210, 120, {half: true, name: 'finger 1 (tap again for half-hole)'}), hole('2', 272, 120), hole('3', 334, 120),
        bar('C#', 386, 180, 'C♯', 'C♯ key (left pinky)', {w: 46}), bar('Eb', 386, 220, 'E♭', 'E♭ key (left pinky)', {w: 46}),
        hole('4', 470, 120), hole('5', 532, 120), hole('6', 594, 120),
        bar('RE', 452, 210, 'E', 'E key (right thumb)', {w: 42}), bar('RF#', 502, 222, 'F♯', 'F♯ key (right thumb)', {w: 42}), bar('RBb', 552, 210, 'B♭', 'B♭ key (right thumb)', {w: 42}),
        bar('F', 660, 180, 'F', 'F key (right pinky)', {w: 46}), bar('Ab', 660, 220, 'A♭', 'A♭ key (right pinky)', {w: 46}),
      ],
    },
    /* valve brass: big piston caps in a row, a sketch of the instrument behind them */
    trumpet: {
      view: [0, 40, 720, 190], brass: true,
      body: '<path class="dg-pipe" d="M40 120H170M510 104H600Q640 104 660 70M510 150H600Q640 150 660 184"/><path class="dg-bell" d="M600 72Q660 60 700 40V210Q660 190 600 180Z"/>' +
        '<rect class="dg-body" x="180" y="92" width="330" height="80" rx="18"/><rect class="dg-mouth" x="18" y="110" width="26" height="20" rx="4"/>',
      keys: [valve('1', 250, 132), valve('2', 346, 132), valve('3', 442, 132)],
    },
    horn: {
      view: [0, 40, 720, 190], brass: true,
      body: '<circle class="dg-coil" cx="400" cy="135" r="92"/><circle class="dg-coil" cx="400" cy="135" r="70"/><path class="dg-bell" d="M520 170Q600 176 690 214H712V96Q640 140 540 146Z"/>' +
        '<rect class="dg-body" x="244" y="92" width="312" height="82" rx="18"/>' + text(140, 222, 'thumb trigger (B♭ side)'),
      keys: [bar('T', 140, 178, 'T', 'thumb trigger (B♭ side)', {w: 84, h: 44}), valve('1', 300, 132), valve('2', 400, 132), valve('3', 500, 132)],
    },
    euph: {
      view: [0, 40, 720, 190], brass: true,
      body: '<path class="dg-bell" d="M640 50Q690 50 710 44V120Q690 110 640 110Z"/><rect class="dg-body" x="130" y="92" width="530" height="80" rx="18"/>' + text(580, 206, '4th valve'),
      keys: [valve('1', 200, 132), valve('2', 296, 132), valve('3', 392, 132), valve('4', 580, 132, 'valve 4 (4th valve)')],
    },
    tuba: {
      view: [0, 40, 720, 190], brass: true,
      body: '<path class="dg-bell" d="M630 46Q690 36 712 28V124Q690 112 630 112Z"/><rect class="dg-body" x="120" y="90" width="540" height="86" rx="22"/>' + text(580, 208, '4th valve'),
      keys: [valve('1', 196, 133), valve('2', 294, 133), valve('3', 392, 133), valve('4', 580, 133, 'valve 4 (4th valve)')],
    },
    /* trombone: the slide, with the seven positions to tap; the brace slides to the one chosen */
    trombone: {
      view: [0, 40, 720, 190], slide: true,
      body: '<path class="dg-pipe" d="M34 96H690Q712 96 712 123Q712 150 690 150H34"/><rect class="dg-mouth" x="12" y="86" width="24" height="20" rx="4"/>' +
        text(52, 190, 'in') + text(660, 190, 'out') + text(380, 222, 'slide positions: tap one'),
      keys: [1, 2, 3, 4, 5, 6, 7].map(p => ({id: 'pos' + p, x: 130 + (p - 1) * 88, y: 123, w: 70, h: 64, label: String(p), name: `${ordinal(p)} position`, pos: true})),
    },
  };
  function ordinal(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }

  /* ---------- drawing ---------- */
  function keySVG(k, interactive) {
    const attrs = interactive ? ` role="button" tabindex="0" aria-label="${k.name}" aria-pressed="false"` : '';
    let shape, hit;
    if (k.r) {
      shape = `<circle class="k-base" cx="${k.x}" cy="${k.y}" r="${k.r}"/>` +
        (k.half ? `<path class="k-half" d="M${k.x} ${k.y - k.r}A${k.r} ${k.r} 0 0 0 ${k.x} ${k.y + k.r}Z"/>` : '') +
        `<circle class="k-fill" cx="${k.x}" cy="${k.y}" r="${k.r}"/>`;
      const hr = Math.max(k.r + 6, 26);
      hit = `<circle class="k-hit" cx="${k.x}" cy="${k.y}" r="${hr}"/>`;
    } else {
      const x = k.x - k.w / 2, y = k.y - k.h / 2, rx = Math.min(k.h / 2, 14);
      shape = `<rect class="k-base" x="${x}" y="${y}" width="${k.w}" height="${k.h}" rx="${rx}"/><rect class="k-fill" x="${x}" y="${y}" width="${k.w}" height="${k.h}" rx="${rx}"/>`;
      hit = `<rect class="k-hit" x="${x - 4}" y="${y - 6}" width="${k.w + 8}" height="${k.h + 12}" rx="${rx}"/>`;
    }
    const lbl = k.label ? `<text class="k-lbl${k.label.length > 3 ? ' long' : ''}" x="${k.x}" y="${k.y + (k.valve ? 10 : 5)}" text-anchor="middle">${k.label}</text>` : '';
    const tag = k.tag ? `<text class="dg-cap" x="${k.x}" y="${k.y + k.r + 18}" text-anchor="middle">${k.tag}</text>` : '';
    return `<g class="key${k.valve ? ' valve' : ''}${k.pos ? ' pos' : ''}${k.half ? ' halfable' : ''}" data-k="${k.id}" data-state="0"${attrs}>${hit}${shape}${lbl}</g>${tag}`;
  }
  function diagramSVG(id, {interactive = false, label = ''} = {}) {
    const D = DIAGRAMS[id]; if (!D) return '';
    const [x, y, w, h] = D.view;
    const handle = D.slide ? `<g class="dg-brace" aria-hidden="true"><rect x="-10" y="84" width="20" height="78" rx="6"/><path d="M0 96V150"/></g>` : '';
    return `<svg class="diagram dg-${id}" viewBox="${x} ${y} ${w} ${h}" ${interactive ? 'role="group"' : 'role="img"'} aria-label="${label || 'Fingering diagram'}">` +
      `<g class="dg-draw" aria-hidden="true">${D.body}</g>${handle}` + D.keys.map(k => keySVG(k, interactive)).join('') + `</svg>`;
  }

  /** show a state on a drawn diagram. pressed {id: 1|'h'}; glow / hint: a list of fingering tokens ('1h', 'T', 'pos6') */
  function setState(svg, pressed, {glow = null, hint = null} = {}) {
    if (!svg) return;
    const g = pressedOf(glow || []), h = pressedOf(hint || []);
    svg.querySelectorAll('.key').forEach(el => {
      const id = el.dataset.k, s = pressed[id] || 0;
      el.dataset.state = String(s);
      if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', s === 'h' ? 'mixed' : s ? 'true' : 'false');
      el.classList.toggle('glow', !!g[id]); el.dataset.glow = g[id] ? String(g[id]) : '';
      el.classList.toggle('hint', !!h[id]); el.dataset.hint = h[id] ? String(h[id]) : '';
    });
    const brace = svg.querySelector('.dg-brace');                 // trombone: move the slide brace
    if (brace) {
      const k = Object.keys(pressed)[0] || (glow && glow[0]), key = k && DIAGRAMS.trombone.keys.find(x => x.id === k);
      brace.style.transform = `translateX(${key ? key.x : 60}px)`;
      brace.classList.toggle('on', !!key);
    }
  }

  /** a fingering token -> {id, half}: only a finger number followed by h ('1h') is a half-hole ('Th' is the clarinet thumb) */
  function split(t) { const m = /^(\d)h$/.exec(t); return m ? {id: m[1], half: true} : {id: t, half: false}; }

  /** fingering tokens -> a pressed state {id: 1 | 'h'} (to draw a fingering on a diagram) */
  function pressedOf(toks) { const m = {}; toks.forEach(k => { const s = split(k); m[s.id] = s.half ? 'h' : 1; }); return m; }

  /* ---------- the fingering table ---------- */
  const {parseNote, writtenMidi} = A.music;
  /** one fingering from fingerings.js -> sorted tokens ('1h', '2', 'T', 'pos6') */
  function tokens(diagram, f) {
    const D = DIAGRAMS[diagram];
    if (D.slide) return ['pos' + f];
    if (D.brass) {
      const s = String(f).trim(), trig = /^T/.test(s), v = s.replace(/^T/, '');
      const out = v === '0' || v === '' ? [] : v.split('-');
      return (trig ? ['T'] : []).concat(out).sort();
    }
    return String(f).split(/\s+/).filter(t => t && t !== '|').sort();
  }
  const canonOf = toks => toks.slice().sort().join(' ');
  /** the pressed keys as a canonical string */
  const canon = pressed => canonOf(Object.keys(pressed).filter(k => pressed[k]).map(k => pressed[k] === 'h' ? k + 'h' : k));

  /** readable text for one fingering: '1-3', 'open', 'trigger + 1-2', '6th position', 'Oct + 1 2 3 | 4' */
  function describe(diagram, f) {
    const D = DIAGRAMS[diagram];
    if (D.slide) return `${ordinal(f)} position`;
    if (D.brass) {
      const s = String(f), trig = /^T/.test(s), v = s.replace(/^T/, '');
      return (trig ? 'trigger' + (v === '0' ? ' only' : ' + ') : '') + (v === '0' ? (trig ? '' : 'open') : v);
    }
    const byId = {}; D.keys.forEach(k => { byId[k.id] = k; });
    const parts = String(f).split(/\s+/).filter(Boolean).map(t => {
      if (t === '|') return '|';
      const {id, half} = split(t), k = byId[id];
      if (!k) return t;
      if (/^[1-6]$/.test(k.id)) return half ? '½' + k.id : k.id;
      return k.name.replace(/ \(.*\)$/, '');
    });
    const num = t => /^½?\d$/.test(t);
    let s = '';
    parts.forEach((t, i) => { const p = parts[i - 1]; s += i === 0 ? t : (t === '|' || p === '|' || (num(t) && num(p))) ? ' ' + t : ', ' + t; });
    s = s.replace(/^\| | \|$/g, '').trim();
    return s === '' || s === '|' ? 'all keys open' : s.charAt(0).toUpperCase() + s.slice(1);
  }

  const cache = {};
  function table(member) {
    if (cache[member.id]) return cache[member.id];
    const src = (window.MASHER_FINGERINGS || {})[member.id] || {diagram: 'none', notes: {}};
    const diagram = src.diagram, byMidi = {};
    const known = DIAGRAMS[diagram] ? new Set(DIAGRAMS[diagram].keys.map(k => k.id)) : new Set();
    Object.keys(src.notes).forEach(name => {
      let midi;
      try { midi = writtenMidi(parseNote(name)); } catch (e) { warn(`${member.id}: "${name}" is not a note name`); return; }
      byMidi[midi] = src.notes[name].map(f => {
        const keys = tokens(diagram, f);
        keys.forEach(k => { if (!known.has(split(k).id)) warn(`${member.id} ${name}: "${f}" uses "${k}", which is not a key on the ${diagram} diagram`); });
        return {keys, canon: canonOf(keys), text: describe(diagram, f), raw: f};
      });
    });
    return (cache[member.id] = {diagram, notes: midi => byMidi[midi] || [], has: midi => !!byMidi[midi]});
  }
  function warn(msg) { if (window.console) console.warn('Button Masher fingerings.js: ' + msg); }

  A.Masher = {DIAGRAMS, diagramSVG, setState, table, canon, describe, ordinal, pressedOf};
})(window.Arcade);
