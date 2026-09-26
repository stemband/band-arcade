/* Button Masher: a fingering and slide-position trainer in a versus fighting game. A note appears on the staff;
   the student builds its fingering on a diagram of their instrument (the special-move COMBO) and hits STRIKE!
   Trombone: tapping a slide position strikes at once. No microphone (no pitch.js / mic-gate.js), so sounds play.
   Rivals (levels) live in levels.js, fingerings in fingerings.js, the diagrams in diagrams.js.
   Progress is saved per instrument MEMBER (fingerings differ inside a group): setLevel('button-masher', member.id, …). */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'button-masher';
  const RIVALS = window.MASHER_RIVALS, RULES = window.MASHER_RULES, M = A.Masher;
  const {noteLabel, writtenMidi} = A.music;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const inst = A.requireInstrument(GAME_ID); if (!inst) return;
  A.mountTopbar(inst, '<span class="sound-ctl" id="sndCtl"></span>', GAME_ID);
  A.Sfx.mountControls($('sndCtl'), {ambience: false});
  A.Sfx.allowAmbience(false);
  const sfx = name => A.Sfx.event(name);
  $('demoHelp').hidden = !A.DEMO;

  /* the student's fighter wears their instrument family's color */
  const FIGHTER_COLOR = {flute: 'cyan', oboe: 'purple', clarinet: 'blue', sax: 'amber', bassoon: 'purple',
                         trumpet: 'yellow', horn: 'amber', euph: 'yellow', tuba: 'amber', trombone: 'yellow'};
  let member = null, T = null, D = null;               // instrument member, its fingering table, its diagram

  /* ---------- characters (original, cartoon, no weapons) ---------- */
  const EYES = (x, y, s = 1) => `<g class="r-eyes"><ellipse class="r-eye" cx="${x - 8 * s}" cy="${y}" rx="${5 * s}" ry="${6 * s}"/><ellipse class="r-eye" cx="${x + 8 * s}" cy="${y}" rx="${5 * s}" ry="${6 * s}"/>` +
    `<circle class="r-pupil" cx="${x - 10 * s}" cy="${y + 1}" r="${2.6 * s}"/><circle class="r-pupil" cx="${x + 6 * s}" cy="${y + 1}" r="${2.6 * s}"/>` +
    `<path class="r-brow" d="M${x - 14 * s} ${y - 9 * s}L${x - 3 * s} ${y - 6 * s}M${x + 3 * s} ${y - 6 * s}L${x + 14 * s} ${y - 9 * s}"/></g>`;
  const GRIN = (x, y) => `<path class="r-mouth" d="M${x - 8} ${y}Q${x} ${y + 7} ${x + 8} ${y}"/>`;
  const STAR = (x, y) => `<path d="M${x} ${y - 7}L${x + 2} ${y - 2}L${x + 7} ${y - 2}L${x + 3} ${y + 1}L${x + 5} ${y + 7}L${x} ${y + 3}L${x - 5} ${y + 7}L${x - 3} ${y + 1}L${x - 7} ${y - 2}L${x - 2} ${y - 2}Z"/>`;
  const dizzy = (x, y) => `<g class="dizzy" aria-hidden="true">${STAR(x - 18, y)}${STAR(x + 2, y - 8)}${STAR(x + 20, y)}</g>`;
  const RIVAL_LOOKS = {
    /* a tall cane reed with a ligature belt, squeaking */
    reed: () => `<path class="r-main r-line" d="M46 146L42 48Q60 8 78 48L74 146Z"/><path class="r-line r-cut" d="M47 40Q60 22 73 40"/>` +
      `<rect class="r-trim r-line" x="42" y="104" width="36" height="12" rx="3"/><circle class="r-ink" cx="46" cy="110" r="2"/>` +
      `<path class="r-limb" d="M44 80Q28 84 22 72M76 80Q90 86 96 76"/><path class="r-fx" d="M16 28l-10-6M14 40H2M16 52l-10 6"/>` + EYES(60, 62) + `<ellipse class="r-ink" cx="58" cy="82" rx="5" ry="6"/>` + dizzy(60, 18),
    /* a treble clef with a captain's hat */
    clef: () => `<text class="r-main r-glyph" x="30" y="128" font-size="100">𝄞</text>` +
      `<circle class="r-main r-line" cx="62" cy="34" r="20"/><path class="r-trim r-line" d="M38 22H86L80 4H44Z"/><rect class="r-ink" x="36" y="20" width="52" height="5" rx="2"/>` +
      `<path class="r-trim" d="M58 8l4-3 4 3-4 3z"/>` + EYES(60, 34, .9) + GRIN(60, 44) + dizzy(62, 0),
    /* a spinning funnel of wind */
    tornado: () => [[30, 48, 'r-main'], [54, 38, 'r-trim'], [76, 30, 'r-main'], [96, 22, 'r-trim'], [114, 14, 'r-main'], [132, 8, 'r-trim']]
      .map(([y, rx, c]) => `<ellipse class="${c} r-line" cx="${60 + (y - 30) * .08}" cy="${y}" rx="${rx}" ry="12"/>`).join('') +
      `<path class="r-fx r-spin" d="M8 70q-6 10 2 18M112 60q8 10 0 20M20 110q-6 8 0 14"/>` + EYES(58, 52) + GRIN(58, 64) + dizzy(60, 6),
    /* a sharp sign in a knight's helmet, carrying a round shield (no sword) */
    sharp: () => `<g class="r-main r-line"><rect x="40" y="52" width="12" height="92" rx="4" transform="rotate(6 46 98)"/><rect x="66" y="48" width="12" height="92" rx="4" transform="rotate(6 72 94)"/>` +
      `<rect x="26" y="78" width="70" height="13" rx="4" transform="rotate(-12 61 84)"/><rect x="26" y="108" width="70" height="13" rx="4" transform="rotate(-12 61 114)"/></g>` +
      `<path class="r-trim r-line" d="M36 50Q36 12 62 12Q88 12 88 50Z"/><rect class="r-ink" x="44" y="30" width="36" height="9" rx="3"/><path class="r-plume" d="M62 12Q70 -4 90 2Q76 6 70 14"/>` +
      `<circle class="r-eye" cx="54" cy="34" r="2.6"/><circle class="r-eye" cx="68" cy="34" r="2.6"/>` +
      `<circle class="r-trim r-line" cx="26" cy="104" r="18"/><text class="r-ink r-glyph" x="18" y="114" font-size="26">♯</text>` + dizzy(62, 2),
    /* a flat sign in a big feathered hat and pearls */
    flat: () => `<rect class="r-main r-line" x="34" y="30" width="14" height="114" rx="5"/><path class="r-main r-line" d="M42 144V96Q62 78 82 90Q98 104 76 124Q60 136 42 144Z"/>` +
      `<ellipse class="r-trim r-line" cx="44" cy="28" rx="34" ry="8"/><path class="r-trim r-line" d="M26 26Q30 4 50 6Q64 8 62 26Z"/><path class="r-plume" d="M56 10Q76 -6 92 4Q74 6 64 16"/>` +
      EYES(68, 104, .8) + `<path class="r-lash" d="M56 96l-3-4M60 95l-1-5M78 96l3-4M74 95l1-5"/><path class="r-mouth" d="M62 116Q68 120 74 116"/>` +
      [0, 1, 2, 3, 4].map(i => `<circle class="r-pearl" cx="${50 + i * 7}" cy="${86 + (i % 2) * 2}" r="3"/>`).join('') + dizzy(46, 6),
    /* a mad-scientist doctor in goggles, holding a tuning fork */
    doctor: () => `<path class="r-white r-line" d="M34 146L38 80Q60 66 82 80L86 146Z"/><path class="r-main" d="M52 80L60 104L68 80Z"/><path class="r-line" d="M60 80V146"/>` +
      `<path class="r-white r-line" d="M40 34L32 18L46 26L48 10L58 22L66 8L70 24L84 14L80 32Z"/><circle class="r-skin r-line" cx="60" cy="48" r="22"/>` +
      `<circle class="r-trim r-line" cx="50" cy="44" r="9"/><circle class="r-trim r-line" cx="70" cy="44" r="9"/><circle class="r-ink" cx="48" cy="45" r="3"/><circle class="r-ink" cx="68" cy="45" r="3"/>` +
      `<path class="r-mouth" d="M50 60Q60 66 70 58"/><path class="r-limb" d="M38 90Q24 96 20 84"/><path class="r-fork" d="M20 84V60M14 60V70Q14 76 20 76Q26 76 26 70V60"/>` +
      `<path class="r-fx" d="M4 50l6-6 4 6 6-6M96 60l6-6 4 6 6-6"/>` + dizzy(60, 6),
    /* a wooden metronome whose pendulum ticks */
    metronome: () => `<path class="r-main r-line" d="M24 146L46 18H74L96 146Z"/><path class="r-trim r-line" d="M40 100H80L86 146H34Z"/>` +
      `<g class="r-pend"><line class="r-arm" x1="60" y1="118" x2="60" y2="26"/><rect class="r-trim r-line" x="52" y="46" width="16" height="12" rx="3"/></g>` +
      EYES(60, 80, .9) + GRIN(60, 92) + `<path class="r-limb" d="M30 110Q16 112 12 100M90 110Q104 112 108 100"/>` + dizzy(60, 4),
    /* the final boss: a grand conductor in tails, a baton raised */
    conductor: () => `<path class="r-main r-line" d="M34 146L36 84Q60 72 84 84L86 146L72 146L60 118L48 146Z"/><path class="r-white r-line" d="M50 80L60 112L70 80Z"/>` +
      `<path class="r-trim r-line" d="M52 84L60 88L68 84L68 92L60 88L52 92Z"/><circle class="r-skin r-line" cx="60" cy="54" r="20"/>` +
      `<path class="r-white r-line" d="M38 52Q34 24 58 26Q90 20 86 52Q80 36 66 38Q52 30 38 52Z"/>` + EYES(58, 56, .9) + GRIN(58, 66) +
      `<path class="r-limb" d="M36 92Q20 80 18 62"/><line class="r-baton" x1="18" y1="62" x2="4" y2="26"/><g class="r-trim">${STAR(4, 24)}</g>` +
      `<path class="r-limb" d="M84 92Q98 100 104 90"/>` + dizzy(60, 14),
  };
  function rivalSVG(V, cls = '') {
    const [c1, c2] = V.colors;
    return `<svg class="rival-svg ${cls}" viewBox="0 -10 120 160" preserveAspectRatio="xMidYMax meet" style="--r1:var(--${c1});--r2:var(--${c2})" aria-hidden="true">${(RIVAL_LOOKS[V.look] || RIVAL_LOOKS.reed)()}</svg>`;
  }
  /* the student's fighter: spiky hair, a headband, a jacket in the instrument's color, sneakers; faces right */
  function fighterSVG(color) {
    return `<svg class="fighter-svg" viewBox="0 -10 120 160" preserveAspectRatio="xMidYMax meet" style="--f1:var(--${color})" aria-hidden="true">` +
      `<path class="f-pants f-line" d="M42 100L36 142H52L60 114L68 142H84L78 100Z"/><path class="f-shoe f-line" d="M32 140H54V148H30Z"/><path class="f-shoe f-line" d="M66 140H88Q94 148 88 148H66Z"/>` +
      `<path class="f-jacket f-line" d="M38 64Q60 54 82 64L84 104H36Z"/><path class="f-line f-zip" d="M60 60V104"/>` +
      `<path class="f-arm" d="M78 70Q96 74 102 62"/><path class="f-arm" d="M80 82Q98 92 106 80"/><circle class="f-skin f-line" cx="103" cy="60" r="6"/><circle class="f-skin f-line" cx="107" cy="79" r="6"/>` +
      `<circle class="f-skin f-line" cx="60" cy="38" r="19"/><path class="f-hair f-line" d="M40 36L36 18L48 24L50 8L60 20L68 6L72 22L86 16L80 34Q70 22 58 24Q46 24 40 36Z"/>` +
      `<path class="f-band f-line" d="M41 30Q60 22 79 30L79 36Q60 28 41 36Z"/><path class="f-tails" d="M42 32Q30 30 24 40M42 34Q32 40 30 50"/>` +
      `<circle class="f-ink" cx="66" cy="40" r="2.8"/><circle class="f-ink" cx="76" cy="40" r="2.8"/><path class="f-mouth" d="M66 50Q72 54 78 49"/>` +
      dizzy(60, 6) + `</svg>`;
  }

  /* ---------- rival select ---------- */
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const POOL_TEXT = {first3: 'Your first three notes', first5: 'All of your first five notes', Bb: 'Concert B♭ scale', Eb: 'Concert E♭ scale', F: 'Concert F scale', Ab: 'Concert A♭ scale', mixed: 'All four scales, mixed'};
  const isPerc = () => T && T.diagram === 'none';

  function showHub() {
    stopTimers(); G = null;
    ['play', 'results', 'chart'].forEach(id => { $(id).hidden = true; });
    $('hub').hidden = false; $('wrap').classList.remove('playing'); document.body.classList.remove('ww');
    member = A.getMember(inst, A.store.memberFor(inst.id));
    const pick = $('memberPick');
    pick.hidden = !!member;
    if (!member) {
      $('hubMain').hidden = true; $('percussion').hidden = true;
      A.Modes.memberPick(pick, inst, () => showHub(), 'Every instrument has its own fingerings.');
      const f = pick.querySelector('.member-btn'); if (f) f.focus({preventScroll: true});
      return;
    }
    T = M.table(member); D = M.DIAGRAMS[T.diagram] || null;
    const chip = document.querySelector('#topbar a.chip');                  // the chip names the instrument, not the group
    if (chip) chip.innerHTML = `<span class="sr">Change instrument. Playing as </span>${member.name}`;
    const change = inst.members.length > 1 ? `<p class="playing">Playing: <b>${member.name}</b> <button type="button" class="linkish" id="changeMember">change</button></p>` : '';
    $('playingAs').innerHTML = change; $('percPlaying').innerHTML = change;
    document.querySelectorAll('#changeMember').forEach(b => b.addEventListener('click', () => { A.store.setMember(inst.id, null); showHub(); }));
    if (isPerc()) {                                                          // bells: no fingerings, point to Chime Heist
      $('hubMain').hidden = true; $('percussion').hidden = false;
      $('chimeLink').href = A.linkTo('../chime-heist/index.html');
      $('percOther').hidden = inst.members.length > 1;
      $('percOther').href = A.playerLink(GAME_ID);
      return;
    }
    $('percussion').hidden = true; $('hubMain').hidden = false;
    $('rivalGrid').innerHTML = RIVALS.map((V, i) => {
      const lv = i + 1, p = A.store.level(GAME_ID, member.id, lv);
      const unlocked = A.DEMO || lv === 1 || p.stars > 0 || A.store.level(GAME_ID, member.id, lv - 1).stars > 0;
      const bits = [POOL_TEXT[V.pool] + '.', V.showName ? 'Note names shown.' : 'Staff only.', V.hint ? `Hint glow after ${V.hint} s.` : '', `${V.time} s each.`];
      return `<button class="lvl rival-card${V.boss ? ' boss' : ''}" data-l="${lv}" ${unlocked ? '' : 'disabled'} style="--r1:var(--${V.colors[0]});--r2:var(--${V.colors[1]})">
        <span class="n">${V.boss ? 'Final boss' : 'Rival ' + lv}</span>
        <span class="mini">${unlocked ? rivalSVG(V) : '<svg class="rival-svg" viewBox="0 -10 120 160" aria-hidden="true"><text class="r-lock" x="60" y="100" text-anchor="middle" font-size="80">?</text></svg>'}</span>
        <span class="t">${unlocked ? V.name : '???'}</span>
        <span class="d">${bits.filter(Boolean).join(' ')}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${unlocked ? (p.best ? 'Best ' + p.best : `${V.health} hits to win`) : 'Locked'}</span></span>
      </button>`;
    }).join('');
    $('rivalGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => startLevel(+b.dataset.l)));
    window.scrollTo(0, 0);
  }

  /* ---------- the notes of a match ---------- */
  function poolFor(V) {
    const five = inst.notes.map(n => ({n, show: n, midi: writtenMidi(n), sig: null, label: noteLabel(n)}));
    if (V.pool === 'first3') return five.slice(0, 3);
    if (V.pool === 'first5') return five;
    return (V.pool === 'mixed' ? ['Bb', 'Eb', 'F', 'Ab'] : [V.pool]).flatMap(id => {
      const sc = A.Scales.build(member, id);
      return sc.up.map(n => ({n, show: n.show, midi: n.midi, sig: sc.sig, label: noteLabel(n)}));
    });
  }
  /** `count` notes from the pool: every note about as often, never the same pitch twice in a row */
  function deck(pool, count) {
    const out = []; let bag = [];
    while (out.length < count) {
      if (!bag.length) bag = shuffle(pool.slice());
      const last = out.length ? out[out.length - 1].midi : null;
      let k = bag.findIndex(it => it.midi !== last);
      if (k < 0) { bag = shuffle(pool.slice()); k = bag.findIndex(it => it.midi !== last); if (k < 0) k = 0; }
      out.push(bag.splice(k, 1)[0]);
    }
    return out;
  }

  /* ---------- a match ---------- */
  let G = null, timerId = 0, timeouts = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timeouts.push(id); return id; };
  function stopTimers() { clearInterval(timerId); timerId = 0; timeouts.forEach(clearTimeout); timeouts = []; }

  function startLevel(lv) {
    stopTimers();
    const V = RIVALS[lv - 1], pool = poolFor(V);
    G = {lv, V, items: deck(pool, V.notes), fit: pool.map(it => it.show), i: 0, tries: 0, pressed: {}, order: [], glow: null, hintOn: false,
         hp: V.health, energy: RULES.energy, score: 0, hits: 0, mistakes: 0, combo: 0, bestCombo: 0, locked: true};
    ['hub', 'results', 'chart'].forEach(id => { $(id).hidden = true; });
    $('play').hidden = false; $('wrap').classList.add('playing');
    document.body.classList.toggle('ww', !D.brass && !D.slide);             // woodwind diagrams need the long side of a phone
    $('fighter').innerHTML = fighterSVG(FIGHTER_COLOR[T.diagram] || 'cyan');
    $('rival').innerHTML = rivalSVG(V);
    $('rival').className = 'rival' + (V.boss ? ' boss' : '');
    $('fighter').className = 'fighter';
    $('rivalName').textContent = V.name;
    $('pad').innerHTML = M.diagramSVG(T.diagram, {interactive: true, label: `${member.name}: ${D.slide ? 'tap a slide position' : 'tap the keys for the note, then STRIKE!'}`});
    $('pad').className = 'pad pad-' + T.diagram;
    $('strikeBtn').hidden = !!D.slide; $('clearBtn').hidden = !!D.slide;
    $('keysHelp').textContent = D.slide ? 'Keys 1–7 pick a position.' : D.brass ? `Keys 1–${D.keys.length > 3 && T.diagram !== 'horn' ? 4 : 3}${T.diagram === 'horn' ? ' and T (or 4) for the trigger' : ''} press valves · Enter = STRIKE! · Backspace = CLEAR` : 'Enter = STRIKE! · Backspace = CLEAR';
    $('noteName').textContent = ''; $('playStaff').innerHTML = '';
    render(); hud();
    window.scrollTo(0, 0);
    intro();
  }

  /* the rival's taunt, then ROUND n … FIGHT! */
  function intro() {
    const fast = reduced.matches;
    $('taunt').textContent = G.V.taunt; $('taunt').hidden = false;
    setPrompt(`${G.V.name} wants to fight!`, '');
    later(() => { $('taunt').hidden = true; banner(`Round ${G.lv}`, 'round'); sfx('fight-start'); }, fast ? 1400 : 2000);
    later(() => banner('Fight!', 'fight'), fast ? 2100 : 2900);
    later(() => { banner(''); nextNote(); }, fast ? 2700 : 3600);
  }
  function banner(text, cls = '') {
    const b = $('banner');
    b.hidden = !text; b.textContent = text; b.className = 'banner ' + cls;
    if (text) { void b.offsetWidth; b.classList.add('go'); }
  }

  const current = () => G.items[G.i];
  const primary = () => T.notes(current().midi)[0];
  function nextNote() {
    const it = current(), sigW = A.keySigWidth(it.sig), W = 250 + sigW;
    $('playStaff').innerHTML = A.staffSVG(member.clef, [{n: it.show, x: (84 + sigW + W - 30) / 2}],
      {fit: G.fit, keySig: it.sig, width: W, label: G.V.showName ? `The note ${it.label}` : 'The note to finger'});
    $('noteName').textContent = G.V.showName ? it.label : '';
    $('noteCount').textContent = `${G.i + 1} / ${G.items.length}`;
    G.pressed = {}; G.order = []; G.glow = null; G.hintOn = false; G.tries = 0;
    if (A.DEMO) { $('demoAns').hidden = false; $('demoAns').textContent = `Answer: ${T.notes(it.midi).map(f => f.text).join('  or  ')}`; }
    setPrompt(D.slide ? 'Tap the slide position for this note!' : 'Build the combo for this note, then STRIKE!', '');
    startTimer();
    render();
  }

  /* ---------- the diagram: tap to press (half-hole keys cycle open -> half -> closed) ---------- */
  const keyOf = id => D.keys.find(k => k.id === id);
  $('pad').addEventListener('pointerdown', e => {
    const k = e.target.closest('.key'); if (!k) return;
    e.preventDefault();
    press(k.dataset.k);
  });
  $('pad').addEventListener('contextmenu', e => e.preventDefault());
  function press(id) {
    if (!G || G.locked || !keyOf(id)) return;
    sfx('key-press');
    if (D.slide) { G.pressed = {[id]: 1}; G.order = [id]; render(); strike(); return; }
    const k = keyOf(id), s = G.pressed[id] || 0;
    const next = k.half ? (s === 0 ? 'h' : s === 'h' ? 1 : 0) : (s ? 0 : 1);
    if (next) { G.pressed[id] = next; if (!G.order.includes(id)) G.order.push(id); }
    else { delete G.pressed[id]; G.order = G.order.filter(x => x !== id); }
    render();
  }
  function clearCombo() {
    if (!G || G.locked) return;
    G.pressed = {}; G.order = []; render();
  }
  function render() {
    const svg = $('pad').querySelector('svg'), p = G && G.i < G.items.length && G.items[G.i] ? T.notes(current().midi)[0] : null;
    M.setState(svg, G.pressed, {glow: G.glow, hint: p && !G.locked && (A.DEMO || G.hintOn) ? p.keys : null});
    $('combo').innerHTML = comboHTML();
  }
  /* the COMBO display: the keys pressed so far as fighting-game input icons, in the order pressed */
  function comboHTML() {
    if (!G.order.length) return `<span class="combo-empty">${D.slide ? 'Tap a slide position' : 'Tap keys to build your combo'}</span>`;
    return G.order.map(id => {
      const k = keyOf(id), s = G.pressed[id];
      const lbl = k.pos ? k.label : (s === 'h' ? '½' : '') + (k.label || k.tag || id);
      const type = k.valve ? 'valve' : k.pos ? 'valve' : k.r ? 'hole' : 'key';
      return `<span class="ci ci-${type}${lbl.length > 3 ? ' long' : ''}" title="${k.name}">${lbl}</span>`;
    }).join('<i class="plus" aria-hidden="true">+</i>');
  }

  /* keyboard (Chromebooks): brass 1–4 press valves (horn: T or 4 = trigger), trombone 1–7 pick a position,
     Enter = STRIKE!, Backspace = CLEAR. Space presses a focused key. */
  addEventListener('keydown', e => {
    if (!G || $('play').hidden || !$('results').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, onKey = e.target.closest && e.target.closest('.key');
    if (k === 'Enter') { if (e.target.closest && e.target.closest('button, a')) return; e.preventDefault(); strike(); return; }
    if (k === 'Backspace') { e.preventDefault(); clearCombo(); return; }
    if ((k === ' ' || k === 'Spacebar') && onKey) { e.preventDefault(); press(onKey.dataset.k); return; }
    if (D.slide && /^[1-7]$/.test(k)) { e.preventDefault(); press('pos' + k); return; }
    if (D.brass) {
      const id = T.diagram === 'horn' && (k === '4' || k.toLowerCase() === 't') ? 'T' : k;
      if (/^[1-4T]$/.test(id) && keyOf(id)) { e.preventDefault(); press(id); }
    }
  });

  /* ---------- timer (paused while the tab is hidden) ---------- */
  function startTimer() {
    clearInterval(timerId);
    const bar = $('timer').firstElementChild;
    bar.style.transform = 'scaleX(1)'; $('timer').classList.remove('low');
    G.noteStart = performance.now(); G.locked = false;
    let last = performance.now();
    timerId = setInterval(() => {
      const now = performance.now();
      if (document.hidden) { G.noteStart += now - last; last = now; return; }
      last = now;
      if (!G || G.locked) return;
      const el = (now - G.noteStart) / 1000, frac = 1 - el / G.V.time;
      bar.style.transform = `scaleX(${Math.max(0, frac)})`;
      $('timer').classList.toggle('low', frac < .3);
      if (G.V.hint && !G.hintOn && el >= G.V.hint) { G.hintOn = true; render(); }
      if (frac <= 0) miss('timeout');
    }, 100);
  }

  /* ---------- STRIKE! ---------- */
  function strike() {
    if (!G || G.locked) return;
    const c = M.canon(G.pressed);
    if (T.notes(current().midi).some(f => f.canon === c)) hit(); else miss('wrong');
  }
  function hit() {
    G.locked = true; clearInterval(timerId);
    const frac = Math.max(0, 1 - (performance.now() - G.noteStart) / (G.V.time * 1000));
    const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor(G.combo / RULES.comboStep));
    const pts = Math.round((RULES.base + frac * RULES.speedBonus) * mult);
    G.score += pts; G.hits++; G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); G.hp--;
    sfx('special-move');
    if (G.combo % RULES.comboStep === 0) later(() => sfx('combo-streak'), 260);
    specialMove(G.combo >= 2 ? `${G.combo} hit combo!` : 'Hit!');
    setPrompt(`${current().label}! That's the combo. +${pts}`, 'good');
    hud();
    if (G.hp <= 0) later(ko, reduced.matches ? 300 : 650);
    else later(advance, RULES.afterHitMs);
  }
  function miss(kind) {
    G.locked = true; clearInterval(timerId);
    G.mistakes++; G.combo = 0; G.energy--; G.tries++;
    sfx('rival-counter');
    counter();
    const p = primary();
    G.glow = p.keys; G.pressed = {}; G.order = [];
    render(); hud();
    const show = !p.keys.length ? `This one is ${p.text.toLowerCase()}: press nothing, just STRIKE!`      // nothing to glow for an open note
      : kind === 'timeout' ? `The right combo is glowing${G.V.showName ? ` for ${current().label}` : ''}.` : `Watch the glowing ${D.slide ? 'position' : 'keys'}.`;
    setPrompt(`${kind === 'timeout' ? 'Too slow!' : 'Blocked!'} ${G.V.name} counters. ${show}`, 'bad');
    later(() => {
      G.glow = null;
      if (G.energy <= 0) { render(); return finish('energy'); }
      if (kind === 'timeout' || G.tries >= RULES.tries) return advance();
      setPrompt('Same note, one more try!', ''); startTimer(); render();
    }, RULES.showCorrectMs);
  }
  function advance() {
    G.i++;
    if (G.i >= G.items.length) { G.locked = true; banner('Time over', 'ko'); sfx('level-failed'); later(() => { banner(''); finish('time'); }, 1500); return; }
    nextNote();
  }
  function ko() {
    $('rival').classList.add('ko');
    banner('K.O.!', 'ko');
    sfx('ko');
    later(() => { banner(''); finish('ko'); }, reduced.matches ? 900 : 1900);
  }

  /* ---------- effects ---------- */
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); later(() => el.classList.remove(cls), 1000); }   // back to the idle bob
  function specialMove(text) {
    const fx = $('fx'), a = $('arena').getBoundingClientRect(), f = $('fighter').getBoundingClientRect(), r = $('rival').getBoundingClientRect();
    fx.style.setProperty('--x0', (f.right - a.left - f.width * .1) + 'px');
    fx.style.setProperty('--dx', (r.left + r.width * .35 - f.right + f.width * .1) + 'px');
    fx.innerHTML = `<i class="blast"></i>` + (reduced.matches ? '' : [0, 1, 2, 3, 4, 5].map(k => `<i class="spark" style="--k:${k}"></i>`).join('')) + `<b class="pop">${text}</b>`;
    restart($('fighter'), 'strike'); restart($('rival'), 'hit'); restart(fx, 'go');
  }
  function counter() {
    const fx = $('fx'), a = $('arena').getBoundingClientRect(), f = $('fighter').getBoundingClientRect(), r = $('rival').getBoundingClientRect();
    fx.style.setProperty('--x0', (r.left - a.left + r.width * .2) + 'px');
    fx.style.setProperty('--dx', (f.left + f.width * .6 - r.left - r.width * .2) + 'px');
    fx.innerHTML = `<i class="wave">)))</i><b class="pop bad">Boing!</b>`;
    restart($('rival'), 'counter'); restart($('fighter'), 'dizzy'); restart(fx, 'go-back');
  }
  function hud() {
    const hp = Math.max(0, G.hp) / G.V.health, en = Math.max(0, G.energy) / RULES.energy;
    $('rivalHp').firstElementChild.style.transform = `scaleX(${hp})`;
    $('rivalHp').setAttribute('aria-valuenow', Math.max(0, G.hp)); $('rivalHp').setAttribute('aria-valuemax', G.V.health);
    $('rivalHits').textContent = `${Math.max(0, G.hp)} hit${G.hp === 1 ? '' : 's'} left`;
    $('energy').innerHTML = Array.from({length: RULES.energy}, (_, i) => `<i class="${i < G.energy ? 'on' : ''}"></i>`).join('');
    $('energy').setAttribute('aria-valuenow', Math.max(0, G.energy)); $('energy').setAttribute('aria-valuemax', RULES.energy);
    $('energy').classList.toggle('low', en <= .4);
    const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor(G.combo / RULES.comboStep));
    $('hudCombo').textContent = G.combo ? `${G.combo}${mult > 1 ? ' ×' + mult : ''}` : '0';
    $('hudCombo').classList.toggle('hot', mult > 1);
    $('hudScore').textContent = G.score;
  }
  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }

  /* ---------- results ---------- */
  function finish(result) {
    stopTimers();
    const {lv, V, score, hits, mistakes, bestCombo} = G, won = result === 'ko';
    G.locked = true;
    const stars = won ? (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1) : 0;
    const old = A.store.level(GAME_ID, member.id, lv);
    A.store.setLevel(GAME_ID, member.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)});
    const unlocked = won && old.stars === 0 && lv < RIVALS.length;
    $('resRival').innerHTML = rivalSVG(V, won ? 'bowing' : '');
    $('resStars').innerHTML = A.starStr(stars);
    $('resTitle').textContent = won ? (stars === 3 ? 'Perfect K.O.!' : 'K.O.! You win!') : result === 'time' ? 'Time over' : 'Out of energy';
    $('resMsg').textContent = won
      ? (stars === 3 ? `Flawless! ${V.name} bows out, seeing stars.` : stars === 2 ? 'Win with no mistakes for 3 stars.' : 'Win with 2 or fewer mistakes for 2 stars.') +
        (unlocked ? ` ${RIVALS[lv].name} steps into the ring!` : lv === RIVALS.length ? ' You beat the final boss!' : '')
      : result === 'time' ? `${V.name} still had ${G.hp} hit${G.hp === 1 ? '' : 's'} left when the notes ran out. Study the CHART and try again!`
      : `${V.name} won this round. Check the CHART for the fingerings, then go for a rematch. You've got this!`;
    $('resHits').textContent = `${hits}/${V.health}`;
    $('resWrong').textContent = mistakes; $('resCombo').textContent = bestCombo; $('resScore').textContent = score;
    const newBest = score > old.best && old.best > 0;
    $('resBest').textContent = newBest ? 'New best score!' : old.best ? `Best: ${Math.max(score, old.best)}` : '';
    const hasNext = lv < RIVALS.length && (stars > 0 || A.DEMO);
    $('resNext').hidden = !hasNext;
    $('results').hidden = false;
    (hasNext ? $('resNext') : $('resRetry')).focus();
    if (won) sfx('level-complete'); else if (result !== 'time') sfx('level-failed');
    let t = 520;
    if (stars > old.stars) { later(() => sfx('star-earned'), t); t += 380; }
    if (newBest) later(() => sfx('new-high-score'), t);
  }
  $('resNext').addEventListener('click', () => startLevel(G.lv + 1));
  $('resRetry').addEventListener('click', () => startLevel(G.lv));
  $('resLevels').addEventListener('click', showHub);
  $('quitPlay').addEventListener('click', showHub);
  $('strikeBtn').addEventListener('click', strike);
  $('clearBtn').addEventListener('click', clearCombo);

  /* ---------- CHART: every note in the game with its primary fingering (study mode, never during a match) ---------- */
  function showChart() {
    const five = inst.notes.map(n => ({show: n, midi: writtenMidi(n), sig: null, n}));
    const sections = [{title: `Rivals 1 and 2: your first five notes`, items: five}].concat(['Bb', 'Eb', 'F', 'Ab'].map((id, k) => {
      const sc = A.Scales.build(member, id);
      return {title: `Rival ${k + 3}, ${RIVALS[k + 2].name}: ${sc.label}`, items: sc.up.map(n => ({show: n.show, midi: n.midi, sig: sc.sig, n}))};
    }));
    $('chartTitle').textContent = `Fingering chart: ${member.name}`;
    $('chartBody').innerHTML = sections.map(s => `<section class="ch-sec"><h3>${s.title}</h3><div class="ch-grid">${s.items.map(card).join('')}</div></section>`).join('') +
      `<p class="muted ch-foot">Rivals 7 and 8 (${RIVALS[6].name} and ${RIVALS[7].name}) mix all four scales.</p>`;
    $('chartBody').querySelectorAll('.ch-card').forEach(c => {
      const f = T.notes(+c.dataset.midi)[0];
      if (f) M.setState(c.querySelector('.diagram'), M.pressedOf(f.keys));
    });
    $('chart').hidden = false; $('chartBody').scrollTop = 0;
    $('chartClose').focus();
  }
  function card(it) {
    const fs = T.notes(it.midi), sigW = A.keySigWidth(it.sig), W = 170 + sigW, name = noteLabel(it.n);
    const staff = A.staffSVG(member.clef, [{n: it.show, x: (84 + sigW + W - 20) / 2}], {keySig: it.sig, width: W, label: `${name}${it.n.oct} on the staff`});
    return `<figure class="ch-card" data-midi="${it.midi}"><div class="ch-note"><div class="ch-staff">${staff}</div><figcaption><b>${name}</b><small>${name}${it.n.oct}</small></figcaption></div>` +
      `<div class="ch-fing">${M.diagramSVG(T.diagram, {label: `${name}: ${fs.length ? fs[0].text : 'no fingering listed'}`})}` +
      `<p class="ch-prim">${fs.length ? fs[0].text : 'Missing from fingerings.js'}</p>` +
      (fs.length > 1 ? `<p class="ch-alt">Also: ${fs.slice(1).map(f => f.text).join(' · ')}</p>` : '') + `</div></figure>`;
  }
  $('chartBtn').addEventListener('click', showChart);
  $('chartClose').addEventListener('click', () => { $('chart').hidden = true; $('chartBtn').focus(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('chart').hidden) { $('chart').hidden = true; $('chartBtn').focus(); } });

  showHub();
})(window.Arcade);
