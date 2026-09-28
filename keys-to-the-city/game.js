/* Keys to the City: a piano-keyboard note-reading game in a neon city at night. The keyboard is the skyline: black
   keys are skyscrapers with windows, white keys the lit streets between them. THE CHOPSTICKS (every group of 2 black
   keys) and THE FORK (every group of 3) are neon signs above the keys; C is right next to the Chopsticks, F right next
   to the Fork. Those are the only two names the black-key groups ever get.
     levels.js  THE CITY MAP (districts), rules, Night Shift · quiz.js: the music model and the round maker
   Question types (mixed in a district): FIND THE KEY (a note on the staff → tap that exact key), NAME THE KEY (a key
   lights up → its letter name), FULL CIRCUIT (name it, then put it on the staff), SCALE BUILDER (a key signature → the
   major scale, one octave up; never in timed play).
   EARLY DISTRICTS: "C" and "F" plates on every C and F key (levels.js `labels`), in the signs' colors. The signs can be
   TAPPED for their spoken hint (kttc-mayor-chopsticks / -fork) while they are visible; a tap is never an answer.
   TOUCH mode (the default): no instrument, no microphone; a tapped key plays a piano tone (Sfx.piano).
   INSTRUMENT mode: FIND THE KEY rounds are answered by PLAYING the note (the microphone, any octave); no piano tone
   or any other pitched sound ever plays then (the effects are unpitched noise). Needs a pitched instrument.
   Progress: setLevel('keys-to-the-city', 'all', district, {stars, best}) (games.js player: 'all'); stars count in
   either mode. Clearing The Mayor's Challenge sets gameData.achievements.mayor (the Golden City Key + City Skyline). */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'keys-to-the-city';
  const LEVELS = window.KTTC_LEVELS, RULES = window.KTTC_RULES, NIGHT = window.KTTC_NIGHT, K = A.KTTC;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const mod = (a, n) => ((a % n) + n) % n;
  const GOLD = '#c98a12', MISS = '#d0503f';          // the staff's found / missed note colors (as in every game)

  const savedMember = () => { const m = A.store.player && A.memberById(A.store.player); return m || null; };
  const playable = m => !!m && m.pitched !== false;                     // instrument mode needs a pitched instrument
  const member = savedMember();
  A.mountTopbar(null, '', GAME_ID, {fixed: member ? member.short : 'Piano'});
  $('demoHelp').hidden = !A.DEMO;
  A.Sfx.use('endless');

  /* ---------- saved choices: gameData('keys-to-the-city') = {mode, clef, achievements, cleared} ---------- */
  const gd = () => A.store.gameData(GAME_ID);
  const save = patch => { Object.assign(gd(), patch); A.store.saveGameData(GAME_ID); };
  let mode = gd().mode === 'inst' && playable(member) ? 'inst' : 'touch';
  let clefPref = gd().clef || (member && member.pitched !== false ? (A.groupsOf(member.id)[0] || {}).clef : null) || 'treble';
  const group = member && playable(member) ? A.groupFor(member.id, {hornStart: A.store.hornStart}) : null;
  if (group) A.Pitch.setInstrument(group);

  /* ================= THE MAYOR (an original character: a cheerful cat in a top hat and a sash) ================= */
  function mayorSVG(mood = 'happy') {
    const mouth = mood === 'oops' ? '<path class="my-line" d="M44 70q6-4 12 0"/>' : '<path class="my-line" d="M42 67q8 8 16 0"/>';
    const arm = mood === 'point' ? '<path class="my-fur" d="M70 84l22-14 4 6-20 14z"/><circle class="my-fur" cx="94" cy="72" r="5"/>' :
      mood === 'cheer' ? '<path class="my-fur" d="M70 82l16-26 6 3-14 28z"/><circle class="my-fur" cx="89" cy="56" r="5"/><path class="my-key" d="M89 50v-14m0 0h6m-6 5h5"/><circle class="my-keyring" cx="89" cy="31" r="5"/>' :
      '<path class="my-fur" d="M70 84l14 8-3 6-14-7z"/>';
    return `<svg viewBox="0 0 100 110" class="mayor-svg">` +
      `<rect class="my-hat" x="30" y="4" width="40" height="26" rx="3"/><rect class="my-hat" x="22" y="28" width="56" height="6" rx="3"/><rect class="my-band" x="30" y="22" width="40" height="5"/>` +
      `<path class="my-fur" d="M28 44l-4-16 14 8zM72 44l4-16-14 8z"/>` +
      `<ellipse class="my-fur" cx="50" cy="58" rx="26" ry="23"/><ellipse class="my-muzzle" cx="50" cy="66" rx="12" ry="8"/>` +
      `<ellipse class="my-eye" cx="40" cy="54" rx="4" ry="${mood === 'cheer' ? 2 : 4.5}"/><ellipse class="my-eye" cx="60" cy="54" rx="4" ry="${mood === 'cheer' ? 2 : 4.5}"/>` +
      `<circle class="my-shine" cx="41.5" cy="52.5" r="1.2"/><circle class="my-shine" cx="61.5" cy="52.5" r="1.2"/>` +
      `<path class="my-nose" d="M47 61h6l-3 3z"/>${mouth}<path class="my-whisk" d="M34 64l-12-2M34 67l-12 2M66 64l12-2M66 67l12 2"/>` +
      `<path class="my-coat" d="M26 110q2-30 24-30t24 30z"/><path class="my-sash" d="M34 84l32 24h-9l-28-20z"/><circle class="my-medal" cx="50" cy="92" r="4"/>` +
      arm + `</svg>`;
  }
  $('hubMayor').innerHTML = mayorSVG('happy');
  function say(text, mood = 'happy', voice) {
    $('mayor').innerHTML = mayorSVG(mood);
    $('say').textContent = text;
    if (voice && !A.Pitch.listening()) A.Sfx.event(voice);            // the Mayor's voice slots never play while listening
  }

  /* ================= THE SIGNS: THE CHOPSTICKS (2 black keys) and THE FORK (3 black keys) ================= */
  const CHOP = '<path d="M-17 -14L-4 17M17 -14L4 17"/>';
  const FORK = '<path d="M-12 -16V-4M0 -16V-4M12 -16V-4M-12 -4Q-12 4 0 4Q12 4 12 -4M0 4V18"/>';
  function signSVG(kind, x, y, s = 1) {
    const icon = kind === 'chop' ? CHOP : FORK, wide = kind === 'chop' ? 86 : 66;
    return `<g class="kt-sign ${kind}" transform="translate(${x} ${y}) scale(${s})">` +
      `<rect class="sg-board" x="${-wide / 2}" y="-30" width="${wide}" height="72" rx="10"/>` +
      `<g class="sg-glow">${icon}</g><g class="sg-icon">${icon}</g>` +
      `<text class="sg-name" y="34" text-anchor="middle">${kind === 'chop' ? 'CHOPSTICKS' : 'FORK'}</text></g>`;
  }
  /* the level intro's MINI KEYBOARD: one octave (C to C), the Chopsticks over the 2 black keys and the Fork over the 3,
     each with a line down to its key (C / F, lit in the sign's color) */
  function miniKeyboard() {
    const w = 40, bw = 23, bh = 72, top = 88, wh = 116, xs = p => [0, 2, 4, 5, 7, 9, 11, 12].indexOf(p);
    let white = '', black = '';
    [0, 2, 4, 5, 7, 9, 11, 12].forEach((p, i) => {
      const cls = p === 0 ? ' c' : p === 5 ? ' f' : '';
      white += `<rect class="mk-w${cls}" x="${i * w + 1}" y="${top}" width="${w - 2}" height="${wh}" rx="4"/>`;
      if (cls) white += `<text class="mk-l${cls}" x="${i * w + w / 2}" y="${top + wh - 12}" text-anchor="middle">${p === 0 ? 'C' : 'F'}</text>`;
    });
    const bx = {1: 0, 3: 1, 6: 3, 8: 4, 10: 5};
    Object.keys(bx).forEach(p => { const cx = bx[p] * w + w + BOFF[p] * w; black += `<rect class="mk-b" x="${cx - bw / 2}" y="${top - 2}" width="${bw}" height="${bh}" rx="3"/>`; });
    const chopX = (w + BOFF[1] * w + 2 * w + BOFF[3] * w) / 2, forkX = 4 * w + w;
    // a line from each sign down to the part of its key that shows between the black keys (the top-left corner)
    const line = (kind, x1, y1, x2, y2) => `<path class="mk-line ${kind}" d="M${x1} ${y1}Q${x1} ${(y1 + y2) / 2} ${x2} ${y2 - 6}"/><path class="mk-arrow ${kind}" d="M${x2 - 6} ${y2 - 12}L${x2} ${y2 - 2}L${x2 + 6} ${y2 - 12}"/>`;
    return `<svg viewBox="-14 -2 348 212" class="kt-minikb" role="img" aria-label="One octave of piano keys: the Chopsticks sign over the 2 black keys points to C, the Fork sign over the 3 black keys points to F">` +
      white + black + signSVG('chop', chopX, 38, .62) + signSVG('fork', forkX, 38, .62) +
      line('chop', chopX - 22, 62, 11, top + 16) + line('fork', forkX - 16, 62, 4 * w - 29, top + 16) + `</svg>` +
      `<p class="mk-cap"><span class="chop">C is right next to the Chopsticks</span><span class="fork">F is right next to the Fork</span></p>`;
  }

  /* ================= THE SKYLINE KEYBOARD ================= */
  const W = 100, BW = 58, BHK = .63;                                   // SVG units: a white key's width, a black key's width, a black key's length (× white)
  let WH = 360, BH = 228, SKY = 150;                                   // white key length, black key length, the sky above (shorter on short screens)
  const BOFF = {1: -.13, 3: .13, 6: -.16, 8: 0, 10: .16};               // real pianos: the black keys sit off-center in their groups
  const KB = {keys: new Map(), lo: 0, hi: 0, x: 0, px: 60, view: 0, total: 0, signs: 1, labels: 0};
  const whiteIndex = m => { const o = Math.floor(m / 12), p = mod(m, 12); return o * 7 + [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][p]; };
  function buildKeyboard(lo, hi) {
    // whole octaves: from the C at or below lo to the B at or above hi (a C on top when hi is a C)
    lo = lo - mod(lo, 12); hi = hi + (mod(hi, 12) === 0 ? 0 : 11 - mod(hi, 12));
    KB.lo = lo; KB.hi = hi;
    renderKeyboard();
    sizeKeyboard();
  }
  function renderKeyboard() {
    const lo = KB.lo, hi = KB.hi;
    BH = Math.round(WH * BHK);
    KB.keys.clear();
    const w0 = whiteIndex(lo), nW = whiteIndex(hi) - w0 + 1, width = nW * W, rnd = i => (Math.sin(i * 91.7) + 1) / 2;
    let whites = '', blacks = '', roofs = '', signs = '', labels = '';
    for (let m = lo; m <= hi; m++) {
      const p = mod(m, 12), wi = whiteIndex(m) - w0;
      if (!K.isBlack(m)) {
        const x = wi * W;
        whites += `<g class="k white" data-midi="${m}"><rect class="k-body" x="${x + 1}" y="${SKY}" width="${W - 2}" height="${WH}" rx="6"/>` +
          `<path class="k-curb" d="M${x + 12} ${SKY + WH - 34}H${x + W - 12}"/><path class="k-lane" d="M${x + W / 2} ${SKY + WH - 150}V${SKY + WH - 44}"/>` +
          `<text class="k-name" x="${x + W / 2}" y="${SKY + WH - 60}" text-anchor="middle"></text></g>`;
        // the C and F plates (early districts): a small sign in the Chopsticks' / the Fork's color at the bottom of the key
        if (p === 0 || p === 5) { const k = p === 0 ? 'c' : 'f';
          labels += `<g class="kt-cf ${k}"><rect x="${x + W / 2 - 28}" y="${SKY + WH - 58}" width="56" height="46" rx="8"/>` +
            `<text x="${x + W / 2}" y="${SKY + WH - 21}" text-anchor="middle">${p === 0 ? 'C' : 'F'}</text></g>`; }
      } else {
        const cx = wi * W + W + BOFF[p] * W, x = cx - BW / 2;
        let win = '';
        for (let r = 0, rows = Math.max(3, Math.floor((BH - 30) / 22)); r < rows; r++) for (let c = 0; c < 2; c++) win += `<rect class="win" x="${x + 12 + c * 20}" y="${SKY + 16 + r * 22}" width="13" height="12" rx="1.5"/>`;
        blacks += `<g class="k black" data-midi="${m}"><rect class="k-body" x="${x}" y="${SKY - 2}" width="${BW}" height="${BH}" rx="4"/>${win}` +
          `<text class="k-name" x="${cx}" y="${SKY + BH - 18}" text-anchor="middle"></text></g>`;
        const rh = 26 + Math.round(rnd(m) * 46);                           // a rooftop, a little different on every building
        roofs += `<g class="roof"><rect x="${x + 8}" y="${SKY - rh * .45}" width="${BW - 16}" height="${rh * .45}"/><path d="M${cx} ${SKY - rh * .45}V${SKY - rh}"/><circle cx="${cx}" cy="${SKY - rh}" r="3"/></g>`;
        // the signs: over the middle of each group, each with a big invisible tap area (the sky above its group; it
        // ends above the rooftops' keys, so it never covers a black key)
        if (p === 1) { const sx = (cx + (wi * W + W + BOFF[3] * W + W)) / 2; signs += `<rect class="sg-hit" data-sign="chop" x="${sx - 62}" y="0" width="124" height="${SKY - 8}"/>` + signSVG('chop', sx, 58); }
        if (p === 8) signs += `<rect class="sg-hit" data-sign="fork" x="${cx - 72}" y="0" width="144" height="${SKY - 8}"/>` + signSVG('fork', cx, 58);
      }
      KB.keys.set(m, null);
    }
    const svg = `<svg class="kt-kb" viewBox="0 0 ${width} ${SKY + WH}" role="group" aria-label="Piano keyboard">` +
      `<g class="sky-roofs" aria-hidden="true">${roofs}</g><g class="sky-signs" id="signs" aria-hidden="true">${signs}</g>${whites}` +
      `<g class="kt-cfl" id="cfLabels" aria-hidden="true">${labels}</g>${blacks}</svg>`;
    $('kbStrip').innerHTML = svg;
    KB.total = nW;
    $('kbStrip').querySelectorAll('.k').forEach(g => KB.keys.set(+g.dataset.midi, g));
    setSigns(KB.signs); setLabels(KB.labels);                            // a redrawn keyboard keeps the brightness it had
    if (G && G.r) relight();
  }
  /* the key size: as many whites as the district wants on screen, never under RULES.minKeyPx, capped by the height */
  function sizeKeyboard(view = KB.view) {
    const box = $('kbView'), cw = box.clientWidth || innerWidth - 32;
    // the height left under the staff (the page doesn't scroll during play), never more than half the screen
    const avail = Math.max(160, Math.min(innerHeight * .5, innerHeight - $('city').getBoundingClientRect().top - $('playFoot').offsetHeight - 18));
    const want = Math.min(KB.total, view || KB.total);
    let px = Math.max(RULES.minKeyPx, Math.min(96, cw / want));
    const tallest = avail / 2.9;                                        // keys never so wide that they can't be ~3× as tall
    px = Math.max(RULES.minKeyPx, Math.min(px, tallest));
    if (KB.total * px < cw) px = Math.max(RULES.minKeyPx, Math.min(cw / KB.total, 96, tallest));   // everything fits: fill the width
    KB.px = px; KB.view = view;
    // a short screen: the keys get SHORTER (never narrower than a finger): the white key's length follows the height left
    const room = avail * W / px, sky = Math.max(96, Math.min(150, room * .3)), wh = Math.max(190, Math.min(360, room - sky));
    if (Math.abs(wh - WH) > 6 || Math.abs(sky - SKY) > 6) { WH = Math.round(wh); SKY = Math.round(sky); renderKeyboard(); }
    const svg = $('kbStrip').firstChild; if (!svg) return;
    svg.style.width = KB.total * px + 'px'; svg.style.height = (SKY + WH) * px / W + 'px';
    box.style.height = (SKY + WH) * px / W + 'px';
    pan(null, true);
  }
  /** pan so these keys are on screen. random: put them at a random place (FIND THE KEY must not give the key away) */
  function pan(range, instant, random) {
    const box = $('kbView'), cw = box.clientWidth, full = KB.total * KB.px;
    let x = full < cw ? -(cw - full) / 2 : 0;                            // a keyboard narrower than the screen sits in the middle
    if (full > cw) {
      const w0 = whiteIndex(KB.lo);
      const [a, b] = range || [KB.panLo != null ? KB.panLo : KB.lo, KB.panHi != null ? KB.panHi : KB.hi];
      const xa = (whiteIndex(a) - w0) * KB.px, xb = (whiteIndex(b) - w0 + 1) * KB.px;
      const room = cw - (xb - xa);
      x = room > 0 ? xa - room * (random ? Math.random() : .5) : xa;
      x = Math.max(0, Math.min(full - cw, x));
      if (range) { KB.panLo = a; KB.panHi = b; }
    }
    KB.x = x;
    const s = $('kbStrip');
    s.style.transition = instant || RM.matches ? 'none' : '';
    s.style.transform = `translateX(${-x.toFixed(1)}px)`;
  }
  const keyEl = m => KB.keys.get(m);
  function relight() { const r = G.r; if (!G.done && (r.type === 'name' || r.type === 'circuit')) mark(r.target.midi, 'lit'); }
  function clearKeys() { KB.keys.forEach(g => { if (g) { g.classList.remove('lit', 'good', 'bad', 'answer', 'blk', 'done'); g.querySelector('.k-name').textContent = ''; } }); }
  function mark(m, cls, name) { const g = keyEl(m); if (!g) return; g.classList.add(cls); if (name) g.querySelector('.k-name').textContent = name; }
  /* a right answer lights up its block: the Chopsticks' block (C–E) or the Fork's block (F–B), a gentle glow */
  function lightBlock(m) {
    const p = mod(m, 12), base = m - p, [a, b] = p < 5 ? [0, 4] : [5, 11];
    for (let k = base + a; k <= base + b; k++) { const g = keyEl(k); if (g) { g.classList.remove('blk'); void g.getBBox; g.classList.add('blk'); } }
    setTimeout(() => KB.keys.forEach(g => g && g.classList.remove('blk')), 1400);
  }
  /* the signs' and the C/F plates' brightness; a sign can be tapped only while it can be seen (RULES.signTapFrom) */
  function setSigns(o) { KB.signs = o; const s = $('signs'); if (s) { s.style.opacity = String(o); s.classList.toggle('tap', o >= RULES.signTapFrom); } }
  function setLabels(o) { KB.labels = o; const s = $('cfLabels'); if (s) s.style.opacity = String(o); }

  /* ================= THE STAFF =================
     The drawing is laid out from the DISTRICT, never from the round's note, so it doesn't jump: its WIDTH leaves room
     for the district's widest key signature, its HEIGHT fits the district's whole range in this clef (stems and ledger
     lines included; SCALE BUILDER rounds also their scale's top, at most a 4th above the range), centered with even
     padding above and below (the answer's name goes in the bottom padding, under the note). The note sits in the middle of the open space after the clef
     and key signature (a wider key signature moves it right). It is sized in px as large as the box's width and
     STAFF_MAXH allow; the white box hugs it with even padding, and the space under the box makes up the district's
     tallest layout, so the keyboard below never moves. A round that doesn't use the letter pad lends the pad's space to
     the staff. */
  const MID = 88, CLEF_END = 56, OPEN = 236, SCALE_OPEN = 300, VPAD = 18, SIG_GAP = 12;
  const STAFF_MAXH = [130, .27, 270];                                    // px: clamp(min, share of the screen height, max)
  const STAFF_MAXH_LENT = [130, .30, 300];                               // the same when the round has the letter pad's space too
  const OLD_MAXH = [110, .21, 210];                                      // the old staff's height cap: the staff is never drawn smaller than it was
  /** the old drawing's height (360 wide, sized from the round's range + 34 for captions): the scale it had is the floor */
  function oldHeight(L, clef, scale) {
    const [a, b] = K.rangeOf(L, clef), ys = [K.spell(a, '#'), K.spell(b + (scale ? 12 : 0), '#')].map(n => A.noteY(clef, n));
    const top = Math.min(30, ...ys.map(y => y > MID ? y - 60 : y - 14)), bot = Math.max(146, ...ys.map(y => y > MID ? y + 14 : y + 60)) + 34;
    return bot - top;
  }
  const KB_MIN = 160;                                                    // the keyboard's smallest height (sizeKeyboard): the staff grows only while it fits
  const stepNote = (clef, step) => ({letter: K.LETTERS[mod(step, 7)], acc: 0, oct: Math.floor(step / 7)});
  const openFrom = (clef, sig) => sig && sig.count ? (clef === 'bass' ? 60 : 54) + sig.count * SIG_GAP + 6 : CLEF_END;
  const clefsOf = L => L.clefs === 'pref' ? (clefPref === 'both' ? ['treble', 'bass'] : [clefPref]) : L.clefs;
  /** the staff layout of district L in a clef, for a round type ('scale' or any other): {W, box: [top, height], capY} */
  function staffLayout(L, clef, type) {
    const maxSig = Math.max(0, ...(L.keySigs || []).map(k => K.KEYS[k].sig.count)), scale = type === 'scale';
    const W = openFrom(clef, maxSig ? {count: maxSig} : null) + (scale ? SCALE_OPEN : OPEN);
    const [a, b] = K.rangeOf(L, clef);
    let [lo, hi] = clef === 'bass' ? [52, 120] : [34, 136];             // the staff and the clef (the treble clef reaches past it)
    // accidentals (black keys, key signatures' naturals): a ♯ on the lowest note reaches ~1.5 spaces below it; the top of
    // a range is a white key, so a ♭ can only sit a step lower and reaches ~1 space above the top note
    const acc = L.keys !== 'white' || !!L.keySigs;
    [K.spell(a, '#'), K.spell(b + (scale ? 5 : 0), 'b')].forEach((n, i) => {   // quiz.js: a scale's top is at most a 4th above
      const y = A.noteY(clef, n);                                         // stem up below the middle line
      lo = Math.min(lo, y > MID ? y - 52 : y - 8, acc && i ? y - 16 : y); hi = Math.max(hi, y > MID ? y + 8 : y + 52, acc && !i ? y + 26 : y);
    });
    return {W, box: [lo - VPAD, hi - lo + 2 * VPAD], capY: hi + VPAD - 4, clef, scale, sigW: maxSig ? 14 + maxSig * SIG_GAP : 0};   // everything it can show, centered, even padding
  }
  /** every layout the district can show (its clefs × SCALE BUILDER or not) */
  const layoutsOf = L => clefsOf(L).flatMap(c => [staffLayout(L, c, 'find')].concat(L.types.scale ? [staffLayout(L, c, 'scale')] : []));
  /** the x of a single note: the middle of the open space (an accidental in front counts as part of the note) */
  const noteX = (r, n, lay) => (openFrom(r.clef, r.sig) + lay.W - 8) / 2 + (n.acc || n.natural ? 11 : 0);
  function drawStaff(r, items = [], opts = {}) {
    const lay = staffLayout(G.L, r.clef, r.type);
    const x0 = opts.gap ? (openFrom(r.clef, r.sig) + lay.W - 8) / 2 - opts.gap * 3.5 + 6 : null;
    const it = items.map((n, k) => Object.assign({x: x0 != null ? x0 + k * opts.gap : noteX(r, n.n, lay), id: 'sn' + k}, n));
    $('staff').innerHTML = A.staffSVG(r.clef, it, {width: lay.W, keySig: r.sig, box: lay.box, capY: lay.capY, label: opts.label || 'The staff'});
    G.lay = lay;
    sizeStaff();
  }
  /* the drawing in px: as large as the box's width and STAFF_MAXH allow; the box: the district's tallest layout */
  function sizeStaff() {
    const svg = $('staff').querySelector('svg'); if (!svg || !G || !G.lay) return;
    const wrap = $('stage').parentElement.clientWidth - 18;
    const clamp = ([a, v, b]) => Math.max(a, Math.min(b, innerHeight * v));
    // THE LETTER PAD'S SPACE: a district with NAME rounds keeps the pad's place under the staff for every round (the
    // keyboard never moves); a round that doesn't use the pad (FIND THE KEY, SCALE BUILDER) lends that space to the staff
    const pad = $('pad'), reserved = !pad.hidden, usesPad = reserved && (G.r.type === 'name' || G.r.type === 'circuit');
    pad.style.display = '';
    const padSpace = reserved ? pad.offsetHeight + 6 : 0;                 // .kt-pad's bottom margin
    // the room left when the keyboard is at its smallest: the screen minus everything that isn't the staff or the keyboard
    const st = $('stage').getBoundingClientRect(), kb = $('kbView').getBoundingClientRect(), sf = $('staff').getBoundingClientRect();
    const lent0 = (parseFloat($('stage').style.marginBottom) || 6) - 6;   // the space under the box set last time isn't "others"
    const others = (st.top + scrollY) + (st.height - sf.height) + (kb.top - st.bottom - lent0) + (document.documentElement.scrollHeight - (kb.bottom + scrollY));
    const room = innerHeight - others - KB_MIN;
    // as large as fits (the width, STAFF_MAXH, the room above the keyboard at its smallest), but never smaller than the old
    // staff was: where even that doesn't fit (a 768 px tall screen with the letter pad) the page scrolls a little, as before
    const px = (lay, maxH) => { const floor = Math.min(wrap / lay.W, clamp(OLD_MAXH) / oldHeight(G.L, lay.clef, lay.scale), wrap / (360 + (lay.sigW || 0)));
      const k = Math.min(wrap / lay.W, Math.max(maxH / lay.box[1], floor)); return [Math.floor(lay.W * k), Math.floor(lay.box[1] * k)]; };
    const maxH = Math.min(clamp(STAFF_MAXH), room);
    const boxH = Math.max(...layoutsOf(G.L).map(l => px(l, maxH)[1]));    // the district's box (with the pad's space under it)
    const lend = reserved && !usesPad;
    const [w, h] = px(G.lay, lend ? Math.min(clamp(STAFF_MAXH_LENT), boxH + padSpace) : Math.min(maxH, boxH));
    svg.style.width = w + 'px'; svg.style.height = h + 'px';
    if (lend) pad.style.display = 'none';
    // the white box hugs the drawing (even padding all round); the rest of the district's space stays under it, so the
    // keyboard never moves (in a round that lends the pad's space, that's where the pad sits in NAME rounds)
    $('staff').style.height = h + 'px';
    $('stage').style.marginBottom = 6 + Math.max(0, boxH + (lend ? padSpace : 0) - h) + 'px';
  }
  /* the key signature hint: its ♯/♭ for the letter lights up for a moment, then fades */
  function sigHint(r) {
    const letter = r.target.n.letter, i = r.sig ? ({b: ['B', 'E', 'A', 'D', 'G', 'C', 'F'], '#': ['F', 'C', 'G', 'D', 'A', 'E', 'B']}[r.sig.type]).slice(0, r.sig.count).indexOf(letter) : -1;
    if (i < 0) return;
    const t = $('staff').querySelectorAll('.ksig')[i]; if (!t) return;
    t.classList.add('kt-hint');
    setTimeout(() => t.classList.remove('kt-hint'), RULES.sigHintMs);
    $('keyName').textContent = `The key signature makes every ${letter} a ${K.label(r.target.n)}.`;
  }

  /* ================= THE CITY MAP (the level select) ================= */
  function drawOpts() {
    $('modeTouch').setAttribute('aria-pressed', String(mode === 'touch'));
    $('modeInst').setAttribute('aria-pressed', String(mode === 'inst'));
    document.querySelectorAll('[data-clef]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.clef === clefPref)));
    $('optNote').textContent = mode === 'inst'
      ? `My instrument (${member.short}): play each FIND THE KEY note on your ${member.short.toLowerCase()} (any octave). Naming stays on the screen. No piano sounds in this mode.`
      : 'Touch: tap the keys. Each key plays its piano note.';
  }
  $('modeTouch').onclick = () => { mode = 'touch'; save({mode}); A.Sfx.event('ui-toggle'); drawOpts(); };
  $('modeInst').onclick = () => {
    if (!playable(member)) {                                            // no pitched instrument yet: Choose Your Instrument
      location.href = A.linkTo('../index.html') + (A.linkTo('../index.html').includes('?') ? '&' : '?') + 'pick=' + GAME_ID;
      return;
    }
    mode = 'inst'; save({mode}); A.Sfx.event('ui-toggle'); drawOpts();
  };
  document.querySelectorAll('[data-clef]').forEach(b => b.onclick = () => { clefPref = b.dataset.clef; save({clef: clefPref}); A.Sfx.event('ui-toggle'); drawOpts(); showHub(); });

  const prog = lv => A.store.level(GAME_ID, 'all', lv);
  const unlocked = i => A.DEMO || i === 0 || prog(i).stars > 0 || prog(i + 1).stars > 0;
  const KEY_ICON = '<svg class="gk" viewBox="0 0 40 20" aria-label="Golden key"><circle cx="9" cy="10" r="7"/><circle class="gk-hole" cx="9" cy="10" r="2.6"/><path d="M16 8.5H37V11.5H33V15H30V11.5H27V14H24V11.5H16Z"/></svg>';
  function showHub() {
    stop();
    A.Sfx.gameMenuMusic(GAME_ID);
    $('play').hidden = true; $('hub').hidden = false; $('results').hidden = true; $('intro').hidden = true;
    drawOpts();
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = prog(lv), open = unlocked(i);
      const kinds = Object.keys(L.types).map(t => ({find: 'Find the Key', name: 'Name the Key', circuit: 'Full Circuit', scale: 'Scale Builder'}[t])).join(' · ');
      const clefs = L.clefs === 'pref' ? '' : ' · ' + L.clefs.map(c => c === 'bass' ? 'Bass clef' : 'Treble clef').join(' + ');
      return `<button class="lvl kt-dist${p.stars ? ' cleared' : ''}" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">District ${lv}</span>
        <span class="mini" aria-hidden="true">${p.stars ? KEY_ICON : ''}</span>
        <span class="t">${esc(L.name)}</span>
        <span class="d">${kinds}${clefs}${L.keySigs ? ' · key signatures' : ''}${L.time ? ` · ${L.time} s a round` : ''}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${p.best ? 'Best ' + p.best : L.rounds + ' rounds'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => begin(+b.dataset.l)));
    A.Endless.tile($('endlessTile'), {gameId: GAME_ID, instKey: 'all', setKey: 'night-shift', title: 'NIGHT SHIFT', label: 'Every skill, mixed',
      blurb: 'Keys all night long! Mixed questions that keep getting harder and faster: more keys, bass clef, key signatures. 3 lives.',
      onPlay: () => begin('endless')});
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), endless: $('endlessTile'), unlocked,
      label: i => `District ${i + 1} · ${LEVELS[i].name}`, lockText: i => `Clear ${LEVELS[i - 1].name} to unlock`});
  }

  /* START: instrument mode asks for the microphone first; a district starts with the Mayor's intro */
  function begin(lv) {
    const go = () => lv === 'endless' ? startEndless() : intro(lv);
    if (mode === 'inst') A.requireMic(go); else go();
  }
  function intro(lv) {
    const L = LEVELS[lv - 1];
    $('introTitle').textContent = `District ${lv}: ${L.name}`;
    $('introSay').textContent = L.say;
    $('introMayor').innerHTML = mayorSVG(lv === LEVELS.length ? 'cheer' : 'point');
    $('introSigns').hidden = !(Array.isArray(L.signs) ? L.signs[0] : L.signs);   // every district with signs (not the Mayor's Challenge)
    if (!$('introSigns').hidden && !$('introSigns').firstChild) $('introSigns').innerHTML = miniKeyboard();
    $('results').hidden = true;                                          // RETRY / NEXT DISTRICT: the intro replaces the results
    $('intro').hidden = false;
    A.Sfx.event('kttc-mayor-hello');
    $('introGo').onclick = () => { $('intro').hidden = true; startLevel(lv); };
  }

  /* ================= PLAYING A DISTRICT ================= */
  let G = null, timerRaf = 0;
  const kbRange = L => {                                                // the keyboard: every clef the district may use
    const clefs = L.clefs === 'pref' ? (clefPref === 'both' ? ['treble', 'bass'] : [clefPref]) : L.clefs;
    let lo = 200, hi = 0;
    clefs.forEach(c => { const [a, b] = K.rangeOf(L, c); lo = Math.min(lo, a); hi = Math.max(hi, b + (L.types.scale ? 12 : 0)); });
    return [Math.min(lo, 60), Math.max(hi, 60)];                        // middle C is always on the keyboard
  };
  function startLevel(lv) {
    A.LevelSelect.played(lv - 1);
    A.Sfx.gameMenuMusic(GAME_ID, false);
    const L = LEVELS[lv - 1];
    G = {lv, L, i: 0, n: L.rounds, right: 0, score: 0, streak: 0, best: 0, prev: null, signsUsed: 0};
    enterPlay(L);
    $('hudLabel').textContent = `District ${lv}`; $('hudName').textContent = L.name;
    $('hudLivesBox').hidden = true;
    nextRound();
  }
  function enterPlay(L) {
    $('hub').hidden = true; $('results').hidden = true; $('play').hidden = false;
    document.body.classList.add('kt-playing');
    $('hudScore').textContent = '0';
    // the letter pad keeps its place for the whole district (the keyboard never jumps when a NAME round comes)
    const names = !!(L.types.name || L.types.circuit) || !!G.endless;
    // reserved in the shape the district uses (the ♭ ♮ ♯ row only where black keys or key signatures can come), so its
    // height never changes and neither does the staff's box above it
    $('pad').hidden = !names; if (names) { padFor(); pad.set({accs: !!G.endless || L.keys !== 'white' || !!L.keySigs}); $('pad').classList.add('off'); }
    const [lo, hi] = kbRange(L);
    KB.view = L.view;
    buildKeyboard(lo, hi);
    window.scrollTo(0, 0);
  }
  const fade = s => Array.isArray(s) ? s[0] + (s[1] - s[0]) * (G.i / Math.max(1, G.n - 1)) : s || 0;
  const signsFor = () => fade(G.L.signs), labelsFor = () => fade(G.L.labels);

  function nextRound() {
    clearTimeout(G.tNext); cancelAnimationFrame(timerRaf);
    if (!G.endless && G.i >= G.n) return finish();
    if (G.endless) G.L = nightLevel(G.stage);
    const L = G.L, r = K.round(L, {i: G.i, clefPref, prev: G.prev});
    G.r = r; G.prev = r.target.midi; G.t0 = performance.now(); G.phase = 'ask'; G.step = 0; G.signsHere = false; G.done = false;
    $('hudCount').textContent = G.endless ? `Stage ${G.stage + 1}` : `${G.i + 1} / ${G.n}`;
    $('hudCountLabel').textContent = G.endless ? `Right: ${G.right}` : 'Round';
    clearKeys(); $('keyName').textContent = ''; $('pad').classList.add('off'); if (pad) pad.lock(true);
    const sg = G.endless ? 0 : signsFor(), lb = G.endless ? 0 : labelsFor();
    setSigns(sg); setLabels(lb); $('signsBtn').hidden = sg >= .99 && (lb >= .99 || !G.L.labels);
    const inst = mode === 'inst';
    if (r.type === 'find') {
      drawStaff(r, [{n: r.target.show}], {label: 'Find this note'});
      $('prompt').textContent = inst ? 'Play this note on your instrument!' : r.key ? `Find this key (key of ${r.keyName})` : 'Find this key on the piano!';
      pan([r.target.midi, r.target.midi], false, true);
      if (inst) {
        const h = G.L.helper === true || (G.L.helper === 'fade' && G.i < RULES.helperFadeRounds);
        if (h) $('keyName').textContent = `Piano ${K.label(r.target.n)} = your ${writtenFor(r.target.midi, r.target.n.acc)}`;
        A.Pitch.ignoreCurrent();
      }
      if (r.key && G.i < (G.L.sigHint || 0)) setTimeout(() => G && G.r === r && sigHint(r), 400);
      A.Sfx.event('kttc-window-on');
    } else if (r.type === 'name' || r.type === 'circuit') {
      drawStaff(r, [], {label: r.key ? `Key of ${r.keyName}` : 'The staff'});
      mark(r.target.midi, 'lit');
      pan([r.target.midi, r.target.midi]);
      $('prompt').textContent = r.key ? `Name the lit key (key of ${r.keyName})` : 'Name the lit key!';
      showPad(r);
      A.Sfx.event('kttc-window-on');
    } else if (r.type === 'scale') {
      drawStaff(r, [{n: r.target.show}], {label: `The key signature of ${r.keyName}`});
      const named = G.endless ? false : G.i < (G.L.sigHint || 0);
      $('prompt').textContent = named ? `Build the ${r.keyName} scale: tap 8 keys going up, starting on ${K.label(r.target.n)}.` : 'Build the major scale for this key signature: 8 keys going up from the note shown.';
      pan([r.scale[0].midi, r.scale[7].midi]);
    }
    if (G.L.time || G.endless) runTimer();
    requestAnimationFrame(() => { if (G && G.r === r && !G.sized) { G.sized = true; sizeKeyboard(); sizeStaff(); sizeKeyboard(); } });   // the district's first round: settle both
  }
  function writtenFor(concert, acc) {                                   // the student's written note for a concert pitch
    const w = concert + member.sounds, n = A.music.spell(w, acc < 0);
    return n.letter + K.SIGN[n.acc];
  }
  let pad = null;
  function showPad(r) {
    $('pad').classList.remove('off');
    padFor();
    pad.set({accs: r.accs, relabel: true}); pad.lock(false);
  }
  const padFor = () => pad || (pad = A.AnswerPad.mount($('pad'), {accs: true, onAnswer: (l, a) => answerName(l, a)}));

  /* ---------- answers ---------- */
  $('kbStrip').addEventListener('pointerdown', e => {
    const sg = e.target.closest('.sg-hit, .kt-sign');
    if (sg) { e.preventDefault(); if ($('signs').classList.contains('tap')) signTap(sg.dataset.sign || (sg.classList.contains('chop') ? 'chop' : 'fork')); return; }
    const g = e.target.closest('.k'); if (!g || !G || G.done) return;
    e.preventDefault();
    const m = +g.dataset.midi, r = G.r;
    if (mode === 'touch') A.Sfx.piano(m);                                // TOUCH mode only: the piano note
    if (r.type === 'find' && mode !== 'inst') return judge(m === r.target.midi, m);
    if (r.type === 'scale') {
      const want = r.scale[G.step].midi;
      if (m !== want) return judge(false, m);
      mark(m, 'done', K.label(r.scale[G.step].n)); G.step++;
      drawStaff(r, r.scale.slice(0, Math.max(1, G.step)).map(x => ({n: K.showUnder(x.n, r.sig), caption: K.label(x.n)})), {gap: 34});
      if (G.step >= r.scale.length) judge(true, m);
      return;
    }
    // NAME / CIRCUIT rounds: a tap on a key is just a sound (touch mode); answers come from the letter pad
  });
  function answerName(letter, acc) {
    if (!G || G.done) return;
    const r = G.r;
    if (r.type !== 'name' && !(r.type === 'circuit' && G.step === 0)) return;
    const ok = K.nameOk(r, letter, acc);
    if (!ok) return judge(false, null, {letter, acc});
    if (r.type === 'name') return judge(true, r.target.midi, {letter, acc});
    // FULL CIRCUIT: now put it on the staff
    G.step = 1; G.named = {letter, acc};
    pad.lock(true); $('pad').classList.add('off');
    mark(r.target.midi, 'good', letter + K.SIGN[acc]);
    $('prompt').textContent = `Yes, ${letter + K.SIGN[acc]}! Now tap its place on the staff.`;
    A.Sfx.event('kttc-correct');
    staffTargets(r);
  }
  /* FULL CIRCUIT: the staff becomes a tap target; a finger (or the mouse) moves a note on the lines and spaces, and
     letting go puts it there (ledger lines drawn as needed) */
  function staffTargets(r) {
    const svg = $('staff').querySelector('svg'); if (!svg) return;
    svg.classList.add('placing');
    const base = r.clef === 'treble' ? 30 : 18, want = G.named ? K.noteFor(r.target.midi, G.named.letter, G.named.acc) : r.target.n;
    const vb = svg.viewBox.baseVal;
    const toStep = ev => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse());
      const y = Math.max(vb.y + 6, Math.min(vb.y + vb.height - 30, q.y)); return base + Math.round((120 - y) / 8); };
    let ghost = null;
    const draw = step => { const n = Object.assign(stepNote(r.clef, step), {acc: want.acc}); if (ghost) ghost.remove();
      ghost = document.createElementNS('http://www.w3.org/2000/svg', 'g'); ghost.setAttribute('class', 'ghostnote'); ghost.innerHTML = A.noteGlyph(r.clef, {n, x: noteX(r, n, G.lay)}); svg.appendChild(ghost); };   // where the note is drawn
    let down = false;
    svg.onpointerdown = ev => { if (G.done) return; down = true; svg.setPointerCapture(ev.pointerId); draw(toStep(ev)); ev.preventDefault(); };
    svg.onpointermove = ev => { if (down) draw(toStep(ev)); };
    svg.onpointerup = ev => {
      if (!down || G.done) return; down = false;
      const step = toStep(ev), ok = step === A.music.stepOf(want);
      svg.onpointerdown = svg.onpointermove = svg.onpointerup = null; svg.classList.remove('placing');
      judge(ok, r.target.midi, null, {step});
    };
  }

  /* one round ends: right or wrong (a wrong one shows the right answer, and early districts point at the sign) */
  function judge(ok, tapped, named, placed) {
    if (!G || G.done) return;
    G.done = true; cancelAnimationFrame(timerRaf);
    const r = G.r, secs = (performance.now() - G.t0) / 1000;
    if (pad) pad.lock(true);
    const name = K.label(r.target.n);
    if (ok) {
      G.right++; G.streak++; G.best = Math.max(G.best, G.streak);
      let pts = RULES.base + Math.round(RULES.quickBonus * Math.max(0, 1 - secs / RULES.quickSecs)) + (r.type === 'scale' ? RULES.scaleBonus : 0);
      if (G.signsHere) pts -= RULES.signsCost;
      if (G.endless) pts = Math.round((NIGHT.base + NIGHT.quickBonus * Math.max(0, 1 - secs / (G.roundLimit || G.limit))) * (1 + NIGHT.stageBonus * G.stage) * A.Endless.mult(G.streak));
      G.score += Math.max(10, pts);
      mark(r.target.midi, 'good', r.type === 'scale' ? '' : name); lightBlock(r.target.midi);
      if (r.type === 'find' || r.type === 'circuit') drawStaff(r, [{n: r.target.show, caption: name, color: GOLD}]);
      say(praise(r), 'happy');
      A.Sfx.event(G.streak % RULES.streak === 0 ? 'kttc-block-lights' : 'kttc-correct');
      G.tNext = setTimeout(advance, RULES.afterRightMs);
    } else {
      G.streak = 0;
      if (tapped != null && tapped !== r.target.midi) mark(tapped, 'bad');
      if (r.type === 'scale') { mark(r.scale[G.step].midi, 'answer', K.label(r.scale[G.step].n)); }
      else mark(r.target.midi, 'answer', name);
      pan(r.type === 'scale' ? [r.scale[0].midi, r.scale[7].midi] : [r.target.midi, r.target.midi]);
      if (r.type !== 'scale') drawStaff(r, [{n: r.target.show, caption: name, color: MISS}]);
      const hint = G.L.hints ? signHint(r.target.n) : '';
      if (hint) { setSigns(1); say(hint, 'point'); if (!A.Pitch.listening()) hintVoice(mod(r.target.midi, 12) < 5 ? 'chop' : 'fork'); }
      else say(r.type === 'scale' ? `That scale goes ${r.scale.map(x => K.label(x.n)).join(' ')}.` : named ? `That key is ${name}.` : `It was ${name}. You'll get the next one!`, 'oops');
      A.Sfx.event('kttc-wrong');
      if (G.endless) { G.lives--; $('hudLives').innerHTML = A.Endless.hearts(G.lives, NIGHT.lives); if (G.lives > 0) A.Sfx.event('endless-life-lost'); }
      G.tNext = setTimeout(advance, RULES.afterWrongMs + (hint ? 500 : 0));
    }
    $('hudScore').textContent = G.score;
  }
  function advance() {
    if (!G) return;
    G.i++;
    if (G.endless) {
      if (G.lives <= 0) return nightOver();
      const st = Math.min(NIGHT.stages.length - 1, Math.floor(G.right / NIGHT.every));
      if (st > G.stage) { G.stage = st; A.Endless.flash($('edFlash'), 'THE NIGHT GETS BUSIER!'); const [lo, hi] = kbRange(nightLevel(st)); buildKeyboard(lo, hi); }
    }
    nextRound();
  }
  const PRAISE = ['Great!', 'You found it!', 'Right on the block!', 'That lit up the whole street!', 'Nice reading!', 'Keys to success!'];
  const praise = r => r.type === 'scale' ? `The whole ${r.keyName} scale! The block is glowing!` : PRAISE[(G.i + G.right) % PRAISE.length];
  /* the wrong-answer sign hints (early districts): the Chopsticks for C, D, E and their black keys; the Fork for F, G, A, B */
  function signHint(n) {
    const pc = mod(K.LPC[n.letter] + n.acc, 12);
    return ({0: 'Find the Chopsticks: C is right next to them!', 1: `Find the Chopsticks: ${K.label(n)} is the first chopstick!`,
      2: 'Find the Chopsticks: D is right between them!', 3: `Find the Chopsticks: ${K.label(n)} is the second chopstick!`,
      4: 'Find the Chopsticks: E is just past them!', 5: 'Find the Fork: F is right next to it!', 6: `Find the Fork: ${K.label(n)} is the Fork's first tine!`,
      7: 'Find the Fork: G is between the first two tines!', 8: `Find the Fork: ${K.label(n)} is the Fork's middle tine!`,
      9: 'Find the Fork: A is between the last two tines!', 10: `Find the Fork: ${K.label(n)} is the Fork's last tine!`, 11: 'Find the Fork: B is just past it!'})[pc];
  }
  $('signsBtn').onclick = () => { if (!G || G.done || G.signsHere) return; G.signsHere = true; G.signsUsed++; setSigns(1); setLabels(1); say('Here are the signs! (A hint costs a few points.)', 'point'); };

  /* TAP A SIGN: its spoken hint (the Mayor's kttc-mayor-chopsticks / -fork line) + the words in the Mayor's bubble.
     Never an answer and never costs points. The same hint never restarts or stacks; the other sign's hint stops it. */
  const HINT = {kind: null, until: 0, taps: []};
  const hintBusy = kind => HINT.kind === kind && performance.now() < HINT.until;
  function hintVoice(kind) {                                             // the one way a sign's hint is spoken
    if (hintBusy(kind)) return;                                          // already saying it: never restart or stack
    if (HINT.kind && performance.now() < HINT.until) A.Sfx.hush();       // the other sign's hint stops
    HINT.kind = kind;
    HINT.until = performance.now() + 1000 * A.Sfx.event(kind === 'chop' ? 'kttc-mayor-chopsticks' : 'kttc-mayor-fork');
  }
  function signTap(kind) {
    if (!G) return;
    HINT.taps.push(kind);
    if (hintBusy(kind)) return;
    say(kind === 'chop' ? 'C is right next to the Chopsticks!' : 'F is right next to the Fork!', 'point');
    hintVoice(kind);
  }
  $('quitPlay').onclick = () => { if (G && G.endless && G.right) return nightOver(); showHub(); };

  /* the Mayor's Challenge timer (and Night Shift's): a bar that runs down; time up = a wrong answer */
  /* taps a round needs: FIND 1; NAME 1 (+1 for a ♯/♭); FULL CIRCUIT the name + its place on the staff (levels.js TIMED ROUNDS) */
  const tapsFor = r => r.type === 'scale' ? 8 : (r.type === 'find' ? 1 : 1 + (r.target.n.acc ? 1 : 0) + (r.type === 'circuit' ? 1 : 0));
  function runTimer() {
    const limit = (G.endless ? G.limit : G.L.time) + RULES.perTap * (tapsFor(G.r) - 1), t = $('timer'), bar = t.firstElementChild;
    G.roundLimit = limit;
    t.hidden = false;
    const tick = () => {
      if (!G || G.done) return;
      if (mode === 'inst' && A.Pitch.isSuppressed()) G.t0 += 16;          // a sound's mute window doesn't cost time
      const left = 1 - (performance.now() - G.t0) / 1000 / limit;
      bar.style.transform = `scaleX(${Math.max(0, left)})`; t.classList.toggle('low', left < .3);
      if (left <= 0) return judge(false, null);
      timerRaf = requestAnimationFrame(tick);
    };
    timerRaf = requestAnimationFrame(tick);
  }

  /* INSTRUMENT MODE: a FIND THE KEY round is answered by playing the note (any octave) */
  A.Pitch.onHeld(pc => {
    if (!G || G.done || mode !== 'inst' || G.r.type !== 'find') return;
    judge(pc === mod(G.r.target.midi, 12), null);
  });

  /* ================= RESULTS ================= */
  function finish() {
    const g = G; stop();
    const acc = g.right / g.n, stars = RULES.stars.filter(s => acc >= s - 1e-9).length;
    const prev = prog(g.lv), newBest = g.score > (prev.best || 0);
    A.store.setLevel(GAME_ID, 'all', g.lv, {stars: Math.max(stars, prev.stars || 0), best: Math.max(g.score, prev.best || 0)}, stars);
    const lastOne = g.lv === LEVELS.length, clearedNow = stars > 0;
    if (lastOne && clearedNow) { const a = gd().achievements || {}; a.mayor = true; save({achievements: a}); }
    $('play').hidden = true; document.body.classList.remove('kt-playing');
    $('resStars').innerHTML = A.starStr(stars);
    $('resKey').hidden = !clearedNow; $('resKey').innerHTML = KEY_ICON;
    $('resTitle').textContent = clearedNow ? (lastOne ? 'The city is yours!' : `${g.L.name} cleared!`) : 'Almost there!';
    $('resMsg').textContent = clearedNow ? (stars === 3 ? 'Every round right. The Mayor gives you a golden key!' : 'The Mayor gives you a golden key for this district!')
      : `Get ${Math.ceil(RULES.stars[0] * g.n)} of ${g.n} rounds right to clear the district. Try again!`;
    $('resRight').textContent = `${g.right}/${g.n}`; $('resStreak').textContent = g.best; $('resScore').textContent = g.score;
    $('resBest').textContent = newBest && prev.best ? `New best score! (was ${prev.best})` : prev.best ? `Best: ${Math.max(prev.best, g.score)}` : '';
    $('resNext').hidden = !(clearedNow && g.lv < LEVELS.length);
    $('results').hidden = false; $('results').dataset.lv = g.lv;
    const snd = [clearedNow ? 'kttc-golden-key' : 'level-failed'];
    if (stars > (prev.stars || 0)) snd.push('star-earned');
    if (newBest && prev.best) snd.push('new-high-score');
    A.Sfx.sequence(snd, 120, {channel: GAME_ID});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    if (lastOne && clearedNow) setTimeout(finale, 900); else A.Skins.announce($('results').querySelector('.panel'));
  }
  function finale() {
    $('finaleKey').innerHTML = KEY_ICON + mayorSVG('cheer');
    $('finale').hidden = false;
    A.Sfx.cancelAll(GAME_ID); A.Sfx.event('kttc-keys-to-city');
    $('finaleGo').onclick = () => { $('finale').hidden = true; A.Skins.announce($('results').querySelector('.panel')); };
  }
  $('resRetry').onclick = () => begin(+$('results').dataset.lv);
  $('resNext').onclick = () => begin(+$('results').dataset.lv + 1);
  $('resLevels').onclick = () => showHub();
  function stop() { if (G) { clearTimeout(G.tNext); cancelAnimationFrame(timerRaf); } G = null; $('timer').hidden = true; document.body.classList.remove('kt-playing'); }

  /* ================= NIGHT SHIFT (endless) ================= */
  function nightLevel(stage) {                                          // every stage up to this one, merged
    const L = {rounds: 99, clefs: ['treble'], treble: ['C4', 'C5'], bass: ['C3', 'C4'], keys: 'white', spell: 'any', types: {find: 1}, view: 15};
    NIGHT.stages.slice(0, stage + 1).forEach(s => Object.assign(L, s));
    if (clefPref !== 'treble' && L.clefs.length === 1) L.clefs = clefPref === 'both' ? ['treble', 'bass'] : ['bass'];
    return L;
  }
  function startEndless() {
    A.LevelSelect.played('endless');
    A.Sfx.gameMenuMusic(GAME_ID, false);
    G = {endless: true, stage: 0, lives: NIGHT.lives, i: 0, right: 0, score: 0, streak: 0, best: 0, prev: null, signsUsed: 0};
    G.L = nightLevel(0);
    Object.defineProperty(G, 'limit', {get() { return Math.max(NIGHT.time[1], NIGHT.time[0] - NIGHT.time[2] * this.right); }});
    enterPlay(G.L);
    $('hudLabel').textContent = 'Night Shift'; $('hudName').textContent = 'Mixed';
    $('hudLivesBox').hidden = false; $('hudLives').innerHTML = A.Endless.hearts(G.lives, NIGHT.lives);
    A.Sfx.event('endless-start');
    nextRound();
  }
  function nightOver() {
    const g = G; stop();
    $('play').hidden = true;
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
    A.Endless.gameOver({gameId: GAME_ID, instKey: 'all', setKey: 'night-shift', title: 'SHIFT OVER',
      run: {score: g.score, notes: g.right, speed: g.stage + 1, combo: g.best,
        stats: [['Keys right', g.right], ['Score', g.score], ['Stage', g.stage + 1], ['Best streak', g.best]]},
      onAgain: () => begin('endless'), onBack: showHub, backLabel: 'City map'});
  }

  /* ================= ?demo: Space = the right answer, W = a wrong one (instrument mode: hold Space to "play") ================= */
  if (A.DEMO) {
    addEventListener('keydown', e => {
      if (!G || G.done || e.repeat || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const r = G.r, k = e.key.toLowerCase();
      if (k !== ' ' && k !== 'w') return;
      e.preventDefault();
      if (mode === 'inst' && r.type === 'find') { A.Pitch.demoNote = k === ' ' ? r.target.midi : r.target.midi + 2; return; }
      if (k === 'w') return r.type === 'name' || (r.type === 'circuit' && G.step === 0) ? answerName(r.target.n.letter === 'G' ? 'A' : 'G', 0) : judge(false, r.target.midi + 1);
      DEMO.answer();
    });
    addEventListener('keyup', e => { if (e.key === ' ' || e.key.toLowerCase() === 'w') A.Pitch.demoNote = null; });
  }
  const DEMO = {
    /** answer the current round right (tests) */
    answer() {
      if (!G || G.done) return;
      const r = G.r;
      if (r.type === 'find') return judge(true, r.target.midi);
      if (r.type === 'name') return answerName(r.target.n.letter, r.target.n.acc);
      if (r.type === 'circuit') { if (G.step === 0) answerName(r.target.n.letter, r.target.n.acc); return judge(true, r.target.midi, null, {step: A.music.stepOf(r.target.n)}); }
      if (r.type === 'scale') { for (let k = G.step; k < 8; k++) keyEl(r.scale[k].midi).dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); }
    },
  };
  A.KeysCity = {
    state: () => G ? {lv: G.lv, endless: !!G.endless, i: G.i, n: G.n, right: G.right, score: G.score, stage: G.stage, lives: G.lives, done: G.done, step: G.step,
      round: G.r && {type: G.r.type, clef: G.r.clef, key: G.r.key, midi: G.r.target.midi, name: K.label(G.r.target.n), spell: G.r.spell, scale: G.r.scale && G.r.scale.map(x => x.midi)},
      signs: +($('signs') && getComputedStyle($('signs')).opacity), labels: +($('cfLabels') && getComputedStyle($('cfLabels')).opacity),
      staff: (() => { const sv = $('staff').querySelector('svg'), b = $('stage').getBoundingClientRect(), q = sv && sv.getBoundingClientRect(); return sv && {lay: G.lay, box: [b.left, b.top, b.width, b.height].map(Math.round), svg: [q.left, q.top, q.width, q.height].map(Math.round)}; })(),
      signTap: !!($('signs') && $('signs').classList.contains('tap')), limit: G.roundLimit, hint: {kind: HINT.kind, until: HINT.until, taps: HINT.taps.slice()}, kb: {lo: KB.lo, hi: KB.hi, px: KB.px, x: KB.x, total: KB.total}} : {menu: true},
    answer: () => DEMO.answer(),
    tapKey: m => { const g = keyEl(m); if (g) g.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true})); },
    name: (l, a) => answerName(l, a),
    place: step => judge(step === A.music.stepOf(G.named ? K.noteFor(G.r.target.midi, G.named.letter, G.named.acc) : G.r.target.n), G.r.target.midi, null, {step}),
    mode: () => mode, begin, setClef: c => { clefPref = c; }, signTap,
  };
  addEventListener('resize', () => { if (G && !$('play').hidden) { sizeStaff(); sizeKeyboard(); } });
  showHub();
})(window.Arcade);
