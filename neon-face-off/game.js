/* Neon Face-Off: two-player air hockey played with instruments, on one device with one microphone.
   Turn-based: the puck slides toward a player's goal, their note appears on their note panel, and playing it
   strikes the puck back. The faster the reaction, the harder the shot. Player 1 is cyan, Player 2 magenta.
   Player 2 is another instrument (chosen on Select Player with &players=2) or the CPU ladder (levels.js).

   MICROPHONE RULES (one mic, two players): only the ACTIVE player's target counts. Every turn the detector is
   switched to that player's instrument and range, and ignoreCurrent() is called, so a note still ringing from the
   other player never counts. Each new target's concert pitch class differs from the note the other player just
   played. Sounds: every sound mutes the detector for its length + 250 ms (shared/sfx.js; at least RULES.suppressMs).
   The receiver's note appears only when that window ends (their window is stretched if the wait was long), and the
   puck and their reaction clock pause during any later window, so a sound never costs anyone time.
   The CPU plays silently (a flash on its panel), so it never reaches the mic.

   Notes come from shared/sequences.js (each player's own member and NOTES × ORDER, via the shared mode picker).
   Progress (vs CPU only): Arcade.store.setLevel('neon-face-off', <Player 1's member id>, rival 1–8, {stars, best}).
   Two-player matches award no stars; store.gameData('neon-face-off').h2h keeps the record for each pairing. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'neon-face-off';
  const RIVALS = window.FACEOFF_RIVALS, DIFF = window.FACEOFF_DIFFICULTY, RULES = window.FACEOFF_RULES;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const inst1 = A.requireInstrument(GAME_ID); if (!inst1) return;
  const opp = A.store.opponent;
  if (!opp) { location.replace(A.playerLink(GAME_ID)); return; }       // Player 2 hasn't been chosen yet
  const vsCPU = opp === 'cpu';
  A.mountTopbar(inst1, '<span class="sound-ctl" id="sndCtl"></span>', GAME_ID);
  A.Sfx.allowAmbience(false);
  $('demoHelp').hidden = !A.DEMO;
  $('changePlayers').href = A.playerLink(GAME_ID);

  const saved = A.store.gameData(GAME_ID);
  saved.settings = Object.assign({p1: {diff: 'rookie'}, p2: {diff: 'rookie'}, points: RULES.defaultPoints, rival: 1}, saved.settings);
  saved.h2h = saved.h2h || {};
  const remember = () => A.store.saveGameData(GAME_ID);

  /* ---------- the two players ---------- */
  function human(n, member, group) {
    return {n, cpu: false, member, group, name: member.short, color: n === 1 ? 'cyan' : 'pink', pic: member.id, memory: `${GAME_ID}:p${n}`};
  }
  const P = [human(1, A.currentMember(), inst1)];
  if (vsCPU) P.push({n: 2, cpu: true, color: 'pink', memory: `${GAME_ID}:p2`});
  else { const g2 = A.groupFor(opp, {hornStart: A.store.opponentHornStart}); P.push(human(2, A.getMember(g2, opp), g2)); }
  function setRival(lv) {                                               // the CPU wears its rival's instrument and color
    const R = RIVALS[lv - 1], g = A.groupFor(R.plays, {hornStart: 'F'});
    Object.assign(P[1], {rival: lv, R, member: A.getMember(g, R.plays), group: g, name: R.name, color: R.color, pic: R.plays});
    saved.settings.rival = lv; remember();
  }
  if (vsCPU) setRival(Math.min(RIVALS.length, Math.max(1, saved.settings.rival || 1)));
  const portrait = (p, size) => A.portraitHTML(p.pic, {size, color: p.cpu ? `var(--${p.R.color})` : undefined, label: p.name});
  const pairKey = () => `${P[0].member.id}>${P[1].member.id}`;

  /* ---------- match setup ---------- */
  const pickers = [];
  function showSetup() {
    stopMatch();
    $('setup').hidden = false; $('match').hidden = true; $('results').hidden = true;
    document.body.classList.remove('in-match');
    $('vsLine').innerHTML = `<span class="c1">${P[0].name}</span> vs <span class="c2">${vsCPU ? 'CPU' : P[1].name}</span>`;
    [0, 1].forEach(i => drawColumn(i));
    $('pointBtns').innerHTML = RULES.points.map(n => `<button type="button" class="seg" data-points="${n}" aria-pressed="${n === saved.settings.points}">${n}</button>`).join('');
    $('pointBtns').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { saved.settings.points = +b.dataset.points; remember(); showSetup(); }));
    const rec = saved.h2h[pairKey()];
    $('record').hidden = vsCPU;
    $('record').innerHTML = rec ? `Head to head on this device: <b class="c1">${P[0].name} ${rec.p1}</b> – <b class="c2">${rec.p2} ${P[1].name}</b>` : `First match for ${P[0].name} vs ${P[1].name} on this device.`;
    $('startBtn').textContent = vsCPU ? `Face off vs ${P[1].R.name}` : 'Start match';
    window.scrollTo(0, 0);
  }
  function drawColumn(i) {
    const p = P[i], col = $('col' + (i + 1));
    col.className = `col p${i + 1}`;
    if (p.cpu) {
      const lv = p.rival;
      col.innerHTML = `<div class="col-head"><span class="col-pic">${A.portraitSVG('cpu', {size: 'tile'})}</span><div><small>Player 2</small><b>CPU ladder</b></div></div>` +
        `<p class="muted">Beat each rival to unlock the next. Stars: win = 1, win by 4 = 2, shutout = 3.</p><div class="ladder">` +
        RIVALS.map((R, k) => {
          const n = k + 1, s = A.store.level(GAME_ID, P[0].member.id, n);
          const open = A.DEMO || n === 1 || s.stars > 0 || A.store.level(GAME_ID, P[0].member.id, n - 1).stars > 0;
          return `<button type="button" class="rung" data-rival="${n}" aria-pressed="${n === lv}" ${open ? '' : 'disabled'} style="--rc:var(--${R.color})">` +
            `<span class="r-pic">${open ? A.portraitSVG(R.plays, {size: 'tile', color: `var(--${R.color})`}) : A.portraitSVG('cpu', {size: 'tile'})}</span>` +
            `<span class="r-name"><small>Rival ${n}</small>${open ? R.name : 'Locked'}</span><span class="stars">${A.starStr(s.stars)}</span></button>`;
        }).join('') + `</div><p class="rung-line">${p.R.name}: ${p.R.line}</p>`;
      col.querySelectorAll('[data-rival]').forEach(b => b.addEventListener('click', () => { setRival(+b.dataset.rival); showSetup(); }));
      return;
    }
    const d = saved.settings['p' + (i + 1)].diff;
    col.innerHTML = `<div class="col-head"><span class="col-pic">${portrait(p, 'tile')}</span><div><small>Player ${i + 1}</small><b>${p.name}</b></div></div>` +
      `<div class="col-modes"></div>` +
      `<div class="diff"><span class="mp-lbl">Difficulty</span><div class="segs">` +
      DIFF.map(x => `<button type="button" class="seg" data-diff="${x.id}" aria-pressed="${x.id === d}"><b>${x.label}</b><small>${x.window} s</small></button>`).join('') + `</div></div>`;
    pickers[i] = A.ModePicker.mount(col.querySelector('.col-modes'), {gameId: GAME_ID, group: p.group, member: p.member, levels: 8, memory: p.memory, stars: false, onChange: () => {}});
    col.querySelectorAll('[data-diff]').forEach(b => b.addEventListener('click', () => { saved.settings['p' + (i + 1)].diff = b.dataset.diff; remember(); drawColumn(i); }));
  }
  $('startBtn').addEventListener('click', () => A.requireMic(startMatch));

  /* ---------- the match ---------- */
  let M = null, raf = 0, timers = [];
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.push(id); return id; };
  const now = () => performance.now();
  const sound = name => { if (RULES.sounds) A.Sfx.event(name); };
  function stopMatch() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); raf = 0; if (M) M.over = true; A.Pitch.demoNote = null; }

  function startMatch() {
    stopMatch();
    P.forEach((p, i) => {
      const d = p.cpu ? {window: RULES.cpuWindow, level: 2} : DIFF.find(x => x.id === saved.settings['p' + (i + 1)].diff) || DIFF[0];
      const st = p.cpu ? {notes: 'first5', order: 'random'} : pickers[i].state;
      p.window = d.window; p.notes = st.notes; p.order = st.order;
      p.seq = A.buildSequence({member: p.member, group: p.group, notes: st.notes, order: st.order, level: d.level, count: 400});
      p.idx = 0; p.score = 0; p.target = null; p.lastPc = null; p.returns = 0; p.smashes = 0; p.best = null;
    });
    M = {points: saved.settings.points, server: 0, active: null, state: 'idle', noteAt: 0, rally: 0, base: RULES.serveTime,
         puck: {u: .12, v: 0, path: null, t0: 0, T: 1, seg: 0}, trail: [], fx: [], shake: 0, over: false};
    $('setup').hidden = true; $('match').hidden = false; $('results').hidden = true;
    document.body.classList.add('in-match');
    P.forEach((p, i) => {
      const s = $('side' + (i + 1));
      s.querySelector('.s-pic').innerHTML = portrait(p, 'tile');
      s.querySelector('.s-name').textContent = p.cpu ? `${p.name} (CPU)` : p.name;
      s.querySelector('.s-note').innerHTML = ''; setStatus(i, '', '');
    });
    score();
    resize();
    startPoint(0);
    loop();
  }

  /* a point: the server's puck waits at their mallet; their note appears; playing it serves */
  function startPoint(server) {
    M.server = server; M.rally = 0; M.base = RULES.serveTime; M.state = 'serve';
    const u = server === 0 ? .12 : .88;
    M.puck = {u, v: 0, path: null, t0: now(), T: 1, seg: 0}; M.trail = [];
    banner(server === 0 ? 'p1' : 'p2', `${P[server].cpu ? P[server].name : 'Player ' + (server + 1)} serves`);
    later(() => banner(), 1100);
    beginTurn(server, true);
  }

  /* the receiver's turn: switch the detector to them, wait out the sound window, then show their note */
  function beginTurn(i, serve) {
    const p = P[i], other = P[1 - i];
    M.active = i; M.noteAt = 0; M.serveTurn = serve;
    sound('your-turn');
    A.Pitch.suppress(RULES.suppressMs);
    if (!p.cpu) {
      A.Pitch.setInstrument(p.group);
      if (p.notes === 'first5') A.Pitch.setRange(null); else A.Pitch.setRange(p.member.soundLow, p.member.soundHigh);
      A.Pitch.ignoreCurrent();
    }
    pickTarget(p, other.lastPc);
    P.forEach((q, k) => $('side' + (k + 1)).classList.toggle('active', k === i));
    P.forEach((q, k) => $('side' + (k + 1)).classList.toggle('dim', k !== i));
    setStatus(i, serve ? 'Get ready to serve…' : 'Get ready…', '');
    setStatus(1 - i, '', '');
    $('side' + (i + 1)).querySelector('.s-note').innerHTML = '';
    later(() => showNote(i), RULES.suppressMs);
  }
  function pickTarget(p, avoid) {
    if (p.idx >= p.seq.items.length - 1) { p.seq = A.buildSequence({member: p.member, group: p.group, notes: p.notes, order: p.order, level: 2, count: 400}); p.idx = 0; }
    const it = p.seq.items;
    const j = it.findIndex((x, k) => k >= p.idx && x.pc !== avoid);   // never the pitch class the other player just played
    if (j > p.idx) [it[p.idx], it[j]] = [it[j], it[p.idx]];
    p.target = it[p.idx++];
  }
  function showNote(i) {
    if (!M || M.over || M.active !== i || (M.state !== 'serve' && M.state !== 'travel')) return;
    const p = P[i];
    // a sound is still playing (a recording can be longer than suppressMs): the note waits until the detector hears again
    if (!p.cpu && A.Pitch.isSuppressed()) { later(() => showNote(i), A.Pitch.suppressedUntil - now() + 10); return; }
    if (!p.cpu && M.state === 'travel') {                               // …and the wait never eats into this player's window
      const t = now(), left = M.puck.t0 + M.puck.T - t, need = p.window * 1000;
      if (left < need) {                                                // same spot on the table, slower from here on
        const f = Math.min(.999, (t - M.puck.t0) / M.puck.T);
        M.puck.T = need / (1 - f); M.puck.t0 = t - f * M.puck.T;
      }
    }
    A.Pitch.ignoreCurrent();                                            // a note still ringing from before never counts
    M.noteAt = now();
    drawNote(i, p.target);
    setStatus(i, p.cpu ? (M.serveTurn ? 'Serving…' : 'Coming back…') : M.serveTurn ? 'YOUR SERVE' : 'YOUR TURN', p.cpu ? '' : 'turn');
    if (p.cpu) cpuTurn(i);
    else if (M.serveTurn) later(() => { if (M.active === i && M.state === 'serve' && M.noteAt) strike(i, RULES.serveMax, true); }, RULES.serveMax * 1000);
  }
  function drawNote(i, it) {
    const p = P[i], sigW = A.keySigWidth(p.seq.sig), W = 250 + sigW;
    $('side' + (i + 1)).querySelector('.s-note').innerHTML = A.staffSVG(p.group.clef, [{n: it.show, x: (84 + sigW + W - 30) / 2, id: 'nt' + i}],
      {fit: p.seq.fit, keySig: p.seq.sig, width: W, label: `${p.name}'s note`});
  }
  /* the CPU "plays" silently: a flash on its panel after its reaction time, or a miss */
  function cpuTurn(i) {
    const R = P[i].R, r = R.reaction[0] + Math.random() * (R.reaction[1] - R.reaction[0]);
    const left = M.state === 'serve' ? Infinity : (M.puck.t0 + M.puck.T - now()) / 1000;
    if (M.state === 'travel' && (Math.random() > R.accuracy || r >= left)) { later(() => setStatus(i, 'Missed it!', 'bad'), Math.min(r, left) * 1000); return; }
    later(() => { if (M && !M.over && M.active === i && M.noteAt) { A.colorNote('nt' + i, cssVar('--' + R.color) || '#fff'); strike(i, r); } }, r * 1000);
  }

  /* the microphone: only the active (human) player's note counts */
  A.Pitch.onHeld((pc, t) => {
    if (!M || M.over || M.active === null || !M.noteAt || (M.state !== 'serve' && M.state !== 'travel')) return;
    const p = P[M.active]; if (p.cpu) return;
    if (pc === p.target.pc) { A.colorNote('nt' + M.active, cssVar('--yellow-ink')); strike(M.active, (t - M.noteAt) / 1000); }
    else setStatus(M.active, `That's ${p.seq.name(pc)}. Look again!`, 'bad');   // nothing happens to the puck; time keeps running
  });

  /* a strike: power from the reaction time; the shot never gives the receiver less than their minimum window */
  function strike(i, reaction, auto) {
    const p = P[i], q = P[1 - i], pw = auto ? RULES.power[RULES.power.length - 1] : RULES.power.find(x => reaction < x.under);
    const wasServe = M.state === 'serve';
    if (!wasServe) M.base *= RULES.rallySpeedUp;                          // each return speeds the rally up
    const T = Math.max(M.base * pw.factor, q.window + RULES.suppressMs / 1000);
    p.lastPc = p.target.pc; p.returns += wasServe ? 0 : 1; if (pw.label === 'SMASH!') p.smashes++;
    if (!auto && (p.best === null || reaction < p.best)) p.best = reaction;
    M.rally++;
    sound(pw.sound);
    const from = {u: M.puck.u, v: M.puck.v}, goalU = i === 0 ? 1 : 0;
    M.puck = {u: from.u, v: from.v, path: makePath(from, goalU), t0: now(), T: T * 1000, seg: 0, power: pw.label};
    M.state = 'travel'; M.noteAt = 0;
    M.fx.push({u: from.u, v: from.v, t0: now(), label: pw.label, color: p.color, big: pw.label === 'SMASH!' || pw.label === 'POWER'});
    if (pw.label === 'SMASH!' && !reduced.matches) M.shake = now() + 260;
    setStatus(i, `${pw.label}${auto ? '' : ' ' + reaction.toFixed(2) + ' s'}`, 'power ' + pw.label.replace('!', '').toLowerCase());
    beginTurn(1 - i, false);
  }
  /* the puck's path to the goal: straight or off one or two side rails (travel time is what matters, not the path) */
  function makePath(from, goalU) {
    const n = Math.floor(Math.random() * 3), pts = [from], end = {u: goalU, v: (Math.random() - .5) * .5};
    for (let k = 1; k <= n; k++) pts.push({u: from.u + (goalU - from.u) * k / (n + 1), v: (k % 2 ? 1 : -1) * (from.v >= 0 ? -1 : 1) * .92, bounce: true});
    pts.push(end);
    const len = [0];
    for (let k = 1; k < pts.length; k++) len.push(len[k - 1] + Math.hypot((pts[k].u - pts[k - 1].u) * 2, pts[k].v - pts[k - 1].v));
    return {pts, len};
  }
  function puckAt(t) {
    const pk = M.puck, path = pk.path;
    if (!path) return {u: pk.u, v: pk.v, seg: 0, done: false};
    const f = Math.min(1, (t - pk.t0) / pk.T), d = f * path.len[path.len.length - 1];
    let k = 1; while (k < path.len.length - 1 && path.len[k] < d) k++;
    const a = path.pts[k - 1], b = path.pts[k], s = (d - path.len[k - 1]) / ((path.len[k] - path.len[k - 1]) || 1);
    return {u: a.u + (b.u - a.u) * s, v: a.v + (b.v - a.v) * s, seg: k, done: f >= 1};
  }

  /* a goal: the other player scores; a short celebration, then the next serve */
  function goal(conceder) {
    const scorer = 1 - conceder;
    P[scorer].score++; M.state = 'celebrate'; M.active = null; M.noteAt = 0;
    sound('goal'); A.Pitch.suppress(RULES.celebrateMs);
    score();
    P.forEach((q, k) => { $('side' + (k + 1)).classList.remove('active', 'dim'); setStatus(k, k === scorer ? 'GOAL!' : '', k === scorer ? 'goal' : ''); });
    banner(scorer === 0 ? 'p1' : 'p2', `Goal! ${P[scorer].cpu ? P[scorer].name : 'Player ' + (scorer + 1)}`);
    if (P[scorer].score >= M.points) { later(() => finish(scorer), RULES.celebrateMs); return; }
    const next = RULES.serve === 'alternate' ? 1 - M.server : conceder;
    later(() => { banner(); startPoint(next); }, RULES.celebrateMs);
  }
  function score() {
    P.forEach((p, i) => { $('side' + (i + 1)).querySelector('.s-score').textContent = p.score; });
    $('scoreLine').textContent = `${P[0].score} – ${P[1].score}`;
  }
  function setStatus(i, text, cls) { const s = $('side' + (i + 1)).querySelector('.s-status'); s.textContent = text; s.className = 's-status ' + (cls || ''); }
  function banner(cls, text) { const b = $('banner'); b.hidden = !text; b.textContent = text || ''; b.className = 'banner ' + (cls || ''); }

  /* ---------- results ---------- */
  function finish(winner) {
    M.state = 'over'; stopMatch();
    sound('match-win');
    const w = P[winner], l = P[1 - winner];
    $('resTitle').textContent = `${w.cpu ? w.name : 'Player ' + (winner + 1)} wins!`;
    $('resTitle').className = winner === 0 ? 'c1' : 'c2';
    $('resScore').innerHTML = `<span class="c1">${P[0].name} ${P[0].score}</span> – <span class="c2">${P[1].score} ${P[1].name}</span>`;
    $('resStats').innerHTML = P.map((p, i) => `<div class="p${i + 1}"><span class="res-pic">${portrait(p, 'tile')}</span><small>${p.name}</small><span><b>${p.returns}</b> returns · <b>${p.smashes}</b> smashes` +
      (p.best != null ? ` · fastest <b>${p.best.toFixed(2)} s</b>` : '') + `</span></div>`).join('');
    $('resStars').hidden = !vsCPU; $('resNext').hidden = true; $('resBest').textContent = '';
    if (vsCPU) {
      const lv = P[1].rival, won = winner === 0, margin = P[0].score - P[1].score;
      const stars = !won ? 0 : P[1].score === 0 ? 3 : margin >= 4 ? 2 : 1;
      const pts = P[0].score * 100 + P[0].returns * 10 + P[0].smashes * 25;
      const old = A.store.level(GAME_ID, P[0].member.id, lv);
      A.store.setLevel(GAME_ID, P[0].member.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(pts, old.best)});
      $('resStars').innerHTML = A.starStr(stars);
      $('resMsg').textContent = !won ? `${P[1].name} took this one. Play your notes a little sooner and try again!`
        : stars === 3 ? 'A shutout! Perfect defense.' : stars === 2 ? 'Won by 4 or more. Keep them scoreless for 3 stars.' : 'You won! Win by 4 or more for 2 stars.';
      $('resBest').textContent = pts > old.best && old.best ? 'New best score!' : `Score ${pts}`;
      $('resNext').hidden = !(won || A.DEMO) || lv >= RIVALS.length;
      sound(won ? 'level-complete' : 'level-failed');
      if (stars > old.stars) later(() => sound('star-earned'), 520);
      if (pts > old.best && old.best) later(() => sound('new-high-score'), 900);
    } else {
      const rec = saved.h2h[pairKey()] || (saved.h2h[pairKey()] = {p1: 0, p2: 0});
      rec[winner === 0 ? 'p1' : 'p2']++; remember();
      $('resMsg').innerHTML = `Head to head: <b class="c1">${P[0].name} ${rec.p1}</b> – <b class="c2">${rec.p2} ${P[1].name}</b>`;
    }
    $('results').hidden = false; $('resAgain').focus();
    if (vsCPU) A.Skins.announce($('results').querySelector('.panel'));     // Player 1's skins (two-player matches earn no stars)
  }
  $('resAgain').addEventListener('click', () => A.requireMic(startMatch));
  $('resNext').addEventListener('click', () => { setRival(P[1].rival + 1); showSetup(); });
  $('resSetup').addEventListener('click', showSetup);
  $('quitMatch').addEventListener('click', showSetup);

  /* ---------- ?demo: hold Space = the active player's note, hold W = a wrong note ---------- */
  if (A.DEMO) {
    addEventListener('keydown', e => {
      if (!M || M.over || M.active === null || P[M.active].cpu || e.repeat) return;
      const t = P[M.active].target;
      if (e.key === ' ') { e.preventDefault(); A.Pitch.demoNote = t.sounding; }
      else if (e.key === 'w' || e.key === 'W') A.Pitch.demoNote = t.sounding + 2;
    });
    addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'w' || e.key === 'W') A.Pitch.demoNote = null; });
  }

  /* ---------- the table: canvas, requestAnimationFrame, cheap glow ---------- */
  const cv = $('table'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, land = true, geo = null;
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const COL = {};
  function colors() {
    ['--floor', '--floor-2', '--floor-3', '--deep', '--cyan', '--cyan-hi', '--pink', '--pink-hi', '--yellow', '--white-hi', '--text-lo'].forEach(n => { COL[n] = cssVar(n); });
    P.forEach(p => { COL[p.color] = cssVar('--' + p.color); COL[p.color + '-hi'] = cssVar('--' + p.color + '-hi') || COL[p.color]; });
  }
  function resize() {
    const box = cv.parentElement.getBoundingClientRect();
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    W = Math.max(100, box.width); H = Math.max(100, box.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    land = innerWidth >= innerHeight;                                  // the device's orientation decides the table's direction
    const ASPECT = 1.7, pad = Math.min(W, H) * .05;                     // a real table is about 1.7 times longer than wide
    let len = (land ? W : H) - 2 * pad, wid = (land ? H : W) - 2 * pad;
    if (len / wid > ASPECT) len = wid * ASPECT; else wid = len / ASPECT;
    const lw = land ? len : wid, lh = land ? wid : len;
    geo = {x0: (W - lw) / 2, x1: (W + lw) / 2, y0: (H - lh) / 2, y1: (H + lh) / 2};
    colors();
  }
  addEventListener('resize', () => { if (!$('match').hidden) resize(); });
  /* table space: u 0 (Player 1's goal) → 1 (Player 2's goal), v −1 → 1 across. Landscape: P1 left; portrait: P1 bottom */
  function xy(u, v) {
    const g = geo;
    return land ? [g.x0 + u * (g.x1 - g.x0), (g.y0 + g.y1) / 2 + v * (g.y1 - g.y0) / 2 * .9]
                : [(g.x0 + g.x1) / 2 + v * (g.x1 - g.x0) / 2 * .9, g.y1 - u * (g.y1 - g.y0)];
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (document.hidden || !M) return;
    const t = now(), dt = t - (M.lastT || t); M.lastT = t;
    // a sound while a player's note is up: the puck and their reaction clock wait (the detector is deaf meanwhile)
    if (M.state === 'travel' && M.noteAt && !P[M.active].cpu && A.Pitch.isSuppressed(t)) { M.puck.t0 += dt; M.noteAt += dt; }
    if (M.state === 'travel') {
      const pos = puckAt(t);
      if (pos.seg !== M.puck.seg) { if (M.puck.seg && M.puck.path.pts[M.puck.seg].bounce && (t < A.Pitch.suppressedUntil || P[M.active].cpu)) sound('rail-bounce'); M.puck.seg = pos.seg; }
      M.puck.u = pos.u; M.puck.v = pos.v;
      if (pos.done && !M.over) goal(M.active);
    }
    draw(t);
  }
  function draw(t) {
    const c = ctx, g = geo, L = Math.min(g.x1 - g.x0, g.y1 - g.y0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    if (M.shake > t) c.translate((Math.random() - .5) * 8, (Math.random() - .5) * 8);
    // the table
    c.fillStyle = COL['--floor-2']; roundRect(c, g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, L * .08); c.fill();
    c.lineWidth = 4; c.shadowBlur = 14;
    [[0, COL[P[0].color]], [1, COL[P[1].color]]].forEach(([k, col]) => {        // each half's rail in its player's neon
      c.save(); c.beginPath();
      if (land) c.rect(k ? (g.x0 + g.x1) / 2 : 0, 0, W / 2 + 1, H); else c.rect(0, k ? 0 : (g.y0 + g.y1) / 2, W, H / 2 + 1);
      c.clip(); c.strokeStyle = col; c.shadowColor = col; roundRect(c, g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0, L * .08); c.stroke(); c.restore();
    });
    c.shadowBlur = 0; c.strokeStyle = COL['--text-lo']; c.globalAlpha = .35; c.lineWidth = 2;
    const [cx, cy] = xy(.5, 0), r = L * .16;
    c.beginPath(); if (land) { c.moveTo(cx, g.y0); c.lineTo(cx, g.y1); } else { c.moveTo(g.x0, cy); c.lineTo(g.x1, cy); } c.stroke();
    c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); c.globalAlpha = 1;
    // goal slots
    [0, 1].forEach(k => {
      const col = COL[P[k].color], [a0, b0] = xy(k, -.35), [a1, b1] = xy(k, .35);
      c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 16; c.lineWidth = 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(a0, b0); c.lineTo(a1, b1); c.stroke();
    });
    c.shadowBlur = 0;
    // mallets: each player's sits in front of their goal, sliding to meet the puck
    const pr = L * .045;
    [0, 1].forEach(k => {
      const mu = k === 0 ? .06 : .94, mv = M.active === k ? Math.max(-.8, Math.min(.8, M.puck.v)) : 0;
      const [mx, my] = xy(mu, mv), col = COL[P[k].color];
      c.fillStyle = COL['--deep']; c.strokeStyle = col; c.lineWidth = 4; c.shadowColor = col; c.shadowBlur = M.active === k ? 18 : 6;
      c.beginPath(); c.arc(mx, my, pr * 1.35, 0, 7); c.fill(); c.stroke();
      c.beginPath(); c.arc(mx, my, pr * .55, 0, 7); c.fillStyle = col; c.fill();
    });
    c.shadowBlur = 0;
    // the trail and the puck (a gentle pulse; power shots glow bigger)
    const [px, py] = xy(M.puck.u, M.puck.v), hot = M.state === 'travel' && (M.puck.power === 'SMASH!' || M.puck.power === 'POWER');
    if (!reduced.matches) {
      M.trail.push([px, py]); if (M.trail.length > (hot ? 18 : 10)) M.trail.shift();
      M.trail.forEach(([x, y], k) => { c.globalAlpha = (k + 1) / M.trail.length * (hot ? .45 : .25); c.fillStyle = COL['--yellow']; c.beginPath(); c.arc(x, y, pr * (.4 + .6 * k / M.trail.length), 0, 7); c.fill(); });
      c.globalAlpha = 1;
    }
    const pulse = reduced.matches ? 1 : 1 + Math.sin(t / 180) * .06, pg = c.createRadialGradient(px, py, 0, px, py, pr * (hot ? 3.2 : 2.2) * pulse);
    pg.addColorStop(0, COL['--white-hi']); pg.addColorStop(.35, COL['--yellow']); pg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr * (hot ? 3.2 : 2.2) * pulse, 0, 7); c.fill();
    c.fillStyle = COL['--white-hi']; c.beginPath(); c.arc(px, py, pr * .8, 0, 7); c.fill();
    // hit bursts with the power label
    M.fx = M.fx.filter(f => t - f.t0 < 800);
    M.fx.forEach(f => {
      const a = (t - f.t0) / 800, [fx, fy] = xy(f.u, f.v), col = COL[f.color];
      c.globalAlpha = 1 - a; c.strokeStyle = col; c.lineWidth = f.big ? 5 : 3;
      c.beginPath(); c.arc(fx, fy, pr * (1.5 + a * (f.big ? 6 : 3.5)), 0, 7); c.stroke();
      c.fillStyle = col; c.font = `${Math.round(L * (f.big ? .09 : .065))}px "GN Display", sans-serif`; c.textAlign = 'center';
      c.fillText(f.label, fx, fy - pr * 2.6 - a * 20);
      c.globalAlpha = 1;
    });
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  A.FaceOff = {P, get M() { return M; }};                                // for tests
  showSetup();
})(window.Arcade);
