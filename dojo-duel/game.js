/* DOJO DUEL: a two-player note-reading race on one device (Band Ninja world). NO microphone.
   Each player has their own half of the screen: their own note (their own clef, note set and Note Ninja belt),
   their own answer pad (shared/answer-pad.js, Note Ninja's layout). The first correct tap wins the point; a wrong
   tap stuns that player for a second. Every point: a COUNTDOWN (QUICK / CLASSIC / OFF, chosen on the setup screen),
   the note on both sides at the same instant, then a RESULT MOMENT (the strike, "+1", both answers shown).
   Settings: levels.js (DUEL_PACING = every timing, DUEL_RULES, DUEL_SENSEI, DUEL_LINES). Belts and their
   note pools: note-ninja/levels.js (NINJA_BELTS) + shared/sequences.js; nothing is copied here.
   Saved: store.gameData('dojo-duel') = {setup, record: {'<player name>': wins}, sensei: {easy|medium|hard: {w, l}}}
   (part of the Arcade Backup Code, which saves all gameData). No stars, no effect on Note Ninja. */
(function (A) {
  "use strict";
  const $ = id => document.getElementById(id);
  const GAME_ID = 'dojo-duel', R = window.DUEL_RULES, PACE = window.DUEL_PACING, CPUS = window.DUEL_SENSEI, LINES = window.DUEL_LINES;
  const BELTS = window.NINJA_BELTS;
  // every sound of a countdown (preloaded on the setup screen; their fallbacks dojo-count and dojo-reveal come too)
  const COUNT_SOUNDS = ['sensei-begin', 'dojo-count-3', 'dojo-count-2', 'dojo-count-1', 'dojo-count', 'dojo-begin', 'dojo-count-go'];
  const REF = {treble: 'trumpet', bass: 'trombone'};           // whose notes a clef reads when the player's own instrument doesn't fit
  const KEYS = [
    {letters: ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU'], flat: 'KeyA', sharp: 'KeyS', show: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U'], fs: ['A', 'S']},
    {letters: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'], flat: 'Digit8', sharp: 'Digit9', show: ['1', '2', '3', '4', '5', '6', '7'], fs: ['8', '9']},
  ];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const tok = name => getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const line = (k, name) => pick(LINES[k] || ['']).replace(/\{name\}/g, name || '');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  A.mountTopbar(null, '', GAME_ID, {fixed: 'Band Ninja'});
  if (A.DEMO) $('demoHelp').hidden = false;
  $('setupSensei').innerHTML = A.senseiSVG('happy');

  /* ---------- the setup (remembered on this device) ---------- */
  const data = () => A.store.gameData(GAME_ID);
  const touchFirst = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 1;
  const savedMember = () => { const m = A.store.player && A.memberById(A.store.player); return m && m.pitched !== false && m.id !== 'bells' ? m : null; };
  function defaults() {
    const m = savedMember();
    return {mode: '2p', cpu: 'medium', to: R.length, layout: touchFirst ? 'table' : 'side', count: 'quick',
            p: [{clef: m ? m.clef : 'treble', notes: 'first5', belt: 1, named: false}, {clef: 'treble', notes: 'first5', belt: 1, named: false}]};
  }
  const S = Object.assign(defaults(), data().setup || {});
  S.p = [0, 1].map(i => Object.assign(defaults().p[i], (S.p || [])[i] || {}));
  if (!R.lengths.includes(S.to)) S.to = R.length;
  if (!CPUS.some(c => c.id === S.cpu)) S.cpu = 'medium';
  if (!R.countdowns.includes(S.count)) S.count = 'quick';
  function saveSetup() { data().setup = JSON.parse(JSON.stringify(S)); A.store.saveGameData(GAME_ID); }

  const beltOpen = lv => lv === 1 || A.DEMO || A.store.bestLevelStars('note-ninja', lv - 1) > 0 || A.store.bestLevelStars('note-ninja', lv) > 0;
  S.p.forEach(p => { if (!beltOpen(p.belt)) p.belt = 1; });
  const beltOf = lv => A.belt(BELTS[lv - 1].name);
  const cpuOn = () => S.mode === 'cpu';
  const src = pi => (cpuOn() && pi === 1 ? 0 : pi);             // the Sensei reads the same kind of notes as Player 1
  /** the instrument a player's notes are written for: Player 1's own (if it reads this clef), else a reference one */
  function refMember(pi) {
    const c = S.p[src(pi)].clef, m = src(pi) === 0 ? savedMember() : null;
    return m && m.clef === c ? m : A.memberById(REF[c]);
  }
  const groupOf = m => A.groupFor(m.id, {hornStart: A.store.hornStart});
  const avName = pi => A.Avatar.nameOf(pi ? A.Avatar.guest() : A.Avatar.get());
  const nameOf = pi => cpuOn() && pi === 1 ? 'Sensei' : S.p[pi].named ? avName(pi) : `Player ${pi + 1}`;
  const wins = name => (data().record || {})[name] || 0;
  const recordText = name => { const n = wins(name); return `Dojo record: ${n} ${n === 1 ? 'win' : 'wins'}`; };
  const pic = (pi, size) => cpuOn() && pi === 1 ? `<span class="sensei-pic">${A.senseiSVG('calm')}</span>`
    : A.avatarHTML({size, member: null, guest: pi === 1});
  /** what a belt means in the duel (its pool + guides + hints come from Note Ninja's belt) */
  function beltText(lv) {
    const L = BELTS[lv - 1];
    return [L.pool < 5 ? 'Only the first notes of your set.' : 'Your whole note set.',
            L.guides >= .5 ? 'Letter guides on the staff.' : L.guides > 0 ? 'Faint letter guides.' : 'No guides.',
            L.relabel === false ? 'The buttons give no ♭/♯ hints.' : ''].filter(Boolean).join(' ');
  }
  function notesChoices(pi) {
    const m = refMember(pi), g = groupOf(m);
    return A.NOTE_CHOICES.map(c => {
      const sub = c.id === 'first5' ? g.notes.map(A.music.noteLabel).join(' ') : c.id === 'chrom' ? 'Every note' : A.Scales.build(m, c.id).key;
      return {id: c.id, name: c.id === 'first5' || c.id === 'chrom' ? c.short : sub, sub: c.id === 'first5' || c.id === 'chrom' ? sub : 'scale'};
    });
  }

  const seg = (list, cur, attr = 'v') => list.map(o => `<button type="button" data-${attr}="${o.v}" aria-pressed="${String(o.v) === String(cur)}">${o.html}</button>`).join('');
  function renderCard(pi) {
    const el = $('card' + (pi + 1)), p = S.p[pi];
    if (cpuOn() && pi === 1) {
      const C = CPUS.find(c => c.id === S.cpu), rec = (data().sensei || {})[S.cpu] || {w: 0, l: 0};
      el.className = 'pcard p2 cpu';
      el.innerHTML = `<div class="pc-head"><span class="pmark">CPU</span><span class="pc-pic">${pic(1, 'tile')}</span>` +
        `<div class="pc-name"><b>The Sensei</b><small>${C.name}: ${esc(C.blurb)}</small><small>You vs. Sensei (${C.name}): ${rec.w} won, ${rec.l} lost</small></div></div>` +
        `<p class="pc-note">The Sensei reads the same kind of notes as you: same clef, same notes, same belt.</p>`;
      return;
    }
    el.className = 'pcard p' + (pi + 1);
    const belts = BELTS.map((L, i) => {
      const lv = i + 1, open = beltOpen(lv), b = A.belt(L.name);
      return `<button type="button" class="bchip${b.sparkle ? ' sparkle' : ''}" data-belt="${lv}" style="--belt:var(--${b.color})" aria-pressed="${lv === p.belt}" ` +
        `${open ? '' : 'disabled'} aria-label="${L.name} belt${open ? '' : ' (locked: earn a star on the belt before it in Note Ninja)'}"><i></i><span>${L.name}</span>${open ? '' : '<em aria-hidden="true">🔒</em>'}</button>`;
    }).join('');
    el.innerHTML =
      `<div class="pc-head"><span class="pmark">${pi + 1}P</span><button type="button" class="pc-pic" data-act="edit" aria-label="Edit ${pi ? 'Player 2' : 'your player'}">${pic(pi, 'tile')}</button>` +
      `<div class="pc-name"><b data-name>${esc(nameOf(pi))}</b><small>${esc(recordText(nameOf(pi)))}</small></div></div>` +
      `<div class="pc-btns"><div class="seg seg-sm" role="group" aria-label="Name">${seg([{v: 0, html: `Player ${pi + 1}`}, {v: 1, html: esc(avName(pi))}], +p.named, 'named')}</div>` +
      `<button type="button" class="btn btn-ghost btn-small" data-act="edit">${pi ? 'Edit player 2' : 'Edit player'}</button>` +
      (pi ? `<button type="button" class="btn btn-ghost btn-small" data-act="random">Surprise me</button>` : '') + `</div>` +
      `<div class="pc-row"><span class="dd-lbl">Clef</span><div class="seg" role="group" aria-label="Clef">${seg([{v: 'treble', html: '<i class="clef">𝄞</i> Treble'}, {v: 'bass', html: '<i class="clef">𝄢</i> Bass'}], p.clef, 'clef')}</div></div>` +
      `<div class="pc-row"><span class="dd-lbl">Notes</span><div class="seg seg-notes" role="group" aria-label="Notes">` +
      notesChoices(pi).map(c => `<button type="button" data-notes="${c.id}" aria-pressed="${c.id === p.notes}"><b>${c.name}</b><small>${c.sub}</small></button>`).join('') + `</div></div>` +
      `<div class="pc-row"><span class="dd-lbl">Belt</span><div class="belts" role="group" aria-label="Belt">${belts}</div></div>` +
      `<p class="pc-note"><b>${BELTS[p.belt - 1].name} belt:</b> ${beltText(p.belt)}</p>`;
  }
  function onCard(pi, e) {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const p = S.p[pi];
    if (b.dataset.act === 'edit') {
      A.AvatarCreator.open({guest: pi === 1, member: null, onClose: () => { p.named = true; saveSetup(); renderSetup(); }});
      return;
    }
    if (b.dataset.act === 'random') { A.Avatar.setGuest(A.Avatar.random()); p.named = true; A.Sfx.event('avatar-randomize'); }
    else if (b.dataset.named != null) p.named = b.dataset.named === '1';
    else if (b.dataset.clef) p.clef = b.dataset.clef;
    else if (b.dataset.notes) p.notes = b.dataset.notes;
    else if (b.dataset.belt) p.belt = +b.dataset.belt;
    else return;
    if (!b.dataset.act) A.Sfx.event('ui-toggle');
    saveSetup(); renderSetup();
    const again = $('card' + (pi + 1)).querySelector(Object.keys(b.dataset).map(k => `[data-${k.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}="${b.dataset[k]}"]`).join(''));
    if (again && document.activeElement === document.body) again.focus({preventScroll: true});
  }
  $('card1').addEventListener('click', e => onCard(0, e));
  $('card2').addEventListener('click', e => onCard(1, e));

  function renderSetup() {
    $('segMode').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.mode)));
    $('segCpu').innerHTML = seg(CPUS.map(c => ({v: c.id, html: c.name})), S.cpu);
    $('segTo').innerHTML = seg(R.lengths.map(n => ({v: n, html: `First to ${n}`})), S.to);
    $('segLayout').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.layout)));
    $('segCount').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.count)));
    $('fieldCpu').hidden = !cpuOn();
    $('fieldLayout').hidden = cpuOn();
    $('modeNote').textContent = cpuOn()
      ? 'Solo: you against the Sensei. Your half faces you; the Sensei plays on the other side.'
      : S.layout === 'table'
        ? 'Tabletop: lay the device flat between you. The far half turns to face Player 2. Tip: turn on Rotation Lock so the screen stays put.'
        : 'Side by side: Player 1 on the left, Player 2 on the right, both facing the screen.';
    $('countNote').textContent = {quick: 'Quick: a fast 3-2-1 before each note.', classic: 'Classic: a slow 3-2-1 (one second a number) before each note.',
      off: 'Off: no countdown, just a short pause before each note.'}[S.count] + ' The first note, and the one after a match point, always get the slow 3-2-1.';
    renderCard(0); renderCard(1);
    renderKeymap();
  }
  function renderKeymap() {
    const row = (pi, who) => {
      const K = KEYS[pi];
      return `<div class="km"><b>${who}</b><span class="km-keys">` +
        A.AnswerPad.LETTERS.map((l, i) => `<span><kbd>${K.show[i]}</kbd>${l}</span>`).join('') +
        `<span><kbd>${K.fs[0]}</kbd>♭</span><span><kbd>${K.fs[1]}</kbd>♯</span></span></div>`;
    };
    $('keymap').innerHTML = `<p class="dd-lbl">Keyboard (Chromebooks)</p>` +
      (cpuOn() ? row(0, 'You') : row(0, 'Player 1 (left)') + row(1, 'Player 2 (right)')) +
      `<p class="km-note">Tap ♭ or ♯ first, then the letter (like Note Ninja's buttons). Touch screens: just tap your own buttons; both players can tap at the same time.</p>`;
  }
  $('segMode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.mode = b.dataset.v; A.Sfx.event('ui-toggle'); saveSetup(); renderSetup(); });
  $('segCpu').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.cpu = b.dataset.v; A.Sfx.event('ui-toggle'); saveSetup(); renderSetup(); });
  $('segTo').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.to = +b.dataset.v; A.Sfx.event('ui-toggle'); saveSetup(); renderSetup(); });
  $('segLayout').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.layout = b.dataset.v; A.Sfx.event('ui-toggle'); saveSetup(); renderSetup(); });
  $('segCount').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.count = b.dataset.v; A.Sfx.event('ui-toggle'); saveSetup(); renderSetup(); });
  $('goBtn').addEventListener('click', () => startMatch());

  function showSetup() {
    stopLoop(); M = null;
    document.body.classList.remove('dueling');
    $('duel').hidden = true; $('paused').hidden = true; $('wrap').hidden = false;
    holdOrientation();
    A.Sfx.setMusic(['dojo-music'], {builtIn: true});
    // the countdown's sounds load (and decode) now, so the first countdown of a match is on time
    A.Sfx.prefer(COUNT_SOUNDS);
    renderSetup();
    window.scrollTo(0, 0);
  }

  /* ---------- the duel ---------- */
  let M = null, raf = 0;
  const now = () => M.clock;

  function makePlayer(pi) {
    const p = S.p[src(pi)], L = BELTS[p.belt - 1], m = refMember(pi);
    const P = {pi, cpu: cpuOn() && pi === 1, name: nameOf(pi), clef: p.clef, notes: p.notes, lv: p.belt, L, member: m, group: groupOf(m),
               belt: beltOf(p.belt), seq: null, i: 0, it: null, prev: null, score: 0, stunUntil: 0, pad: null,
               stats: {right: 0, wrong: 0, times: [], notes: {}}};
    P.full = A.buildSequence({member: m, group: P.group, notes: p.notes, order: 'random', level: 2, count: 8, pool: 5});
    newSeq(P);
    P.accs = P.seq.items.concat(P.seq.pool).some(it => it.n.acc);   // ♭ ♮ ♯ only when this player's notes have any
    return P;
  }
  function newSeq(P) {
    P.seq = A.buildSequence({member: P.member, group: P.group, notes: P.notes, order: 'random', level: P.lv, count: 60, pool: P.L.pool});
    P.i = 0;
    if (P.prev && P.seq.items.length > 1 && P.seq.items[0].midi === P.prev.midi) P.seq.items.push(P.seq.items.shift());
  }
  function nextItem(P) {
    if (P.i >= P.seq.items.length) newSeq(P);
    P.prev = P.it = P.seq.items[P.i++];
    return P.it;
  }

  function layoutNow() {
    if (cpuOn()) return innerWidth >= innerHeight ? 'side' : 'stack';
    return S.layout === 'table' ? 'table' : 'side';
  }
  function applyLayout() {
    if (!M) return;
    const lay = layoutNow();
    M.layout = lay;
    $('duel').className = 'duel lay-' + lay + (cpuOn() ? ' solo' : '');
    holdOrientation();
  }

  function halfHTML(P) {
    const pi = P.pi;
    return `<div class="hf-in">` +
      `<div class="hf-top">` +
        `<div class="ninja" id="nj${pi}" style="--belt:var(--${P.belt.color})"><span class="nj-pic">${pic(pi, 'tile')}</span>` +
          (P.cpu ? '' : `<i class="band" aria-hidden="true"><b></b></i>`) + `<span class="stars" aria-hidden="true"><i>★</i><i>★</i><i>★</i></span></div>` +
        `<div class="hf-who"><b>${esc(P.name)}</b><small><i class="bdot" style="--belt:var(--${P.belt.color})"></i>${P.L.name} belt · ${P.clef === 'treble' ? 'Treble' : 'Bass'}</small></div>` +
        `<em class="mpt" id="mpt${pi}" hidden>MATCH POINT</em>` +
      `</div>` +
      `<div class="hf-body" id="body${pi}">` +
        `<div class="stage hf-stage"><div class="hf-staff" id="st${pi}"></div><div class="tbar" aria-hidden="true"><i id="tb${pi}"></i></div>` +
          `<div class="hf-call" id="call${pi}" aria-live="assertive"></div></div>` +
        `<p class="say" id="say${pi}" aria-live="polite"></p>` +
        `<div class="hf-pad${P.cpu ? ' cpu' : ''}" id="pad${pi}"></div>` +
        (A.DEMO ? `<p class="demo-ans" id="demo${pi}"></p>` : '') +
      `</div>` +
      `<div class="hf-res" id="res${pi}" hidden></div>` +
      `<em class="mpb" id="mpb${pi}" hidden>MATCH POINT</em>` +
    `</div>`;
  }

  function startMatch() {
    stopLoop();
    saveSetup();
    M = {to: S.to, clock: 0, last: 0, paused: false, running: false, phase: 'count', first: true, pt: null, P: [makePlayer(0), makePlayer(1)], mpShown: [false, false],
         cpu: cpuOn() ? CPUS.find(c => c.id === S.cpu) : null, angle0: angle(), timers: []};
    $('wrap').hidden = true; $('paused').hidden = true;
    document.body.classList.add('dueling');
    const d = $('duel'); d.hidden = false;
    M.P.forEach(P => {
      $('h' + (P.pi + 1)).innerHTML = halfHTML(P);
      $('h' + (P.pi + 1)).classList.remove('done', 'stunned');
      $('h' + (P.pi + 1)).setAttribute('aria-label', `${P.name}'s side`);
      P.pad = A.AnswerPad.mount($('pad' + P.pi), {accs: P.accs, relabel: P.L.relabel, cls: 'dd-pad',
        onAnswer: (letter, acc, ev) => { if (!P.cpu) answer(P.pi, letter, acc, ev); }});
      $('pad' + P.pi).style.setProperty('--pad', `var(--${P.pi ? 'pink' : 'cyan'})`);
    });
    $('midSensei').innerHTML = A.senseiSVG('calm');
    applyLayout();
    drawScores();
    A.Sfx.setMusic(['dojo-match-music'], {builtIn: true});
    if (screen.orientation && screen.orientation.lock && M.layout === 'table') screen.orientation.lock(screen.orientation.type).catch(() => {});
    M.running = true;
    countdown();                                   // the first note: always a CLASSIC 3-2-1 and BEGIN!
    M.last = performance.now(); raf = requestAnimationFrame(loop);
  }
  /** a game-clock timeout (stops while paused) */
  function later(ms, fn) { M.timers.push({at: M.clock + ms, fn}); }
  function stopLoop() { cancelAnimationFrame(raf); raf = 0; }

  /** the big word over both staffs (each half faces its own player, so this reads right on both sides) */
  function call(text, cls = '') {
    [0, 1].forEach(pi => {
      const c = $('call' + pi); if (!c) return;
      c.textContent = text; c.className = 'hf-call'; void c.offsetWidth; c.className = 'hf-call ' + cls;   // restart the scale-in
    });
  }
  function say(pi, text, cls = '') {
    const el = $('say' + pi); if (!el) return;
    el.textContent = text; el.className = 'say ' + cls;
  }
  function sayBoth(text, cls) { say(0, text, cls); say(1, text, cls); }
  function ninja(pi, mood) {
    const el = $('nj' + pi); if (!el) return;
    el.classList.remove('ready', 'jump', 'dizzy', 'sad', 'bow', 'win', 'strike', 'stagger');
    void el.offsetWidth;
    if (mood) el.classList.add(mood);
    if (M && M.P[pi].cpu) el.querySelector('.nj-pic').innerHTML = `<span class="sensei-pic">${A.senseiSVG(mood === 'jump' || mood === 'win' || mood === 'strike' ? 'happy' : mood === 'dizzy' || mood === 'stagger' ? 'hmm' : 'calm')}</span>`;
  }

  /* one note on this player's staff, in their clef, with their set's key signature and their belt's guides */
  function drawStaff(P, blank) {
    const sigW = A.keySigWidth(P.seq.sig), guides = P.L.guides > 0;
    const start = 84 + sigW + (guides ? 34 : 0), W = start + 150, x = start + 60;
    P.W = W; P.x = x;
    let svg = A.staffSVG(P.clef, blank || !P.it ? [] : [{n: P.it.show, x, id: 'ddn' + P.pi}],
      {fit: P.full.fit.concat(P.seq.fit), keySig: P.seq.sig, width: W, captions: true, label: blank ? 'Get ready' : `${P.name}: name this note`});
    if (guides) svg = svg.replace('</svg>', A.staffGuides(P.clef, 66 + sigW, P.L.guides) + '</svg>');
    $('st' + P.pi).innerHTML = svg;
  }
  /** the result: the note turns gold (this player won it) or coral, and its name appears right next to it */
  function reveal(P, color) {
    A.colorNote('ddn' + P.pi, color);
    const g = document.getElementById('ddn' + P.pi);
    if (!g) return;
    const y = A.noteY(P.clef, P.it.show);
    g.insertAdjacentHTML('beforeend', `<text class="ncap ans" x="${P.x + 24}" y="${y + 10}" text-anchor="start" font-family='"GN Text",system-ui,sans-serif' font-weight="700" font-size="30" fill="${color}" stroke="${tok('screen')}" stroke-width="5" paint-order="stroke">${P.it.label}</text>`);
  }

  /* ---------- a point: COUNTDOWN → the NOTE (both sides, one frame) → a tap → the RESULT MOMENT ---------- */
  /** the countdown before a note: buttons locked (a little dimmed), empty staffs, 3-2-1 over both staffs.
      QUICK / CLASSIC / OFF from the setup; the first note of a match and the note after a new MATCH POINT: CLASSIC.
      SOUNDS: CLASSIC = the spoken numbers dojo-count-3/-2/-1 (each falls back to the dojo-count tick); QUICK = the
      tick (a spoken number is too long for its steps); OFF = none. Every style: dojo-count-go when the note appears
      (showNote). The first countdown of a match waits for sensei-begin to end first. Nothing ever stops a sound:
      each one plays to its end (sfx.js gives every play its own voice). */
  function countdown() {
    if (!M) return;
    M.phase = 'count';
    const first = M.first; M.first = false;
    M.P.forEach(P => {
      P.pad.lock(true);
      $('pad' + P.pi).classList.add('waiting');
      $('pad' + P.pi).querySelectorAll('.good,.bad,.answer').forEach(b => b.classList.remove('good', 'bad', 'answer'));
      $('h' + (P.pi + 1)).classList.remove('won');
      $('mpb' + P.pi).hidden = true;
      drawStaff(P, true);
      if (M.clock >= P.stunUntil) ninja(P.pi, 'ready');
      const d = $('demo' + P.pi); if (d) d.textContent = '';
    });
    sayBoth(first ? line('ready') : '');
    const kind = first || M.tense ? 'classic' : S.count;
    M.tense = false;
    M.countKind = kind;
    call('');
    if (kind === 'off') { later(PACE.offMs, showNote); return; }
    const step = kind === 'classic' ? PACE.classicStep : PACE.quickStep;
    const run = at => {
      [3, 2, 1].forEach((n, k) => later(at + k * step, () => {
        call(String(n), 'count');
        A.Sfx.event(kind === 'classic' ? 'dojo-count-' + n : 'dojo-count');
      }));
      later(at + 3 * step, () => {
        if (!first) { showNote(); return; }
        call(line('begin'), 'begin'); A.Sfx.event('dojo-begin');
        later(PACE.beginMs, showNote);
      });
    };
    if (!first) { run(0); return; }
    // a match starts with the Sensei's line, once the countdown's sounds are decoded (on time from the very first
    // number, even right after a fresh page load); the 3 comes after the line has finished (at once when muted)
    const m = M;
    A.Sfx.whenReady(COUNT_SOUNDS).then(() => {
      if (M !== m) return;
      later(0, () => {
        const d = A.Sfx.event('sensei-begin');
        run(d ? Math.min(d * 1000 + 250, PACE.senseiWaitMs) : 0);
      });
    });
  }
  /** the note appears on BOTH sides and both pads unlock, in this one call (one animation frame: the game-clock
      timers run inside requestAnimationFrame). The note clock (and the Sensei's reaction time) starts now. */
  function showNote() {
    if (!M) return;
    call('');
    M.pt = {t0: M.clock, done: false, hits: [], wrong: [false, false], tapped: [null, null], tie: null, cpu: null};
    M.P.forEach(P => {
      nextItem(P); drawStaff(P);
      P.pad.set({accs: P.accs, relabel: P.L.relabel});
      $('pad' + P.pi).classList.remove('waiting');
      P.pad.lock(P.cpu || M.clock < P.stunUntil);
      if (M.clock >= P.stunUntil) ninja(P.pi, 'ready');
      const d = $('demo' + P.pi); if (d) d.textContent = 'Demo answer: ' + P.it.label;
    });
    M.phase = 'play';
    sayBoth('');
    A.Sfx.event('dojo-count-go');          // "go!" (falls back to dojo-reveal): never both
    if (M.cpu) planCpu();
  }

  /* the Sensei (Solo): reacts after its difficulty's time, sometimes with a wrong tap first */
  function planCpu() {
    const C = M.cpu, react = C.react * (1 + (Math.random() * 2 - 1) * C.spread) * 1000;
    M.pt.cpu = Math.random() < C.wrong ? {at: M.pt.t0 + react * .7, wrong: true, react} : {at: M.pt.t0 + react, wrong: false};
  }
  function cpuStep() {
    const pt = M.pt, P = M.P[1], c = pt && pt.cpu;
    if (!c || pt.done || M.clock < c.at || M.clock < P.stunUntil) return;
    const it = P.it;
    if (c.wrong) {
      const others = A.AnswerPad.LETTERS.filter(l => l !== it.n.letter);
      const l = pick(others);
      pt.cpu = {at: M.clock + PACE.stunMs + c.react * .5, wrong: false};
      answer(1, l, it.n.acc || 0, {timeStamp: performance.now()}, true);
    } else {
      pt.cpu = null;
      if (it.n.acc) P.pad.setAcc(it.n.acc);
      answer(1, it.n.letter, it.n.acc || 0, {timeStamp: performance.now()}, true);
    }
  }

  function noteRec(P, it) {
    const k = it.label + it.n.oct + (P.seq.sig ? 'k' : '');
    return P.stats.notes[k] || (P.stats.notes[k] = {it, sig: P.seq.sig, wrong: 0, missed: 0, lost: 0, times: []});
  }

  /** a tap: pi = the player, letter + acc (-1/0/1), ev.timeStamp decides ties */
  function answer(pi, letter, acc, ev, fromCpu) {
    if (!M || !M.running || M.paused || M.phase !== 'play' || !M.pt || M.pt.done) return;   // countdown / result: taps do nothing
    const P = M.P[pi], it = P.it;
    if (M.clock < P.stunUntil) return;
    if (P.cpu && !fromCpu) return;
    const ok = letter === it.n.letter && acc === (it.n.acc || 0);
    if (P.cpu) P.pad.mark(letter, ok ? 'good' : 'bad');
    if (ok) {
      P.pad.mark(letter, 'good');
      M.pt.hits.push({pi, ts: ev && ev.timeStamp || performance.now(), t: M.clock});
      if (!M.pt.tie) M.pt.tie = setTimeout(resolveHits, R.tieMs);
      P.pad.lock(true);
      return;
    }
    // WRONG: stunned for a moment (dizzy), the other player keeps going
    P.pad.mark(letter, 'bad');
    P.stats.wrong++; noteRec(P, it).wrong++;
    M.pt.wrong[pi] = true;
    M.pt.tapped[pi] = {letter, label: letter + (A.AnswerPad.SIGN[acc] || '')};
    P.stunUntil = M.clock + PACE.stunMs;
    P.pad.lock(true);
    $('h' + (pi + 1)).classList.add('stunned');
    ninja(pi, 'dizzy');
    A.Sfx.event('dojo-wrong');
    say(pi, line('wrong'), 'bad');
    if (M.pt.wrong.every(Boolean) && !M.pt.hits.length) endPoint(null, 'both');
  }
  function resolveHits() {
    const pt = M && M.pt; if (!pt || pt.done || !pt.hits.length) return;
    pt.tie = null;
    const w = pt.hits.reduce((a, b) => (b.ts < a.ts ? b : a));
    endPoint(w.pi, 'hit', w.t);
  }

  /** THE RESULT MOMENT: both answers on both sides (the right button glows, a wrong one stays coral), the winner's
      half glows in their belt color, their ninja strikes (a playful bump), "+1" flies to the score. Buttons stay
      locked. Then the next countdown, or the victory screen after the winning point. */
  function endPoint(w, why, t) {
    const pt = M.pt; pt.done = true;
    M.phase = 'result';
    clearTimeout(pt.tie);
    const gold = tok('gold-ink'), red = tok('red-ink');
    M.P.forEach(P => {
      P.pad.lock(true);
      const right = P.pad.el.querySelector(`.apad-letter[data-letter="${P.it.n.letter}"]`);
      if (right) right.classList.remove('bad');
      P.pad.mark(P.it.n.letter, 'good');
      if (right) right.classList.add('answer');
      reveal(P, P.pi === w ? gold : red);
      if (w == null) { if (why === 'timeout' && !pt.wrong[P.pi]) noteRec(P, P.it).missed++; }
      else if (P.pi !== w && !pt.wrong[P.pi]) noteRec(P, P.it).lost++;
    });
    const answerLine = P => { const tp = pt.tapped[P.pi]; return tp && tp.label !== P.it.label ? `You tapped ${tp.label}. It's ${P.it.label}.` : `It's ${P.it.label}.`; };
    let hold = PACE.noPointMs;
    if (w != null) {
      const P = M.P[w], ms = (t != null ? t : M.clock) - pt.t0, O = M.P[1 - w];
      P.score++; P.stats.right++; P.stats.times.push(ms); noteRec(P, P.it).times.push(ms);
      const half = $('h' + (w + 1));
      half.style.setProperty('--belt', `var(--${P.belt.color})`);
      half.classList.add('won');
      ninja(w, 'strike'); ninja(1 - w, 'stagger');
      const fast = !P.cpu && ms < PACE.fastMs;           // a player's very quick answer (never the Sensei's)
      say(w, 'POINT! ' + line(fast ? 'fast' : 'point', P.name), 'good');
      say(1 - w, O.cpu ? line('wrong') : answerLine(O), '');
      flyPoint(w, () => drawScores(w));
      const mp = matchPointCheck();
      M.tense = M.P.some(Q => Q.score === M.to - 1) && P.score < M.to;   // the next countdown is CLASSIC
      if (mp && P.score < M.to) { $('mpb' + mp.pi).hidden = false; say(mp.pi, (mp.pi === w ? 'POINT! ' : '') + line('matchPoint', mp.name), 'mp'); }
      // the Sensei's voice: sensei-point when the computer Sensei scores (Solo only; never together with sensei-fast),
      // sensei-fast after a player's very fast point (any mode)
      A.Sfx.sequence(['dojo-strike', 'dojo-point', mp && P.score < M.to && 'dojo-match-point', P.cpu ? 'sensei-point' : fast && 'sensei-fast']);
      hold = PACE.resultMs;
    } else {
      const text = line(why === 'timeout' ? 'timeout' : 'bothWrong');
      M.P.forEach(P => say(P.pi, P.cpu ? text : `${text} ${answerLine(P)}`, ''));
      A.Sfx.event('dojo-no-point');
      M.tense = M.P.some(Q => Q.score === M.to - 1);
    }
    later(hold, () => {
      if (w != null && M.P[w].score >= M.to) victory(w);
      else countdown();
    });
  }
  /** "+1" flies from the winner's ninja to their score, reading upright for that player (the top half in Tabletop
      is turned around); the score ticks up when it lands. Positions are layout positions inside the duel, so a
      counter-rotated duel (holdOrientation) still works. Reduced motion: the score just ticks up. */
  function flyPoint(w, done) {
    const from = $('nj' + w), to = $('sc' + (w + 1)), duel = $('duel');
    if (reduced() || !from || !to) { done(); return; }
    const a = centerIn(from), b = centerIn(to), turned = M.layout === 'table' && w === 1;
    const f = document.createElement('b');
    f.className = 'fly'; f.textContent = '+1';
    f.style.setProperty('--belt', `var(--${M.P[w].belt.color})`);
    f.style.left = a.x + 'px'; f.style.top = a.y + 'px';
    duel.appendChild(f);
    const r = turned ? ' rotate(180deg)' : '';
    const anim = f.animate([
      {transform: `translate(-50%, -50%)${r} scale(.6)`, opacity: 0},
      {transform: `translate(-50%, -50%)${r} scale(1.25)`, opacity: 1, offset: .25},
      {transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px))${r} scale(.8)`, opacity: 1}],
      {duration: PACE.flyMs, easing: 'ease-in'});
    const end = () => { f.remove(); done(); };
    anim.onfinish = end; anim.oncancel = end;
  }
  /** an element's center in the duel's own layout (offsets, so no transform on the duel matters), counting the
      half-turn of the far half and its score in Tabletop */
  function centerIn(el) {
    const duel = $('duel');
    let x = el.offsetWidth / 2, y = el.offsetHeight / 2, n = el;
    while (n && n !== duel) {
      if (M.layout === 'table' && (n.id === 'h2' || n.id === 'sc2')) { x = n.offsetWidth - x; y = n.offsetHeight - y; }
      x += n.offsetLeft; y += n.offsetTop;
      n = n.offsetParent;
    }
    return {x, y};
  }
  function matchPointCheck() {
    let fresh = null;
    M.P.forEach(P => {
      const on = P.score === M.to - 1;
      $('mpt' + P.pi).hidden = !on;
      $('sc' + (P.pi + 1)).classList.toggle('mp', on);
      if (on && !M.mpShown[P.pi]) { M.mpShown[P.pi] = true; fresh = P; }
      if (!on) M.mpShown[P.pi] = false;
    });
    return fresh;
  }
  function drawScores(scored) {
    M.P.forEach(P => {
      const el = $('sc' + (P.pi + 1));
      el.style.setProperty('--belt', `var(--${P.belt.color})`);
      el.innerHTML = `<span class="sc-pic">${pic(P.pi, 'chip')}</span><span class="sc-txt"><small>${esc(P.name)}</small><b>${P.score}</b></span>` +
        `<span class="sc-to">to ${M.to}</span><em>MATCH POINT</em>`;
      el.setAttribute('aria-label', `${P.name}: ${P.score} of ${M.to}`);
      if (scored === P.pi && !reduced()) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    });
  }

  /* the game clock: runs only while playing (not paused, tab visible) */
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    if (!M) return;
    const dt = Math.min(100, ts - M.last); M.last = ts;
    if (M.paused || document.hidden) return;
    M.clock += dt;
    for (const t of M.timers.filter(t => M.clock >= t.at)) { M.timers.splice(M.timers.indexOf(t), 1); t.fn(); if (!M) return; }
    const pt = M.pt;
    M.P.forEach(P => {
      if (P.stunUntil && M.clock >= P.stunUntil) {
        P.stunUntil = 0;
        $('h' + (P.pi + 1)).classList.remove('stunned');
        if (M.phase === 'play' && pt && !pt.done) { if (!P.cpu) P.pad.lock(false); ninja(P.pi, 'ready'); say(P.pi, ''); }
      }
    });
    if (!M.running) return;
    const left = M.phase === 'count' ? 1 : !pt || pt.done ? 0 : Math.max(0, 1 - (M.clock - pt.t0) / PACE.noteMs);
    M.P.forEach(P => { const b = $('tb' + P.pi); if (b) { b.style.transform = `scaleX(${left})`; b.parentNode.classList.toggle('low', left < .3); } });
    if (M.phase !== 'play' || !pt) return;
    if (M.cpu) cpuStep();
    if (!pt.done && !pt.hits.length && M.clock - pt.t0 >= PACE.noteMs) endPoint(null, 'timeout');
  }

  /* ---------- match over ---------- */
  function victory(w) {
    M.running = false;
    const W = M.P[w], Lz = M.P[1 - w];
    const d = data();
    if (M.cpu) {
      const r = (d.sensei || (d.sensei = {}))[M.cpu.id] || (d.sensei[M.cpu.id] = {w: 0, l: 0});
      if (w === 0) r.w++; else r.l++;
    }
    if (!W.cpu) { const rec = d.record || (d.record = {}); rec[W.name] = (rec[W.name] || 0) + 1; }
    A.store.saveGameData(GAME_ID);
    A.Sfx.setMusic(null);
    A.Sfx.sequence(['dojo-victory', 'sensei-victory']);
    $('mpt0').hidden = $('mpt1').hidden = true;
    $('mpb0').hidden = $('mpb1').hidden = true;
    M.P.forEach(P => $('h' + (P.pi + 1)).classList.remove('won'));
    ['sc1', 'sc2'].forEach(id => $(id).classList.remove('mp'));
    M.P.forEach(P => {
      $('body' + P.pi).hidden = true;
      $('h' + (P.pi + 1)).classList.add('done');
      const res = $('res' + P.pi); res.hidden = false;
      res.innerHTML = resultsHTML(P, W, Lz);
      res.querySelector('[data-act="rematch"]').addEventListener('click', () => startMatch());
      res.querySelector('[data-act="setup"]').addEventListener('click', () => { A.Sfx.event('ui-back'); showSetup(); });
      res.querySelector('[data-act="exit"]').addEventListener('click', () => A.Sfx.playThenGo('ui-back', A.homeLink(GAME_ID)));
      ninja(P.pi, P === W ? 'win' : 'bow');
    });
    later(1400, () => M.P.forEach(P => ninja(P.pi, 'bow')));
    const first = M.P.find(P => !P.cpu && P === W) || M.P[0];
    const btn = $('res' + first.pi).querySelector('[data-act="rematch"]'); if (btn) btn.focus({preventScroll: true});
  }
  function resultsHTML(P, W, Lz) {
    const won = P === W, st = P.stats, taps = st.right + st.wrong;
    const acc = taps ? Math.round(st.right / taps * 100) + '%' : '–';
    const avg = st.times.length ? (st.times.reduce((a, b) => a + b, 0) / st.times.length / 1000).toFixed(1) + ' s' : '–';
    const bows = `<div class="bows" aria-hidden="true">` +
      [W, Lz].map(Q => `<span class="bow-n${Q === W ? ' champ' : ''}" style="--belt:var(--${Q.belt.color})"><span class="nj-pic">${pic(Q.pi, 'tile')}</span>` +
        `${Q.cpu ? '' : '<i class="band"><b></b></i>'}<small>${esc(Q.name)}</small></span>`).join('<i class="bow-vs">🙇</i>') + `</div>`;
    const kicker = won ? 'VICTORY!' : 'WELL FOUGHT!';
    const msg = P.cpu ? line(won ? 'win' : 'lose', W.name)
      : won ? line('win', P.name) : W.cpu ? line('senseiWins') : line('lose', P.name);
    if (P.cpu) {
      return `<div class="res-in"><p class="res-k">${won ? 'THE SENSEI WINS' : `${esc(W.name).toUpperCase()} WINS!`}</p>${bows}` +
        `<p class="res-say">“${esc(won ? 'Well fought, young one. Practice these and challenge me again!' : 'The student becomes the master!')}”</p>` +
        `<p class="res-score">${W.score} – ${Lz.score}</p>${actsHTML()}</div>`;
    }
    return `<div class="res-in"><div class="res-a"><p class="res-k${won ? ' win' : ''}">${kicker}</p>${bows}` +
      `<p class="res-say">“${esc(msg)}”</p></div><div class="res-b">` +
      `<div class="res-stats"><div><small>Score</small><b>${P.score} – ${(P === W ? Lz : W).score}</b></div>` +
      `<div><small>Accuracy</small><b>${acc}</b></div><div><small>Avg answer</small><b>${avg}</b></div></div>` +
      `<p class="res-rec">${esc(recordText(P.name))}</p>` +
      practiceHTML(P) + actsHTML() + `</div></div>`;
  }
  const actsHTML = () => `<div class="res-acts"><button type="button" class="btn btn-gold" data-act="rematch">Rematch</button>` +
    `<button type="button" class="btn btn-ghost" data-act="setup">Change setup</button><button type="button" class="btn btn-ghost" data-act="exit">Exit</button></div>`;
  /** "Practice these": the notes this player missed (wrong taps, then no answer, then lost), or was slowest on */
  function practiceHTML(P) {
    const recs = Object.values(P.stats.notes);
    const avg = t => t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0;
    const allAvg = avg(P.stats.times);
    let list = recs.filter(r => r.wrong || r.missed || r.lost)
      .sort((a, b) => (b.wrong * 3 + b.missed * 2 + b.lost) - (a.wrong * 3 + a.missed * 2 + a.lost) || avg(b.times) - avg(a.times));
    if (list.length < 4) list = list.concat(recs.filter(r => !list.includes(r) && r.times.length && avg(r.times) > allAvg).sort((a, b) => avg(b.times) - avg(a.times)));
    list = list.slice(0, 4);
    if (!list.length) return `<p class="res-prac-none">Every note read cleanly. Sharp eyes!</p>`;
    const sig = P.seq.sig, sigW = A.keySigWidth(sig), gap = 78, start = 96 + sigW, W = start + gap * (list.length - 1) + 60;
    const svg = A.staffSVG(P.clef, list.map((r, k) => ({n: r.it.show, x: start + k * gap, caption: r.it.label})),
      {fit: list.map(r => r.it.show), keySig: sig, width: W, label: 'Practice these: ' + list.map(r => r.it.label).join(', ')});
    return `<div class="res-prac"><p class="dd-lbl">Practice these</p><div class="stage mini">${svg}</div></div>`;
  }

  /* ---------- pause (button, Esc, hidden tab) ---------- */
  function pause(on) {
    if (!M) return;
    M.paused = on;
    $('paused').hidden = !on;
    if (on) $('resumeBtn').focus({preventScroll: true});
    else M.last = performance.now();
  }
  $('pauseBtn').addEventListener('click', () => { if (M && M.running) pause(true); });
  $('resumeBtn').addEventListener('click', () => pause(false));
  $('pauseSetup').addEventListener('click', () => showSetup());
  $('pauseExit').addEventListener('click', () => A.Sfx.playThenGo('ui-back', A.homeLink(GAME_ID)));
  document.addEventListener('visibilitychange', () => { if (document.hidden && M && M.running && !M.paused) pause(true); });

  /* ---------- keyboards: each player has their own key group ---------- */
  addEventListener('keydown', e => {
    if (!M || $('duel').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Escape') { if (M.running) pause(!M.paused); return; }
    if (M.paused || e.repeat) return;
    for (let k = 0; k < 2; k++) {
      const K = KEYS[k], pi = cpuOn() ? 0 : k, P = M.P[pi];
      const li = K.letters.indexOf(e.code);
      if (li >= 0) { e.preventDefault(); P.pad.press(A.AnswerPad.LETTERS[li], e); return; }
      if (e.code === K.flat || e.code === K.sharp) {
        e.preventDefault();
        if (P.accs && M.phase === 'play' && M.clock >= P.stunUntil) { const a = e.code === K.flat ? -1 : 1; P.pad.setAcc(P.pad.el.querySelector(`.apad-acc[data-acc="${a}"]`).getAttribute('aria-pressed') === 'true' ? 0 : a); }
        return;
      }
    }
  });

  /* ---------- no zoom, selection, long-press menus or scrolling during play (iPad Safari) ---------- */
  const duel = $('duel');
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => { if (!duel.hidden) e.preventDefault(); }, {passive: false}));
  duel.addEventListener('touchmove', e => { if (!e.target.closest('.hf-res')) e.preventDefault(); }, {passive: false});
  duel.addEventListener('dblclick', e => e.preventDefault());
  duel.addEventListener('contextmenu', e => e.preventDefault());
  duel.addEventListener('selectstart', e => e.preventDefault());
  let lastTouchEnd = 0;       // old iPadOS: a quick second tap anywhere would zoom
  duel.addEventListener('touchend', e => { const t = e.timeStamp; if (t - lastTouchEnd < 350 && !e.target.closest('button')) e.preventDefault(); lastTouchEnd = t; }, {passive: false});

  /* ---------- TABLETOP: keep the layout when the device turns (the halves must stay with their players) ---------- */
  let angleOverride = null;   // tests
  function angle() {
    if (angleOverride != null) return angleOverride;
    if (screen.orientation && typeof screen.orientation.angle === 'number') return screen.orientation.angle;
    return typeof window.orientation === 'number' ? window.orientation : 0;
  }
  function holdOrientation() {
    const d = $('duel');
    if (!M || d.hidden || M.layout !== 'table') { d.style.cssText = ''; return; }
    const delta = ((angle() - M.angle0) % 360 + 540) % 360 - 180;   // how far the screen turned since the match began
    if (!delta) { d.style.cssText = ''; return; }
    if (Math.abs(delta) === 180) { d.style.cssText = 'transform:rotate(180deg)'; return; }
    d.style.cssText = `inset:auto;top:50%;left:50%;width:${innerHeight}px;height:${innerWidth}px;transform:translate(-50%,-50%) rotate(${-delta}deg)`;
  }
  addEventListener('resize', () => { if (M && !cpuOn()) holdOrientation(); else applyLayout(); });
  if (screen.orientation) screen.orientation.addEventListener('change', () => holdOrientation());

  /* tests (?demo) */
  A.Duel = {
    state: () => M && {running: M.running, paused: M.paused, clock: M.clock, layout: M.layout, to: M.to, phase: M.phase, countKind: M.countKind,
      pt: M.pt && {done: M.pt.done, wrong: M.pt.wrong.slice(), t0: M.pt.t0},
      players: M.P.map(P => ({name: P.name, cpu: P.cpu, clef: P.clef, notes: P.notes, belt: P.L.name, score: P.score, stunned: M.clock < P.stunUntil,
        it: P.it && {letter: P.it.n.letter, acc: P.it.n.acc || 0, oct: P.it.n.oct, midi: P.it.midi, label: P.it.label},
        pool: P.seq.pool.map(it => it.midi), stats: {right: P.stats.right, wrong: P.stats.wrong}}))},
    setup: () => JSON.parse(JSON.stringify(S)),
    rotate: a => { angleOverride = a; holdOrientation(); },
    tap: (pi, letter, ts) => M && M.P[pi].pad.press(letter, {timeStamp: ts}),   // a tap with a chosen time stamp (tie tests)
  };

  showSetup();
})(window.Arcade);
