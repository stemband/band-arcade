/* SLIDE QUEST: slide a trombone into tune by ear (docs/games/slide-quest.md). Pedal Point's sibling.
   Each round has a target note. The student blows a virtual trombone (synthesized brass) and moves its slide until the
   note matches the TUNING DRONE (the beating stops), then LOCKS IN and is scored on how close it got, in cents. NO
   MICROPHONE AT ALL (no pitch.js on this page): every sound is the game's own (brass.js), so the score is exact.
     slide.js   THE PHYSICS (Arcade.SQSlide: the slide, the partials, the marks) · brass.js  THE SOUND (Arcade.SQBrass)
     levels.js  THE LEVELS, THE SCORING, the rules of a round
   Progress: setLevel('slide-quest', 'all', level, {stars, best}) (games.js player: 'all': no instrument). */
(function (A) {
  'use strict';
  const {$} = A;
  const GAME_ID = 'slide-quest';
  const LEVELS = window.SQ_LEVELS, SCORING = window.SQ_SCORING, RULES = window.SQ_RULES;
  const SL = A.SQSlide, B = A.SQBrass, SLIDE = SL.SLIDE;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const rnd = n => Math.floor(Math.random() * n);
  const pickOne = a => a[rnd(a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const MINUS = '−';
  const LOW_P = SLIDE.partials[0], HIGH_P = SLIDE.partials[SLIDE.partials.length - 1];

  A.mountTopbar(null, '', GAME_ID, {fixed: 'Trombone'});
  $('demoHelp').hidden = !A.DEMO;

  /* saved: gameData('slide-quest') = {hpTip: the headphones tip was shown, earLesson: "your ears are the tuner" was said} */
  const gd = () => A.store.gameData(GAME_ID);
  const save = patch => { Object.assign(gd(), patch); A.store.saveGameData(GAME_ID); };

  /* ================= THE TROMBONE (an SVG, seen from the side, assembled like the real thing) =================
     Left to right, as a trombone looks from the side with the bell pointing forward (to the right):
       THE BELL SECTION (fixed, brass): the TUNING SLIDE's crook at the far left joins its two tubes. The UPPER tube runs
         forward and flares into the BELL, ABOVE the slide; the LOWER (back) tube runs forward under it to the slide lock.
         Two braces hold them together; a third ties the bell tube to the inner slide's stocking.
       THE SLIDE (below the bell, reaching past it): the MOUTHPIECE points back toward the player from the upper slide
         tube; the INNER SLIDE (fixed, chrome) and the OUTER SLIDE (brass, with its crook, bumper and the grip) that moves
         to the RIGHT: 0–60 cm of travel = `travel` units.
     The marks sit on a ruler under the slide, where the outer slide's front edge (its ferrules) lines up for each
     position, so they never hide behind the moving tubes. */
  const V = {w: 1000, h: 340, top: 230, bot: 268, in0: 250, in1: 600, out0: 274, out1: 612, travel: 340,
    bell: {y: 120, throat: 380, rim: 560, half: 88}, crook: 104, braceA: 170};
  const PXCM = V.travel / SLIDE.travel;
  const R = (V.bot - V.top) / 2;
  const outerPath = `M${V.out0} ${V.top}H${V.out1}A${R} ${R} 0 0 1 ${V.out1} ${V.bot}H${V.out0}`;
  function hornSVG({marks = true, tuning = 'ideal', mini = false} = {}) {
    const B = V.bell, by = B.y, cr = (V.bot - by) / 2, cy = (V.bot + by) / 2;
    let s = `<svg class="sq-horn${mini ? ' sq-mini' : ''}" viewBox="0 0 ${V.w} ${V.h}" ${mini ? 'aria-hidden="true"' : 'role="img" aria-label="A trombone seen from the side: the bell on top pointing forward, the slide underneath reaching out to the right"'}>`;
    if (!mini) s += `<defs><radialGradient id="sqGlow"><stop offset="0" stop-color="var(--sq-glow)" stop-opacity=".85"/><stop offset="1" stop-color="var(--sq-glow)" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse class="sq-bellglow" cx="${B.rim + 40}" cy="${by}" rx="100" ry="${B.half + 8}" fill="url(#sqGlow)"/>`;
    // THE BELL SECTION: the back tube from the slide lock to the tuning slide's crook, round the crook, then forward to the bell
    s += `<path class="sq-tube" d="M${V.in0} ${V.bot}H${V.crook}A${cr} ${cr} 0 0 1 ${V.crook} ${by}H${B.throat + 4}"/>` +
      `<path class="sq-tslide" d="M${V.crook + 18} ${V.bot}H${V.crook + 40}M${V.crook + 18} ${by}H${V.crook + 40}"/>` +       // the tuning slide's ferrules
      `<path class="sq-brace" d="M${V.braceA} ${by + 6}V${V.bot - 6}"/>` +
      `<path class="sq-brace" d="M${V.in0 + 16} ${by + 6}V${V.top - 4}"/>` +
      `<path class="sq-bell" d="M${B.throat} ${by - 7}C${B.throat + 74} ${by - 8} ${B.rim - 40} ${by - 25} ${B.rim} ${by - B.half}L${B.rim} ${by + B.half}C${B.rim - 40} ${by + 25} ${B.throat + 74} ${by + 8} ${B.throat} ${by + 7}Z"/>` +
      `<ellipse class="sq-rim" cx="${B.rim}" cy="${by}" rx="10" ry="${B.half}"/>` +
      `<path class="sq-shine" d="M${B.throat + 24} ${by - 10}C${B.throat + 90} ${by - 14} ${B.rim - 36} ${by - 30} ${B.rim - 12} ${by - B.half + 12}"/>` +
      // THE SLIDE: the mouthpiece (pointing back at the player), the inner slide (fixed) and its stocking brace
      `<path class="sq-shank" d="M${V.in0 - 42} ${V.top}H${V.in0}"/><path class="sq-mp" d="M${V.in0 - 74} ${V.top - 13}Q${V.in0 - 58} ${V.top - 11} ${V.in0 - 46} ${V.top - 4}V${V.top + 4}Q${V.in0 - 58} ${V.top + 11} ${V.in0 - 74} ${V.top + 13}Z"/>` +
      `<path class="sq-inner" d="M${V.in0} ${V.top}H${V.in1}M${V.in0} ${V.bot}H${V.in1}"/>` +
      `<rect class="sq-brace" x="${V.in0 + 2}" y="${V.top}" width="10" height="${V.bot - V.top}" rx="3"/>`;
    // THE MARKS: the 7 positions at their TRUE spots (the gaps grow), on a ruler under the slide
    s += `<g class="sq-marks"${mini ? '' : ' id="marks"'}${marks ? '' : ' hidden'}>`;
    for (let k = 1; k <= SLIDE.positions; k++) {
      const X = (V.out0 + SL.markX(k, tuning) * PXCM).toFixed(1);
      s += `<path class="sq-mark" d="M${X} ${V.bot + 16}V${V.bot + 32}"/><text class="sq-mk" x="${X}" y="${V.bot + 62}" text-anchor="middle">${k}</text>`;
    }
    s += '</g>';
    // THE OUTER SLIDE (moves): the two tubes, the crook, the ferrules, the grip, and a hit area for the finger
    s += `<g class="sq-outer"${mini ? '' : ' id="outer" role="slider" aria-label="The slide: drag it out (lower) or in (higher)" aria-valuemin="0" aria-valuemax="' + SLIDE.travel + '"'}>` +
      `<path class="sq-otube" d="${outerPath}"/>` +
      `<path class="sq-otube-hi" d="M${V.out0 + 4} ${V.top - 4}H${V.out1}M${V.out0 + 4} ${V.bot - 4}H${V.out1}"/>` +
      `<rect class="sq-ferrule" x="${V.out0 - 6}" y="${V.top - 11}" width="16" height="22" rx="3"/><rect class="sq-ferrule" x="${V.out0 - 6}" y="${V.bot - 11}" width="16" height="22" rx="3"/>` +
      `<rect class="sq-grip" x="${V.out0 + 56}" y="${V.top}" width="16" height="${V.bot - V.top}" rx="5"/>` +
      `<circle class="sq-bumper" cx="${V.out1 + R + 2}" cy="${(V.top + V.bot) / 2}" r="6"/>` +
      (mini ? '' : `<rect class="sq-hit" x="${V.out0 - 24}" y="${V.top - 36}" width="${V.out1 + R - V.out0 + 48}" height="${V.bot - V.top + 72}"/>`) +
      `</g>`;
    // the ghost: where the exact spot was (after LOCK IN), drawn over the slide so it shows even when it's close
    if (!mini) s += `<g class="sq-ghost" id="ghost" hidden><path d="${outerPath}"/></g>`;
    return s + '</svg>';
  }
  /* the level cards' little trombone: the bell on top, the slide underneath (the same assembly as the big one) */
  const SLIDE_ICON = `<svg viewBox="0 0 48 24" aria-hidden="true"><path class="si-out" d="M17 17H7A5 5 0 0 1 7 7H19"/><path class="si-bell" d="M18 6C24 6 27 4 29 1V13C27 10 24 8 18 8Z"/><path class="si-in" d="M13 15H36M13 19.5H36"/><path class="si-out" d="M19 15H42A2.25 2.25 0 0 1 42 19.5H19"/></svg>`;

  /* ================= THE LEVEL SELECT ================= */
  const prog = lv => A.store.level(GAME_ID, 'all', lv);
  const unlocked = i => A.DEMO || i === 0 || prog(i).stars > 0;
  function showHub() {
    stopRound(); G = null;
    A.Sfx.gameMenuMusic(GAME_ID);
    pause.setActive(false); A.UI.results.hide(); A.UI.intro.hide();
    $('play').hidden = true; $('hub').hidden = false;
    $('levelGrid').innerHTML = LEVELS.map((L, i) => {
      const lv = i + 1, p = prog(lv), open = unlocked(i);
      return `<button class="lvl" data-l="${lv}" ${open ? '' : 'disabled'}>
        <span class="n">Level ${lv}</span>
        <span class="mini">${SLIDE_ICON}</span>
        <span class="t">${esc(L.name)}</span>
        <span class="d">${esc(L.idea)}</span>
        <span class="foot"><span class="stars">${A.starStr(p.stars)}</span><span>${p.best ? 'Best ' + p.best : L.rounds + ' notes'}</span></span>
      </button>`;
    }).join('');
    $('levelGrid').querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => begin(+b.dataset.l)));
    window.scrollTo(0, 0);
    A.LevelSelect.show({screen: $('hub'), grid: $('levelGrid'), cards: $('levelGrid').querySelectorAll('.lvl'), unlocked,
      label: i => `Level ${i + 1} · ${LEVELS[i].name}`});
  }

  /* THE LEVEL INTRO (shared/ui-kit.js): the level's idea; level 4 (`lesson`) also says once that your ears are the tuner */
  function begin(lv) {
    A.UI.results.hide();
    const L = LEVELS[lv - 1];
    const lesson = !!L.lesson && !gd().earLesson;
    if (lesson) save({earLesson: true});
    A.UI.intro.show({theme: 'sq-intro', kicker: `Level ${lv}`, title: L.name, text: esc(L.say),
      hero: `<div class="sq-intro-horn" aria-hidden="true">${hornSVG({mini: true, marks: false})}</div>`,
      extra: lesson ? '<p class="sq-lesson" id="earLesson"><b>From here on, your ears are the tuner.</b></p>' : '',
      go: {label: 'Let\'s play!', onClick: () => startLevel(lv)},
      back: {label: 'Levels', onClick: () => showHub()}});
  }

  /* ================= THE STAGE ================= */
  function buildStage(L) {
    $('stage').innerHTML = hornSVG({marks: L.marks, tuning: L.tuning});
    $('lips').hidden = !L.lips;
    $('needle').hidden = !L.needle;
    $('droneBtn').hidden = L.ref !== 'drone';
    $('ladder').innerHTML = SLIDE.partials.slice().reverse().map(n => `<i data-n="${n}">${n}</i>`).join('');
    A.holdGuard($('stage'), {lock: true});
    A.holdGuard($('blowBtn'), {lock: true});
    dragSlide($('outer'));
  }
  const freqNow = () => SL.freq(G.partial, G.x, G.L.tuning);
  function draw() {
    if (!G || !$('outer')) return;
    $('outer').setAttribute('transform', `translate(${(G.x * PXCM).toFixed(2)} 0)`);
    $('stage').classList.toggle('sounding', !!G.blowing);
    $('blowBtn').setAttribute('aria-pressed', String(!!G.blowing));
    $('blowBtn').classList.toggle('on', !!G.blowing);
    $('lockBtn').disabled = !(G.r && G.r.blown) || G.phase !== 'tune';
    $('droneBtn').setAttribute('aria-pressed', String(!!G.droneOn));
    $('droneBtn').textContent = G.droneOn ? 'Drone: on' : 'Drone: off';
    $('ladder').querySelectorAll('i').forEach(d => d.classList.toggle('on', +d.dataset.n === G.partial));
    $('lipUp').disabled = G.partial >= HIGH_P; $('lipDown').disabled = G.partial <= LOW_P;
    const o = $('outer'); o.setAttribute('aria-valuenow', G.x.toFixed(1));
    if (G.L.needle) drawNeedle();
  }
  /* THE TUNER NEEDLE (levels 1–2): −50…+50 cents from the TARGET, live while the horn sounds */
  function drawNeedle() {
    const c = G.r ? SL.cents(freqNow(), G.r.f) : 0, v = Math.max(-50, Math.min(50, c));
    const el = $('needle');
    el.classList.toggle('idle', !G.blowing);
    el.querySelector('.sn-needle').setAttribute('transform', `translate(${(G.blowing ? v * 1.8 : 0).toFixed(2)} 0)`);
    el.classList.toggle('near', G.blowing && Math.abs(c) <= SCORING.stars[2]);
  }

  /* THE SLIDE GRIP: drag the outer slide anywhere on it; it moves from where it is (never jumps to the finger) */
  function dragSlide(el) {
    let start = null;
    el.addEventListener('pointerdown', e => {
      if (!canTune()) return;
      e.preventDefault();
      const svg = $('stage').querySelector('svg').getBoundingClientRect();
      start = {cx: e.clientX, x: G.x, k: svg.width / V.w * PXCM, id: e.pointerId};     // screen px per cm
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      el.classList.add('held');
    });
    el.addEventListener('pointermove', e => {
      if (!start || e.pointerId !== start.id || !canTune()) return;
      setSlide(start.x + (e.clientX - start.cx) / start.k);
    });
    const end = e => { if (start && e.pointerId === start.id) { start = null; el.classList.remove('held'); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  }
  function setSlide(x) {
    if (!canTune()) return false;
    G.x = SL.clampX(x);
    if (G.blowing) B.setFreq(freqNow());                    // a sounding horn glides with the slide
    draw();
    return true;
  }
  /** move the slide by `c` cents' worth (+ = higher = IN) */
  const nudge = c => canTune() && setSlide(SL.shiftX(G.x, c));
  /* THE LIPS: the partial (levels with `lips`); a sounding horn slurs to it */
  function lip(n) {
    if (!canTune() || !G.L.lips) return false;
    n = Math.max(LOW_P, Math.min(HIGH_P, n));
    if (n === G.partial) return false;
    G.partial = n;
    if (G.blowing) B.setFreq(freqNow(), {slur: true});
    draw();
    return true;
  }
  const canTune = () => !!G && !G.paused && G.phase === 'tune';

  /* BLOW: a tap toggles (mouse users blow and drag at once); a press HELD (holdMs) stops on release (one thumb on an
     iPad, like the real instrument); Space = hold to blow */
  function blow(on, src = 'api') {
    if (!G) return false;
    if (on) {
      if (!canTune()) return false;
      B.start(freqNow());
      G.blowing = true; G.blowSrc = src;
      G.r.blown = true;                                     // LOCK IN opens once the horn has sounded this round
    } else {
      G.blowing = false; G.blowSrc = null;
      B.stop();
    }
    draw();
    return true;
  }
  (function blowButton() {
    const el = $('blowBtn');
    let press = null, spaceUp = 0;
    el.addEventListener('pointerdown', e => {
      if (!canTune()) return;
      e.preventDefault();
      if (G.blowing) { blow(false); press = null; return; }   // a tap while it sounds: stop
      blow(true, 'press');
      press = {id: e.pointerId, t: performance.now()};
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
    });
    const up = e => {
      if (!press || e.pointerId !== press.id) return;
      const held = performance.now() - press.t > RULES.holdMs;
      press = null;
      if (!G || !G.blowing) return;
      if (held) blow(false); else G.blowSrc = 'toggle';     // a tap: it keeps sounding until the next tap
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    // the keyboard on the focused button (Enter): a toggle. Space is the hold-to-blow key (below), never a click here
    el.addEventListener('click', e => { if (e.detail !== 0 || performance.now() - spaceUp < 250) return; if (G && G.blowing) blow(false); else blow(true, 'toggle'); });
    document.addEventListener('keyup', e => { if (e.key === ' ') spaceUp = performance.now(); }, true);
  })();

  /* ================= PLAYING A LEVEL ================= */
  let G = null;
  function startLevel(lv) {
    stopRound();
    A.LevelSelect.played(lv - 1);
    A.Sfx.gameMenuMusic(GAME_ID, false);                     // the menu music fades out: tuning needs quiet
    const L = LEVELS[lv - 1];
    const plan = L.focus ? shuffle(Array.from({length: L.rounds}, (_, i) => i < L.focus.rounds)) : null;
    G = {lv, L, i: 0, n: L.rounds, results: [], score: 0, used: [], paused: false, phase: 'wait', timers: [], plan,
         x: 0, partial: L.partials[0], blowing: false, droneOn: false};
    A.UI.results.hide(); A.UI.intro.hide();
    $('hub').hidden = true; $('play').hidden = false;
    pause.setActive(true);
    $('hudLevelLabel').textContent = `Level ${lv}`; $('hudLevelName').textContent = L.name; $('hudScore').textContent = '0';
    buildStage(L);
    window.scrollTo(0, 0);
    if (!gd().hpTip) { save({hpTip: true}); A.UI.toast('Headphones help: the trombone\'s low notes are LOW.', {ms: 5000, kind: 'sq-tip'}); }
    nextRound(true);
  }
  function later(ms, fn) { const t = setTimeout(() => { G && (G.timers = G.timers.filter(x => x !== t)); fn(); }, ms); if (G) G.timers.push(t); return t; }
  function stopRound() {
    B.stopAll();
    if (G) { G.timers.forEach(clearTimeout); G.timers = []; G.blowing = false; G.droneOn = false; if (G.both) G.both.cancel(); }
  }

  /* THE ROUND MAKER: a target [note, partial] from the level's pool (never repeated in a level), the slide started at
     least startAway cents from its spot, and (lips) the lips on another partial */
  function poolFor(L, i) {
    const out = [];
    L.partials.forEach(n => { for (let k = 1; k <= SLIDE.positions; k++) {
      const midi = SLIDE.et[n] - (k - 1);
      if (SL.spotFor(midi, n, L.tuning) != null) out.push({midi, n, pos: k});
    } });
    if (!G.plan) return out;
    const f = L.focus.partial;
    return out.filter(t => G.plan[i] ? t.n === f : t.n !== f);
  }
  function makeRound(L) {
    let pool = poolFor(L, G.i);
    const fresh = pool.filter(t => !G.used.includes(t.midi)); pool = fresh.length ? fresh : pool;
    const t = pickOne(pool);
    G.used.push(t.midi);
    const r = {midi: t.midi, n: t.n, pos: t.pos, f: SL.midiFreq(t.midi), spot: SL.spotFor(t.midi, t.n, L.tuning), refPlays: 0, blown: false};
    // the lips: locked to the target's partial, or (lips) a partial that can't play the target at all
    if (L.lips) {
      const ways = SL.waysTo(t.midi, L.tuning).map(w => w[0]);
      const other = SLIDE.partials.filter(n => !ways.includes(n)), inPool = other.filter(n => L.partials.includes(n));
      r.startPartial = pickOne(inPool.length ? inPool : other.length ? other : SLIDE.partials.filter(n => n !== t.n));
    } else r.startPartial = t.n;
    // the slide: well away from the spot (heard as clearly out of tune)
    let x = Math.random() * SLIDE.travel;
    for (let k = 0; k < 60 && Math.abs(SL.centsBetween(x, r.spot)) < RULES.startAway; k++) x = Math.random() * SLIDE.travel;
    if (Math.abs(SL.centsBetween(x, r.spot)) < RULES.startAway) x = r.spot > SLIDE.travel / 2 ? 0 : SLIDE.travel;
    r.startX = x;
    return r;
  }
  function promptFor(L, r) {
    const name = SL.label(r.midi);
    if (L.named && L.told) return `Play ${name} in ${SL.ordinal(r.pos)} position`;
    if (L.named) return `Find ${name}`;
    return L.ref === 'once' ? 'Find the note you heard' : 'Match the drone';
  }
  function nextRound(first) {
    const L = G.L;
    G.r = makeRound(L);
    G.phase = 'tune';
    G.x = G.r.startX; G.partial = G.r.startPartial; G.blowing = false;
    $('hudCount').textContent = `${G.i + 1} / ${G.n}`;
    $('prompt').textContent = promptFor(L, G.r);
    $('feedback').hidden = true; $('controls').hidden = false;
    $('ghost').setAttribute('hidden', '');
    draw();
    // the reference by itself at the start of every round (after the menu music has faded on the first)
    later(first ? 700 : 350, () => { if (L.ref === 'drone') setDrone(true); else playOnce(); });
  }

  /* THE REFERENCE: the drone (held, ON / OFF) or, in a 'once' level, the note played once */
  function setDrone(on) {
    if (!canTune() || G.L.ref !== 'drone') return false;
    G.droneOn = !!on;
    if (on) B.drone(G.r.f); else B.droneStop();
    draw();
    return true;
  }
  function playOnce() {
    if (!canTune() || G.L.ref !== 'once' || G.r.refPlays >= 1) return false;
    G.r.refPlays++;
    const h = B.drone(G.r.f, {sec: RULES.onceSec});
    G.once = h;
    if (h) h.onEnd = () => { if (G && G.once === h) G.once = null; };
    return !!h;
  }
  const refKey = () => G.L.ref === 'drone' ? setDrone(!G.droneOn) : playOnce();

  /* ================= LOCK IN, and what the student hears and sees afterwards ================= */
  const fmtCents = c => { const r = Math.round(Math.abs(c)); return r === 0 ? 'Right on: 0 cents' : `${c > 0 ? '+' : MINUS}${r} cents ${c > 0 ? 'sharp' : 'flat'}`; };
  const pointsFor = c => Math.max(0, Math.round(SCORING.perfect - SCORING.perCent * Math.abs(c)));
  /** stars for an average error (cents) */
  const starsFor = avg => SCORING.stars.filter(x => avg <= x + 1e-9).length;
  function lock() {
    if (!canTune() || !G.r.blown) return false;
    if (G.once) G.once.stop();
    B.stopAll(); G.blowing = false; G.droneOn = false;
    G.phase = 'feedback';
    const L = G.L, r = G.r, f = freqNow(), c = SL.cents(f, r.f);
    const onIt = SL.spotFor(r.midi, G.partial, L.tuning);        // the exact spot on the lips used (null: another note)
    const spot = onIt != null ? onIt : r.spot;
    const res = {target: r.midi, n: r.n, partial: G.partial, freq: f, tf: r.f, cents: c, abs: Math.abs(c), points: pointsFor(c),
      x: G.x, spot, wrongLip: onIt == null, midi: SL.midiOf(f)};
    G.results.push(res);
    G.score += res.points;
    $('hudScore').textContent = G.score;
    A.Sfx.sequence(['sq-lock', res.abs <= SCORING.bullseye && 'sq-star'].filter(Boolean), 60, {channel: GAME_ID});
    showFeedback(res);
    draw();
    later(500, () => hearBoth(res));
    return true;
  }
  function meterSVG(c) {
    const X = v => 20 + (Math.max(-50, Math.min(50, v)) + 50) * 2.2, s3 = SCORING.stars[2], s2 = SCORING.stars[1];
    let s = `<svg class="sq-meter" viewBox="0 0 260 64" role="img" aria-label="Cents meter: ${esc(fmtCents(c))}">`;
    s += `<rect class="pm-zone z2" x="${X(-s2)}" y="14" width="${X(s2) - X(-s2)}" height="18" rx="3"/><rect class="pm-zone z3" x="${X(-s3)}" y="14" width="${X(s3) - X(-s3)}" height="18" rx="3"/>`;
    for (let v = -50; v <= 50; v += 10) s += `<line class="pm-tick${v === 0 ? ' mid' : ''}" x1="${X(v)}" y1="${v === 0 ? 8 : 12}" x2="${X(v)}" y2="${v === 0 ? 38 : 34}"/>`;
    s += `<text class="pm-l" x="20" y="56">flat</text><text class="pm-l" x="240" y="56" text-anchor="end">sharp</text><text class="pm-l" x="130" y="56" text-anchor="middle">0</text>`;
    const nx = X(c), off = Math.abs(c) > 50;
    s += `<path class="pm-needle${off ? ' off' : ''}" d="M${nx} 4L${nx - 6} -4H${nx + 6}Z M${nx - 1.5} 4H${nx + 1.5}V40H${nx - 1.5}Z"/>`;
    return s + '</svg>';
  }
  function staffFor(r) {
    const tn = SL.spell(r.target), yn = SL.spell(Math.round(r.midi));
    const ok = r.abs <= SCORING.stars[2], close = r.abs <= SCORING.stars[0];
    return A.staffSVG('bass', [
      {n: tn, x: 140, color: '#c98a12', caption: 'Target'},
      {n: yn, x: 250, color: ok ? '#1f8a5a' : close ? '#2a6fb0' : '#d0503f', caption: 'You'},
    ], {width: 320, label: `Target ${SL.label(r.target)}, you ${SL.label(Math.round(r.midi))} ${fmtCents(r.cents)}`});
  }
  function spotLine(r) {
    if (r.wrongLip) return 'That was a different note: try another partial.';
    if (r.abs <= SCORING.bullseye) return 'Right there!';
    return `The exact spot was a little further ${r.spot > r.x ? 'OUT' : 'IN'}.`;
  }
  function showFeedback(r) {
    const last = G.i + 1 >= G.n, L = G.L;
    $('controls').hidden = true;
    // the ghost: an outline of the outer slide at the EXACT spot
    const gh = $('ghost'); gh.setAttribute('transform', `translate(${(r.spot * PXCM).toFixed(2)} 0)`); gh.removeAttribute('hidden');
    const fb = $('feedback');
    fb.innerHTML = `<div class="sq-fb-one${r.abs <= SCORING.bullseye ? ' bull' : ''}">
        <p class="sq-fb-note">Target ${SL.label(r.target)}</p>
        <p class="sq-err">${esc(fmtCents(r.cents))}${r.abs <= SCORING.bullseye ? ' <span class="sq-bull">Bullseye!</span>' : ''}</p>
        <p class="sq-spot" id="spotMsg">${esc(spotLine(r))}</p>
        ${L.flatTip && r.n === 5 ? '<p class="sq-tip5" id="flatTip">5th-partial notes are flat at the mark: bring the slide IN a little.</p>' : ''}
        ${meterSVG(r.cents)}
        <div class="sq-fb-staff">${staffFor(r)}</div>
      </div>
      <div class="acts sq-fb-acts"><button type="button" class="btn btn-secondary" id="bothBtn">▶ Hear both</button><button type="button" class="btn btn-primary" id="nextBtn">${last ? 'See results' : 'Next'}</button></div>`;
    fb.hidden = false;
    $('bothBtn').onclick = () => hearBoth(r);
    $('nextBtn').onclick = () => next();
    $('nextBtn').focus({preventScroll: true});
    fb.scrollIntoView({block: 'nearest', behavior: 'auto'});
  }
  /* the horn (where it was locked) and the drone (the target) TOGETHER, so the difference is heard */
  function hearBoth(r) {
    if (!G || G.paused || G.phase !== 'feedback') return;
    if (G.both) G.both.cancel();
    B.stopAll();
    B.start(r.freq);
    B.drone(r.tf, {sec: RULES.bothSec});
    const stage = $('stage');
    stage.classList.add('sounding');
    const timer = setTimeout(() => { B.stop(); stage.classList.remove('sounding'); }, RULES.bothSec * 1000);
    G.both = {cancel() { clearTimeout(timer); B.stopAll(); stage.classList.remove('sounding'); }};
  }
  function next() {
    if (!G || G.phase !== 'feedback') return;
    stopRound();
    G.i++;
    if (G.i >= G.n) finish(); else nextRound(false);
  }

  /* ================= RESULTS ================= */
  function finish() {
    const g = G;
    g.phase = 'done';
    $('stage').classList.remove('sounding');
    const avg = g.results.reduce((s, r) => s + r.abs, 0) / Math.max(1, g.results.length);
    const stars = starsFor(avg), prev = prog(g.lv), newBest = g.score > (prev.best || 0);
    A.store.setLevel(GAME_ID, 'all', g.lv, {stars: Math.max(stars, prev.stars || 0), best: Math.max(g.score, prev.best || 0)}, stars);
    pause.setActive(false);
    const best = g.results.reduce((m, r) => Math.min(m, r.abs), 1e9);
    const [s1, s2, s3] = SCORING.stars;
    A.UI.results.show({gameId: GAME_ID, stars,
      hero: `<div class="sq-res-horn" aria-hidden="true">${hornSVG({mini: true, marks: false})}</div>`,
      title: stars === 3 ? 'In tune!' : stars ? 'Level cleared' : 'Almost there!',
      msg: stars === 3 ? 'A trombonist\'s ears: right in tune.'
        : stars === 2 ? `Get the average under ${s3} cents for 3 stars.`
        : stars === 1 ? `Get the average under ${s2} cents for 2 stars.`
        : `Get the average under ${s1} cents to clear this level. Blow with the drone on and listen for the wah-wah-wah!`,
      tiles: [['Average', `${avg.toFixed(1)} cents`], ['Closest', `${Math.round(best)} cents`], ['Score', g.score]],
      newBest: newBest && !!prev.best,
      best: prev.best ? (newBest ? `Best: ${g.score} (was ${prev.best})` : `Best: ${Math.max(prev.best, g.score)}`) : '',
      next: {label: 'Next level', hidden: !(g.lv < LEVELS.length && (stars > 0 || A.DEMO)), onClick: () => begin(g.lv + 1)},
      retry: {label: 'Try again', onClick: () => begin(g.lv)},
      levels: {label: 'Levels', onClick: () => showHub()}});
    g.avg = avg; g.stars = stars;
    A.Sfx.sequence([stars ? 'level-complete' : 'level-failed', stars > (prev.stars || 0) && 'star-earned', newBest && prev.best && 'new-high-score'].filter(Boolean), 120, {channel: GAME_ID});
    A.Sfx.gameMenuMusic(GAME_ID, true, {afterEffects: true});
  }

  /* ================= THE PAUSE MENU: every sound stops (and when the page hides) ================= */
  const pause = A.UI.pause.mount({
    onPause() {
      if (!G) return;
      G.paused = true;
      if (G.once) { G.once = null; G.r.refPlays = 0; G.r.replay = true; }   // a once-only note cut short: heard again, free, on RESUME
      if (G.both) G.both.cancel();
      G.blowing = false;
      B.stopAll();
      draw();
    },
    onResume() {
      if (!G || !G.paused) return;
      G.paused = false;
      if (G.phase === 'tune') {
        if (G.L.ref === 'drone' && G.droneOn) B.drone(G.r.f);
        else if (G.L.ref === 'once' && (G.r.replay || !G.r.refPlays)) { G.r.replay = false; playOnce(); }   // an interrupted note plays again, free
      }
      draw();
    },
    onRestart() { const lv = G ? G.lv : 1; startLevel(lv); },
    onLevels() { showHub(); },
    canPause: () => !!G && G.phase !== 'done',
    info: () => G ? [['Note', `${Math.min(G.i + 1, G.n)} / ${G.n}`], ['Score', G.score]] : [],
  });
  addEventListener('pagehide', () => B.stopAll());

  /* ================= THE KEYBOARD ================= */
  document.addEventListener('keydown', e => {
    if (!G || G.paused || document.body.classList.contains('ui-modal') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, onBtn = e.target && /^(BUTTON|A|INPUT)$/.test(e.target.tagName);
    if (G.phase === 'feedback') {
      if (k === 'Enter' && !onBtn) { e.preventDefault(); next(); }
      return;
    }
    if (G.phase !== 'tune') return;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {               // ← = in (higher), → = out (lower)
      e.preventDefault();
      nudge((k === 'ArrowLeft' ? 1 : -1) * (e.shiftKey ? RULES.fineCents : RULES.arrowCents));
    } else if (k === 'ArrowUp' || k === 'ArrowDown') { if (G.L.lips) { e.preventDefault(); lip(G.partial + (k === 'ArrowUp' ? 1 : -1)); } }
    else if (k === ' ') { e.preventDefault(); if (!e.repeat && !G.blowing) blow(true, 'key'); }
    else if (k === 'd' || k === 'D') { e.preventDefault(); refKey(); }
    else if (k === 'Enter') { e.preventDefault(); lock(); }
    else if (A.DEMO && (k === 'a' || k === 'A')) { e.preventDefault(); api.auto(); }
    else if (A.DEMO && (k === 'w' || k === 'W')) { e.preventDefault(); api.wrong(); }
  });
  document.addEventListener('keyup', e => {
    if (e.key !== ' ' || !G) return;
    e.preventDefault();
    if (G.blowing && G.blowSrc === 'key') blow(false);
  });
  $('nudgeDown').addEventListener('click', () => nudge(-RULES.nudgeCents));
  $('nudgeUp').addEventListener('click', () => nudge(RULES.nudgeCents));
  $('lipUp').addEventListener('click', () => G && lip(G.partial + 1));
  $('lipDown').addEventListener('click', () => G && lip(G.partial - 1));
  $('droneBtn').addEventListener('click', () => G && setDrone(!G.droneOn));
  $('lockBtn').addEventListener('click', () => lock());

  /* ================= TESTS and ?demo ================= */
  /** the slide and the lips set exactly on the target (+ cents: sharp; where the slide can't go sharper, flat) */
  function tuneTo(off) {
    if (!canTune()) return false;
    const r = G.r;
    G.partial = r.n;
    let x = r.spot;
    if (off) { x = SL.shiftX(r.spot, off); if (x < 0) x = SL.shiftX(r.spot, -off); }
    G.x = SL.clampX(x);
    G.r.blown = true;                                       // the demo stands in for blowing (A + Enter locks in)
    if (G.blowing) B.setFreq(freqNow());
    draw();
    return true;
  }
  const api = A.SlideQuest = {
    state() {
      if (!G) return {phase: 'hub'};
      const L = G.L, r = G.r;
      return {lv: G.lv, phase: G.phase, i: G.i, n: G.n, paused: G.paused, score: G.score, prompt: $('prompt').textContent,
        x: G.x, partial: G.partial, freq: freqNow(), blowing: !!G.blowing, droneOn: !!G.droneOn, blown: !!(r && r.blown),
        lockEnabled: !$('lockBtn').disabled,
        flags: {tuning: L.tuning, named: !!L.named, told: !!L.told, marks: !!L.marks, needle: !!L.needle, lips: !!L.lips, ref: L.ref},
        target: r ? {midi: r.midi, n: r.n, pos: r.pos, freq: r.f, spot: r.spot, name: SL.label(r.midi), startX: r.startX, startPartial: r.startPartial, refPlays: r.refPlays} : null,
        cents: r ? SL.cents(freqNow(), r.f) : null,
        results: G.results.slice(), stars: G.stars, avg: G.avg};
    },
    begin: lv => startLevel(lv),
    intro: lv => begin(lv),
    auto: () => tuneTo(0),
    wrong: () => tuneTo(30),
    lock: () => lock(),
    next: () => next(),
    setSlide: x => setSlide(x),
    lip: n => lip(n),
    blow: on => blow(on !== false),
    drone: on => setDrone(on !== false),
    reference: () => playOnce(),
    nudge: c => nudge(c),
    starsFor, pointsFor, showHub, hornSVG, V,
  };

  showHub();
})(window.Arcade);
