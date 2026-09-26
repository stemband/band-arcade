/* Chime Heist: a mallet keyboard trainer. A note of the vault code appears on the terminal; strike its bar
   on the bell kit (the chime lock). No microphone (no pitch.js / mic-gate.js).
   Always the Orchestral Bells / Bell Kit member (written G3–C6, sounding two octaves higher); the saved
   instrument for other games is never touched. Modes: FIRST FIVE, FULL RANGE, SCALES (Concert B♭ E♭ F A♭),
   CHROMATIC. Correct = the exact bar, octave included; in scales the key signature applies (B in F major
   = the B♭ bar). Vaults (levels) live in levels.js; bell tones and effects come from shared/sfx.js. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAME_ID = 'chime-heist';
  const VAULTS = window.HEIST_VAULTS, RULES = window.HEIST_RULES;
  const {noteLabel, writtenMidi, spell, mod12} = A.music;
  const GOLD = '#c98a12', MISS = '#d0503f';          // same found / missed colors as the other games
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const inst = A.getInstrument('bells');                // the bell kit, whatever instrument is saved
  const member = A.getMember(inst, 'bells');
  const SOUNDS = -member.sounds;                        // bells sound 24 semitones (two octaves) above written
  A.mountTopbar(inst, '<span class="sound-ctl" id="sndCtl"></span>', GAME_ID, {fixed: 'Bell Kit', portrait: 'bells'});
  A.Sfx.mountControls($('sndCtl'), {ambience: false});
  A.Sfx.allowAmbience(false);
  $('demoHelp').hidden = !A.DEMO;
  const sfx = name => A.Sfx.event(name);

  const KEYS = {random: GAME_ID, full: GAME_ID + ':full', chrom: GAME_ID + ':chromatic'};
  const picker = A.Modes.mount($('modePick'), {
    gameId: GAME_ID, inst, member, levels: VAULTS.length, onChange: () => showHub(),
    modes: [{id: 'random', label: 'First five'}, {id: 'full', label: 'Full range'}, {id: 'scales', label: 'Scales'}, {id: 'chrom', label: 'Chromatic'}],
    scales: ['Bb', 'Eb', 'F', 'Ab'], fixed: {chrom: 'chrom'},
    keyFor: (mode, sc) => mode === 'scales' ? A.Scales.progressKey(GAME_ID, sc) : KEYS[mode],
  });

  /* ---------- treasures: one for each vault ---------- */
  const TREASURES = {
    lemon:    '<ellipse class="tr-yellow" cx="50" cy="54" rx="30" ry="22"/><path class="tr-yellow" d="M20 54l-8-4 8-4zM80 54l8-4-8 4z"/><path class="tr-green" d="M50 32q10-16 24-10-8 14-24 10z"/>',
    plush:    '<circle class="tr-brown" cx="30" cy="30" r="11"/><circle class="tr-brown" cx="70" cy="30" r="11"/><circle class="tr-brown" cx="50" cy="52" r="28"/><circle class="tr-ink" cx="40" cy="48" r="4"/><circle class="tr-ink" cx="60" cy="48" r="4"/><ellipse class="tr-paper" cx="50" cy="62" rx="10" ry="7"/><circle class="tr-ink" cx="50" cy="60" r="3"/>',
    robot:    '<line class="tr-line" x1="50" y1="12" x2="50" y2="24"/><circle class="tr-pink" cx="50" cy="10" r="5"/><rect class="tr-cyan" x="22" y="24" width="56" height="44" rx="10"/><rect class="tr-ink" x="34" y="38" width="10" height="10" rx="2"/><rect class="tr-ink" x="56" y="38" width="10" height="10" rx="2"/><rect class="tr-yellow" x="36" y="56" width="28" height="5" rx="2"/>',
    watch:    '<path class="tr-line" d="M50 22q-22-18-40 0"/><circle class="tr-yellow" cx="50" cy="56" r="30"/><circle class="tr-paper" cx="50" cy="56" r="23"/><path class="tr-line" d="M50 56V40M50 56l10 6"/>',
    painting: '<rect class="tr-yellow" x="14" y="20" width="72" height="58" rx="3"/><rect class="tr-paper" x="22" y="28" width="56" height="42"/><circle class="tr-pink" cx="38" cy="44" r="8"/><path class="tr-cyan" d="M22 70l18-16 14 10 10-8 14 14z"/>',
    diamond:  '<path class="tr-cyan" d="M24 36L36 20H64L76 36L50 80Z"/><path class="tr-line" d="M24 36H76M36 20L44 36L50 80L56 36L64 20"/>',
    coins:    [0, 1, 2, 3].map(i => `<ellipse class="tr-yellow" cx="50" cy="${72 - i * 12}" rx="28" ry="9"/><ellipse class="tr-gold-ink" cx="50" cy="${72 - i * 12}" rx="20" ry="5"/>`).join(''),
    crown:    '<path class="tr-yellow" d="M16 72L20 30L36 50L50 22L64 50L80 30L84 72Z"/><rect class="tr-yellow" x="16" y="72" width="68" height="10" rx="2"/><circle class="tr-pink" cx="50" cy="60" r="6"/><circle class="tr-cyan" cx="32" cy="64" r="4"/><circle class="tr-cyan" cx="68" cy="64" r="4"/>',
  };
  const treasureSVG = (id, cls = '') => `<svg class="tr ${cls}" viewBox="0 0 100 90" aria-hidden="true">${TREASURES[id] || TREASURES.coins}</svg>`;

  /* ---------- vault select ---------- */
  function hubCard(st) {
    if (st.mode !== 'full') return A.Modes.hubCard(inst, st);
    const lo = member.low, hi = member.high;
    return {cap: `Full range: ${noteLabel(lo)}${lo.oct} up to ${noteLabel(hi)}${hi.oct}`, sub: 'Random bars from the whole kit',
      html: A.staffSVG('treble', [{n: lo, x: 150, caption: 'Lowest ' + noteLabel(lo)}, {n: hi, x: 290, caption: 'Highest ' + noteLabel(hi)}], {label: 'The whole bell kit'})};
  }
  function showHub() {
    stopTimer(); G = null;
    const st = picker.state, key = st.progressKey;
    $('play').hidden = true; $('hub').hidden = false; $('results').hidden = true; $('vaultOpen').hidden = true;
    $('wrap').classList.remove('playing'); lasers(0);
    const card = hubCard(st);
    $('hubCap').textContent = card.cap; $('hubConcert').textContent = card.sub; $('hubStaff').innerHTML = card.html;
    const modeName = {random: 'First five', full: 'Full range', chrom: 'Chromatic'}[st.mode] || (st.scale ? st.scale.name : '');
    $('levelsTitle').textContent = `Vaults: ${modeName}`;
    const scaleLen = st.scale ? st.scale.notes.length : 0;
    $('levelGrid').innerHTML = VAULTS.map((V, i) => {
      const lv = i + 1, p = A.store.level(key, inst.id, lv);
      const unlocked = A.DEMO || lv === 1 || A.store.level(key, inst.id, lv - 1).stars > 0;
      const count = st.scale ? A.Scales.sequence(st.scale, V.count).length : V.count;
      const bits = [st.scale ? (count > scaleLen ? 'The scale up and down, then again.' : 'The scale up and down.') : `${count} notes.`,
        V.onScreen > 1 ? `Read ahead: ${V.onScreen} at once.` : '', {all: 'Every bar labeled.', faded: 'Faint labels.', c: 'Only the C bars labeled.', none: 'No labels.'}[V.labels],
        `${V.time} s each. Alarm: ${V.alarm}.`];
      return `<button class="lvl vault" data-l="${lv}" ${unlocked ? '' : 'disabled'}>
        <span class="n">Vault ${lv}</span>
        <span class="mini">${unlocked ? treasureSVG(V.treasure) : '<svg class="tr" viewBox="0 0 100 90" aria-hidden="true"><circle class="tr-steel" cx="50" cy="45" r="34"/><circle class="tr-line" cx="50" cy="45" r="12"/></svg>'}</span>
        <span class="t">${V.name}</span>
        <span class="d">${bits.filter(Boolean).join(' ')}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${unlocked ? (p.best ? 'Best ' + p.best : count + ' notes') : 'Locked'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => startLevel(+b.dataset.l)));
    window.scrollTo(0, 0);
  }

  /* ---------- the bell kit: G3–C6, naturals below, sharps/flats raised above in groups of 2 and 3 ---------- */
  const LOW = member.lowMidi, HIGH = member.highMidi;                  // written 55..84
  const NAT = [], ACC = [];                                           // bars in pitch order
  for (let m = LOW; m <= HIGH; m++) (spell(m, false).acc ? ACC : NAT).push(m);
  const natIndex = m => NAT.indexOf(m);
  const posOf = m => natIndex(m) >= 0 ? natIndex(m) : natIndex(m - 1) + .5;   // x position in natural-bar widths
  const bars = {};                                                    // written midi -> button
  (function buildKit() {
    const kit = $('kit'), n = NAT.length;
    kit.style.setProperty('--n', n);
    let h = '<div class="rail rail-acc"></div><div class="rail rail-nat"></div>';
    for (let m = LOW; m <= HIGH; m++) {
      const sharp = spell(m, false), flat = spell(m, true), acc = !!sharp.acc, pos = posOf(m);
      const len = 1 - .3 * pos / (n - 1);                            // bars get shorter as the pitch rises
      const name = acc ? `${noteLabel(sharp)} or ${noteLabel(flat)}` : noteLabel(sharp);
      const lbl = acc ? `<span class="lbl"><span>${noteLabel(sharp)}</span><span>${noteLabel(flat)}</span></span>` : `<span class="lbl${sharp.letter === 'C' ? ' c' : ''}">${sharp.letter}</span>`;
      h += `<button type="button" class="bar ${acc ? 'acc' : 'nat'}" data-midi="${m}" tabindex="-1" style="--x:${acc ? pos + .07 : pos + .03};--len:${len.toFixed(3)}" aria-label="${name}, octave ${sharp.oct}">${lbl}</button>`;
    }
    kit.innerHTML = h + '<div class="mallet" id="mallet" aria-hidden="true"><i></i></div><div class="cursor" id="cursor" aria-hidden="true"></div>';
    kit.querySelectorAll('.bar').forEach(b => { bars[+b.dataset.midi] = b; });
  })();

  // pointerdown answers instantly (tap, click or pen); each finger is its own pointer, so two at once both ring
  $('kit').addEventListener('pointerdown', e => {
    const b = e.target.closest('.bar'); if (!b) return;
    e.preventDefault();
    strike(+b.dataset.midi);
  });
  $('kit').addEventListener('contextmenu', e => e.preventDefault());

  /* keyboard: ← → move along the row, ↑ ↓ switch rows, Enter / Space strike */
  let cur = {row: 'nat', i: NAT.indexOf(writtenMidi(inst.notes[0])) >= 0 ? NAT.indexOf(writtenMidi(inst.notes[0])) : 0};
  const curMidi = () => (cur.row === 'nat' ? NAT : ACC)[cur.i];
  function showCursor() {
    const b = bars[curMidi()], c = $('cursor');
    c.style.left = b.offsetLeft + 'px'; c.style.top = b.offsetTop + 'px';
    c.style.width = b.offsetWidth + 'px'; c.style.height = b.offsetHeight + 'px';
    c.classList.add('on');
  }
  addEventListener('keydown', e => {
    if (!G || $('play').hidden || !$('results').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      const list = cur.row === 'nat' ? NAT : ACC;
      cur.i = Math.max(0, Math.min(list.length - 1, cur.i + (k === 'ArrowLeft' ? -1 : 1)));
    } else if (k === 'ArrowUp' || k === 'ArrowDown') {
      const want = k === 'ArrowUp' ? 'acc' : 'nat';
      if (want !== cur.row) {                                          // the nearest bar in the other row
        const x = posOf(curMidi()), list = want === 'nat' ? NAT : ACC;
        cur = {row: want, i: list.reduce((best, m, j) => Math.abs(posOf(m) - x) < Math.abs(posOf(list[best]) - x) ? j : best, 0)};
      }
    } else if (k === 'Enter' || k === ' ') {
      if (e.target.closest && e.target.closest('button:not(.bar)')) return;   // Enter on "Leave vault" etc. does its own thing
      strike(curMidi());
    } else return;
    e.preventDefault();
    showCursor();
  });

  function ring(m) {
    A.Sfx.bell(m + SOUNDS);                                            // the bar's real sounding pitch
    const b = bars[m], mal = $('mallet');
    b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring');
    mal.style.left = (b.offsetLeft + b.offsetWidth / 2) + 'px'; mal.style.top = b.offsetTop + 'px';
    mal.classList.remove('hit'); void mal.offsetWidth; mal.classList.add('hit');
  }

  /* ---------- the notes of a vault ---------- */
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function buildSeq(count, pool) {           // every note appears evenly; never the same note twice in a row
    const seq = [];
    while (seq.length < count) {
      const bag = shuffle([...Array(pool).keys()]);
      if (seq.length && bag[0] === seq[seq.length - 1]) [bag[0], bag[1]] = [bag[1], bag[0]];
      seq.push(...bag);
    }
    return seq.slice(0, count);
  }
  const item = (n, show) => ({n, show: show || n, midi: n.midi != null ? n.midi : writtenMidi(n), label: noteLabel(n)});
  function vaultNotes(V) {
    const st = picker.state;
    if (st.scale) return A.Scales.sequence(st.scale, V.count).map(n => item(n, n.show));
    if (st.mode === 'full') {                                          // any bar; black bars spelled either way
      const out = [];
      while (out.length < V.count) {
        const m = LOW + Math.floor(Math.random() * (HIGH - LOW + 1));
        if (out.length && out[out.length - 1].midi === m) continue;
        out.push(item(spell(m, Math.random() < .5)));
      }
      return out;
    }
    return buildSeq(V.count, V.pool).map(i => item(inst.notes[i]));
  }

  /* ---------- play ---------- */
  let G = null, timerId = 0;
  function startLevel(lv) {
    const V = VAULTS[lv - 1], st = picker.state, items = vaultNotes(V);
    G = {lv, V, items, count: items.length, key: st.progressKey, sig: st.scale ? st.scale.sig : null,
         fit: st.scale ? st.scale.notes.map(n => n.show) : st.mode === 'full' ? [member.low, member.high] : inst.notes,
         i: 0, gStart: 0, score: 0, hits: 0, wrong: 0, missed: 0, alarm: 0, streak: 0, bestStreak: 0, locked: true, over: false};
    $('results').hidden = true; $('hub').hidden = true; $('play').hidden = false; $('vaultOpen').hidden = true;
    $('wrap').classList.add('playing');
    $('hudNum').textContent = lv; $('hudVault').textContent = V.name;
    $('kit').dataset.labels = V.labels;
    $('codeLights').innerHTML = G.count <= 20 ? G.items.map(() => '<i></i>').join('') : '<b><i id="codeFill"></i></b>';
    $('codeLights').classList.toggle('bar-mode', G.count > 20);
    lasers(0); hud();
    window.scrollTo(0, 0);
    sfx('level-start');
    drawGroup();
    showCursor(); $('cursor').classList.remove('on');                  // the cursor shows once the arrow keys are used
  }

  /* the current notes (1–4) of the code on the terminal; played notes stay put and turn gold */
  let W = 400;
  function drawGroup() {
    const n = G.V.onScreen, grp = G.items.slice(G.gStart, G.gStart + n), sigW = A.keySigWidth(G.sig);
    W = [0, 300, 340, 390, 430][n] + sigW;
    const start = 84 + sigW, end = W - 30;
    G.xs = grp.map((_, k) => n === 1 ? (start + end) / 2 : start + (end - start) * (k + .5) / n);
    $('playStaff').innerHTML = A.staffSVG('treble', grp.map((it, k) => ({n: it.show, x: G.xs[k], id: 'hc' + k})),
      {fit: G.fit, keySig: G.sig, width: W, captions: true, label: n > 1 ? `${grp.length} notes of the code, left to right` : 'The next note of the code'});
    G.locked = false;
    nextNote();
  }
  const current = () => G.items[G.i];
  function nextNote() {
    $('hudCount').textContent = `${G.i + 1} / ${G.count}`;
    placePointer();
    document.querySelectorAll('.bar.hint').forEach(b => b.classList.remove('hint'));
    if (A.DEMO) { bars[current().midi].classList.add('hint'); $('demoAns').hidden = false; $('demoAns').textContent = `Answer: ${current().label}${current().n.oct}`; }
    setPrompt(G.V.onScreen > 1 ? 'Play the code left to right' : 'Strike the bar for the note on the terminal', '');
    G.noteStart = performance.now();
    startTimer();
  }
  function placePointer() {
    const k = G.i - G.gStart, svg = $('playStaff').querySelector('svg'), ptr = $('ptr');
    ptr.hidden = G.V.onScreen < 2 || !svg;
    if (ptr.hidden) return;
    const r = svg.getBoundingClientRect(), box = $('termScreen').getBoundingClientRect();
    ptr.style.left = (r.left - box.left + G.xs[k] / W * r.width) + 'px';
  }
  addEventListener('resize', () => { if (G && !$('play').hidden) { placePointer(); if ($('cursor').classList.contains('on')) showCursor(); } });
  function reveal(k, color) {                          // color a note and write its name under it
    A.colorNote('hc' + k, color);
    const g = document.getElementById('hc' + k), svg = $('playStaff').querySelector('svg');
    if (!g || !svg) return;
    const vb = svg.viewBox.baseVal;
    g.insertAdjacentHTML('beforeend', `<text class="ncap" x="${G.xs[k]}" y="${vb.y + vb.height - 10}" text-anchor="middle" font-family='"GN Text",system-ui,sans-serif' font-weight="700" font-size="17" fill="${color}">${G.items[G.gStart + k].label}</text>`);
  }

  /* ---------- timer (paused while the tab is hidden) ---------- */
  function startTimer() {
    stopTimer();
    const bar = $('timer').firstElementChild;
    bar.style.transform = 'scaleX(1)'; $('timer').classList.remove('low');
    let last = performance.now();
    timerId = setInterval(() => {
      const now = performance.now();
      if (document.hidden) { G.noteStart += now - last; last = now; return; }
      last = now;
      if (!G || G.locked) return;
      const frac = 1 - (now - G.noteStart) / (G.V.time * 1000);
      bar.style.transform = `scaleX(${Math.max(0, frac)})`;
      $('timer').classList.toggle('low', frac < .3);
      if (frac <= 0) timeout();
    }, 100);
  }
  function stopTimer() { clearInterval(timerId); timerId = 0; }

  /* ---------- a strike ---------- */
  function strike(m) {
    ring(m);                                                          // every bar rings, right or wrong
    if (!G || G.locked || G.over) return;
    const it = current();
    if (m === it.midi) return correct();
    const sameLetter = mod12(m - it.midi) === 0;
    mistake(sameLetter ? 'Right note, wrong octave!' : `BZZT! That's ${barName(m)}. Look again.`);
  }
  const barName = m => { const s = spell(m, false), f = spell(m, true); return s.acc ? `${noteLabel(s)}/${noteLabel(f)}` : noteLabel(s); };

  function correct() {
    const k = G.i - G.gStart;
    const frac = Math.max(0, 1 - (performance.now() - G.noteStart) / (G.V.time * 1000));
    const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor(G.streak / RULES.streakStep));
    const pts = Math.round((RULES.base + frac * RULES.speedBonus) * mult);
    G.score += pts; G.hits++; G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
    reveal(k, GOLD);
    codeLight(G.i, 'ok');
    sfx('tumbler-click');
    lasers(G.hits / G.count);
    setPrompt(`Click! ${current().label}. +${pts}`, 'good');
    advance(0);
  }
  function mistake(text) {
    G.wrong++; G.streak = 0;
    setPrompt(text, 'bad');
    const bz = $('bzzt'); bz.textContent = text.startsWith('Right note') ? 'WRONG OCTAVE' : 'BZZT!';
    restart(bz, 'go'); restart($('alarmFlash'), 'go');
    alarmUp();                                         // last: a full meter replaces the message with CAUGHT!
  }
  function timeout() {
    const it = current(), k = G.i - G.gStart;
    G.missed++; G.streak = 0; G.locked = true;
    reveal(k, MISS); codeLight(G.i, 'miss');
    bars[it.midi].classList.add('show-me'); setTimeout(() => bars[it.midi].classList.remove('show-me'), RULES.afterMissMs);
    if (!reduced.matches) restart($('flashlight'), 'sweep');
    setPrompt(`A guard's flashlight! That note was ${it.label}.`, 'bad');
    alarmUp();
    if (!G.over) advance(RULES.afterMissMs);
  }
  function alarmUp() {
    G.alarm++;
    sfx('alarm-buzz');
    hud();
    if (G.alarm >= G.V.alarm) caught();
  }
  function caught() {
    G.over = true; G.locked = true; stopTimer();
    sfx('caught');
    setPrompt('CAUGHT! The alarm went off.', 'bad');
    document.body.classList.add('caught');
    setTimeout(() => { document.body.classList.remove('caught'); finishLevel(true); }, 1400);
  }
  /* on to the next note; a new group of notes after the last one on the terminal */
  function advance(delay) {
    stopTimer();
    G.i++;
    hud();
    if (G.i >= G.count) { G.locked = true; G.over = true; setTimeout(() => finishLevel(false), Math.max(delay, 500)); return; }
    if (G.i - G.gStart >= G.V.onScreen) {
      G.locked = true; G.gStart = G.i;
      setTimeout(() => { if (G && !G.over && !$('play').hidden) drawGroup(); }, Math.max(delay, RULES.afterGroupMs));
    } else if (delay) {
      setTimeout(() => { if (G && !G.over && !$('play').hidden) { G.locked = false; nextNote(); } }, delay);
    } else nextNote();
  }

  /* ---------- the room ---------- */
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function lasers(progress) {                          // the laser grid switches off beam by beam as the code is cracked
    const box = $('lasers');
    if (!box.children.length) box.innerHTML = Array.from({length: 7}, (_, i) => `<i style="--k:${i}"></i>`).join('');
    const off = Math.round(progress * box.children.length);
    [...box.children].forEach((b, i) => b.classList.toggle('off', i < off));
  }
  function codeLight(i, cls) {
    if (G.count <= 20) { const l = $('codeLights').children[i]; if (l) l.className = cls; }
    else { const f = $('codeFill'); if (f) f.style.width = ((G.hits + G.missed) / G.count * 100) + '%'; }
  }
  function hud() {
    const mult = Math.min(RULES.maxMultiplier, 1 + Math.floor(G.streak / RULES.streakStep));
    $('hudStreak').textContent = G.streak ? `${G.streak} ×${mult}` : '0';
    $('hudStreak').classList.toggle('hot', mult > 1);
    $('hudScore').textContent = G.score;
    const m = $('alarmMeter');
    m.innerHTML = Array.from({length: G.V.alarm}, (_, i) => `<i class="${i < G.alarm ? 'on' : ''}"></i>`).join('');
    m.setAttribute('aria-valuenow', G.alarm); m.setAttribute('aria-valuemax', G.V.alarm); m.setAttribute('aria-valuemin', 0);
    m.setAttribute('aria-valuetext', `${G.alarm} of ${G.V.alarm}`);
  }
  function setPrompt(text, cls) { const p = $('prompt'); p.textContent = text; p.className = 'prompt ' + (cls || ''); }

  /* ---------- results ---------- */
  function finishLevel(wasCaught) {
    stopTimer();
    const {lv, V, hits, wrong, missed, score, count, key, bestStreak} = G;
    const pct = hits / count;
    const stars = wasCaught ? 0 : wrong === 0 && missed === 0 ? 3 : pct >= RULES.twoStarRate ? 2 : pct >= RULES.passRate ? 1 : 0;
    const old = A.store.level(key, inst.id, lv);
    A.store.setLevel(key, inst.id, lv, {stars: Math.max(stars, old.stars), best: Math.max(score, old.best)});
    const unlocked = stars > 0 && old.stars === 0 && lv < VAULTS.length;
    const show = () => {
      $('vaultOpen').hidden = true;
      $('resTreasure').innerHTML = stars ? treasureSVG(V.treasure, 'glow') : '';
      $('resStars').innerHTML = A.starStr(stars);
      $('resTitle').textContent = wasCaught ? 'CAUGHT!' : stars === 3 ? 'Perfect heist!' : stars ? 'Vault cracked!' : 'So close';
      $('resMsg').textContent = wasCaught ? 'The alarm went off. Slow down, read each note, and try again. You can do this!'
        : stars ? (stars === 3 ? 'Every bar right, not a sound out of place.'
          : stars === 2 ? 'Play the whole code with no mistakes for 3 stars.'
          : `Play ${Math.ceil(count * RULES.twoStarRate)} of ${count} notes in time for 2 stars.`) + (unlocked ? ` The ${VAULTS[lv].name} is open to you now!` : '')
        : `Play ${Math.ceil(count * RULES.passRate)} of ${count} notes in time to crack this vault.`;
      $('resHits').textContent = `${hits}/${count}`;
      $('resWrong').textContent = wrong; $('resMissed').textContent = missed; $('resStreak').textContent = bestStreak;
      $('resScore').textContent = score;
      const newBest = score > old.best && old.best > 0;
      $('resBest').textContent = newBest ? 'New best score!' : old.best ? `Best: ${Math.max(score, old.best)}` : '';
      const hasNext = lv < VAULTS.length && (stars > 0 || A.DEMO);
      $('resNext').hidden = !hasNext;
      $('results').hidden = false;
      (hasNext ? $('resNext') : $('resRetry')).focus();
      if (stars) sfx('level-complete'); else if (!wasCaught) sfx('level-failed');
      let t = 520;
      if (stars > old.stars) { setTimeout(() => sfx('star-earned'), t); t += 380; }
      if (newBest) { setTimeout(() => sfx('new-high-score'), t); t += 500; }
      if (unlocked) setTimeout(() => sfx('vault-unlocked'), t);
    };
    if (stars) {                                       // the vault door swings open on the treasure
      $('treasure').innerHTML = treasureSVG(V.treasure, 'glow');
      $('vaultOpen').hidden = false;
      restart($('vaultOpen'), 'open');
      sfx('vault-open');
      setTimeout(show, reduced.matches ? 500 : 1500);
    } else show();
  }

  $('resNext').addEventListener('click', () => startLevel(G.lv + 1));
  $('resRetry').addEventListener('click', () => startLevel(G.lv));
  $('resLevels').addEventListener('click', showHub);
  $('quitPlay').addEventListener('click', showHub);

  showHub();
})(window.Arcade);
