/* Showtime Malfunction: THE SNARE DRUM'S JOBS (only when the player is the Snare Drum; wind players never create this).
   Every number is in levels.js SNARE_RULES (and SNARE_RHYTHMS); game.js calls in through a small api.

   THE MICROPHONE HEARS WHEN A HIT LANDS AND HOW LOUD IT IS (shared/onsets.js: sample-accurate times + level), never
   which hand played: NOTHING here judges sticking. Hit times are corrected by this device's timing check
   (shared/calibration.js: the same one Rhythm Dojo saves; none yet = its default delay). Every clock here is the GAME
   clock (G.t): it stops with the band (a sound muting the microphone, PAUSE, a special's card, a scare), and a rhythm
   or tempo job interrupted that way starts again from its count-in. Nothing here ever plays a sound.

   THE JOBS (b.job.type):
     count   EXACT COUNTS: the hits count down; at 0 the machine waits (CONFIRM, exact.confirmMs): a hit = an OVER-HIT
             (+overhitAdd, "Too many!"), silence = reboot. After a reboot the next target listens only after
             exact.gapMs of silence. FREEZE (from freeze.from): at a share of count machines, partway through, the
             Maestro's hand rises for freeze.beats beats: everyone walks at walkMul, a hit = +penalty.
     p / f   SOFT / LOUD (from dyn.from): only soft (p) / loud (f) hits count; the soundcheck's split tells them apart.
     rhythm  RHYTHM MACHINES (from rhythm.from): one-measure rhythms (SNARE_RHYTHMS: Rhythm Dojo's vetted cells, filtered),
             a silent one-measure count-in, then every written note needs a hit within rhythm.window ms and no extra
             hits (rests too): shared/rhythm-judge.js. A failed measure is played again (ticks show what went wrong).
     accent  ACCENT MACHINES (from accent.from): 8 eighths in time, every > hit loud and every other hit soft.
     roll    THE LONG TONE LURKER: fast enough AND even (roll.maxCv); NIGHTMARE's Glitch Lurker: a CRESCENDO.
     tempo   THE TEMPO-LOCK MAESTRO (NIGHTMARE, showtime 8): steady eighths at each phase's own tempo.
   THE BEAT is silent: the stage lights and the target panel's border swell on each beat, and a row of beat dots.
   NEW DRUM CHALLENGE cards (the first time a device meets each job; ids in gameData.files, never rename).
   THE ENCORE (game.js G.endless; levels.js SHOWTIME_ENDLESS.snare): the same jobs by RUN TIME instead of showtime number:
   exact counts from the start, FREEZE from freezeFromS, RHYTHM machines from rhythmFromS; every table is read at the
   showtime G.lv = 1 + t ÷ showtimeEveryS (at most 8: the rhythm pool, bpm, shares, soft/loud and accents). */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const R = window.SNARE_RULES, RHY = window.SNARE_RHYTHMS || {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const $ = id => document.getElementById(id);

  /* ---------- THE NEW DRUM CHALLENGES: a card the first time, and a line in the Malfunction Files ---------- */
  const art = (cls, inner) => `<svg class="dc-art ${cls}" viewBox="0 0 120 80" aria-hidden="true">${inner}</svg>`;
  const DRUM = {
    'drum-freeze': {name: 'Freeze!', from: 'Showtime 2', how: 'When Maestro Moose raises his hand, FREEZE: no hits until GO! Every hit during a freeze adds 2.',
      art: art('dc-freeze', '<circle cx="60" cy="40" r="30" class="dc-ring"/><text x="60" y="54" text-anchor="middle" class="dc-emo">✋</text>')},
    'drum-rhythm': {name: 'Rhythm machine', from: 'Showtime 3', how: 'Read the rhythm, count along with the silent pulse for one measure, then play it in time. Rests too: no extra hits!',
      art: art('dc-rhythm', '<path class="dc-line" d="M8 50H112"/><g class="dc-notes"><ellipse cx="24" cy="50" rx="6" ry="4.4"/><ellipse cx="50" cy="50" rx="6" ry="4.4"/><ellipse cx="68" cy="50" rx="6" ry="4.4"/><ellipse cx="96" cy="50" rx="6" ry="4.4"/><path d="M30 50V22M56 50V22M74 50V22M102 50V22M56 22H74"/></g><rect class="dc-head" x="10" y="16" width="3" height="46"/>')},
    'drum-dynamics': {name: 'Soft and loud', from: 'Showtime 5', how: 'A p machine counts only SOFT hits (a loud one adds 1). An f machine counts only LOUD hits.',
      art: art('dc-dyn', '<text x="34" y="56" text-anchor="middle" class="dc-p">p</text><text x="86" y="56" text-anchor="middle" class="dc-f">f</text>')},
    'drum-accent': {name: 'Accents', from: 'Showtime 6', how: 'Play the eighth notes in time with the pulse: every note with a > LOUD, every other one soft.',
      art: art('dc-accent', '<path class="dc-line" d="M8 54H112"/><g class="dc-notes"><ellipse cx="20" cy="54" rx="6" ry="4.4"/><ellipse cx="46" cy="54" rx="6" ry="4.4"/><ellipse cx="72" cy="54" rx="6" ry="4.4"/><ellipse cx="98" cy="54" rx="6" ry="4.4"/></g><text x="20" y="30" text-anchor="middle" class="dc-acc">&gt;</text><text x="72" y="30" text-anchor="middle" class="dc-acc dc-acc2">&gt;</text>')},
    'drum-even-roll': {name: 'Even roll', from: 'Long Tone Lurker', how: 'The ring fills only while your roll is fast AND even: every hit the same distance apart.',
      art: art('dc-roll', [0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${18 + i * 14}" cy="40" r="5" class="dc-dot" style="animation-delay:${i * .12}s"/>`).join(''))},
    'drum-cresc-roll': {name: 'Crescendo roll', from: 'Glitch Lurker, Nightmare', how: 'Start the roll soft and grow louder: each third of the ring louder than the one before.',
      art: art('dc-cresc', '<path class="dc-hair" d="M14 40L106 20M14 40L106 60"/>')},
    'drum-tempo-lock': {name: 'Match my tempo', from: 'Maestro Moose, Nightmare', how: 'Watch the Maestro\'s baton and the pulse: play steady eighth notes right with his tempo. Rushing or dragging drains the meter.',
      art: art('dc-tempo', '<g class="dc-baton"><path d="M60 70L60 14"/><circle cx="60" cy="14" r="4"/></g>')},
  };
  const DRUM_IDS = Object.keys(DRUM);

  /* ---------- THE RHYTHM POOLS (Rhythm Dojo's one-measure 4/4 cells, filtered by SNARE_RHYTHMS) ---------- */
  const C = A.Counting;
  const toks = c => c.replace(/\[/g, ' [ ').replace(/\]/g, ' ] ').trim().split(/\s+/);
  const syncopated = c => { const p = C.parse(c, '4/4'); return p.notes.some(n => (!n.rest && n.d >= 12 && n.t % 12 !== 0) || (n.tie && (n.t + n.d) % 12 !== 0)); };
  const DOJO = [...new Set((window.RD_LEVELS || []).flatMap(L => [].concat(L.time).includes('4/4') ? (Array.isArray(L.cells) ? L.cells : (L.cells && L.cells['4/4']) || []) : []))];
  const POOLS = {};
  Object.keys(RHY).forEach(lv => {
    const S = RHY[lv], allow = S.allow === '*' ? null : new Set(S.allow.split(/\s+/));
    POOLS[lv] = [...new Set(DOJO.concat(S.more || []))].filter(c => {
      const p = C.parse(c, '4/4');
      return !p.errors.length && p.measures === 1 && (!allow || toks(c).every(t => allow.has(t))) && (S.sync || !syncopated(c));
    });
  });
  /** a showtime's pool, and the rhythms it adds (half the draws come from those, so each new kind shows up) */
  function poolFor(lv) {
    const keys = Object.keys(POOLS).map(Number).filter(k => k <= lv).sort((a, b) => a - b);
    const all = keys.length ? POOLS[keys[keys.length - 1]] : [], prev = keys.length > 1 ? POOLS[keys[keys.length - 2]] : [];
    return {all, fresh: all.filter(c => !prev.includes(c))};
  }

  function create(api) {
    const gd = api.gd;
    let H = null;                                            // the show's snare state (start … stop)
    const G = () => api.G();
    const lv = () => G().lv;
    const at = (arr, k = lv()) => arr[k - 1] || 0;
    const nightmare = () => !!(G() && G().extra);
    /* FREEZE and RHYTHM machines: from their showtime, or (THE ENCORE) from their run time; their tables are then read at
       least at their first showtime (so a freeze at 40 s, before "showtime 2", still has its beats) */
    const ENC = () => (window.SHOWTIME_ENDLESS || {}).snare || {};
    const freezeOn = () => G().endless ? G().t >= ENC().freezeFromS : lv() >= R.freeze.from;
    const rhythmOn = () => G().endless ? G().t >= ENC().rhythmFromS : lv() >= R.rhythm.from;
    const fz = () => Math.max(lv(), R.freeze.from);
    const split = () => gd.snareDyn && gd.snareDyn.split;
    const beatS = bpm => 60 / bpm;
    const has = (b, id) => !!(b && b.traits && b.traits.includes(id));

    /* ---------- THE SNARE CLOCK (s): real time, but only while the band moves (it stops on every still frame: a sound
       muting the microphone, PAUSE, a card, a scare). Unlike the game clock it is never capped per frame, so a slow
       frame never shifts the beat. A hit's perf ms (already corrected by the timing check) -> snare-clock seconds ---------- */
    const gt = p => H.clk + (p - H.tPerf) / 1000;
    const perfAt = t => H.tPerf + (t - H.clk) * 1000;

    /* ---------- the show ---------- */
    function start() {
      ended = null;
      H = {hits: [], clk: 0, tPerf: performance.now(), lag: A.Calibration ? A.Calibration.lag('clap') : 0, gapUntil: -1, confirm: null, freeze: null,
        pulse: {t0: 0, beatS: beatS(at(R.beat.bpm))}, dirty: false, last: null, log: []};
      ensureParts();
      if (A.Onsets) A.Onsets.ensure();
      $('tpanel').classList.add('sn-on');
      beatDots(4, -1);
    }
    let ended = null;                                        // what the last show left (tests read it after the show is over)
    function stop() {
      if (H) ended = {gt: H.clk, lag: H.lag, log: H.log.slice(), last: H.last, target: null, over: true};
      H = null;
      const p = $('tpanel'); if (p) { p.classList.remove('sn-on', 'sn-frozen', 'sn-clean', 'sn-fail'); p.style.removeProperty('--pulse'); }
      const a = $('arena'); if (a) a.style.removeProperty('--pulse');
      const h = $('stHand'); if (h) h.hidden = true;
      const f = $('tpFreeze'); if (f) f.hidden = true;
      countIn(null);
    }
    function ensureParts() {
      const p = $('tpanel');
      if (!$('tpBeats')) {
        const d = document.createElement('div'); d.className = 'tp-beats'; d.id = 'tpBeats'; d.setAttribute('aria-hidden', 'true'); p.appendChild(d);
        const fz = document.createElement('div'); fz.className = 'tp-freeze'; fz.id = 'tpFreeze'; fz.hidden = true; fz.innerHTML = '<span aria-hidden="true">✋</span><b>FREEZE!</b>'; p.appendChild(fz);
        const ci = document.createElement('div'); ci.className = 'tp-in'; ci.id = 'tpIn'; ci.setAttribute('aria-live', 'assertive'); p.appendChild(ci);
        const hand = document.createElement('div'); hand.className = 'st-hand'; hand.id = 'stHand'; hand.hidden = true; hand.innerHTML = '<span aria-hidden="true">✋</span>';
        $('arena').appendChild(hand);
      }
    }

    /* ---------- a machine walks on: its job (and THE FAIRNESS CHECK) ---------- */
    const FORCED = A.DEMO ? (A.params.get('snarejob') || '').toLowerCase() || null : null;   // tests: ?demo&snarejob=rhythm|accent|p|f|count|freeze
    function job(spec, {boss = false} = {}) {
      const g = G(), s = Object.assign({}, spec), L = g.L, n = lv();
      if (boss) s.job = nightmare() && n === 8 ? {type: 'tempo'} : {type: 'count'};
      else if (has(s, 'long-tone-lurker')) {
        s.job = {type: 'roll'};
        if (nightmare() && has(s, 'glitch-jester')) { s.cresc = true; delete s.rollRate2; }   // NIGHTMARE: the Glitch Lurker's roll is a crescendo
      } else if (s.special || s.mini) s.job = {type: 'count'};
      else {
        const dyn = !!split(), r = Math.random();
        const acc = dyn && n >= R.accent.from ? at(R.accent.share) : 0, pf = dyn && n >= R.dyn.from ? at(R.dyn.share) : 0, rh = rhythmOn() ? at(R.rhythm.share, Math.max(n, R.rhythm.from)) : 0;
        let type = r < acc ? 'accent' : r < acc + pf ? (Math.random() < .5 ? 'p' : 'f') : r < acc + pf + rh ? 'rhythm' : 'count';
        if (FORCED && ['rhythm', 'accent', 'p', 'f', 'count'].includes(FORCED)) type = FORCED;
        if (A.DEMO && s.forceJob) type = s.forceJob;                        // tests (the fairness check)
        if (FORCED === 'freeze') type = 'count';
        s.job = {type};
      }
      const J = s.job;
      if (J.type === 'rhythm' || J.type === 'accent') {
        const bpm = Math.round(at(R.rhythm.bpm, Math.max(n, R.rhythm.from)) * (nightmare() ? R.rhythm.nightmareBpm : 1));
        const m = Math.max(1, J.type === 'accent' ? at(R.accent.measures) : at(R.rhythm.measures, Math.max(n, R.rhythm.from)));
        Object.assign(J, {bpm, measures: m, passed: 0, idx: 0, W: at(R.rhythm.window, Math.max(n, R.rhythm.from)), list: []});
        for (let k = 0; k < m; k++) J.list.push(J.type === 'accent' ? accentItem() : rhythmItem(n));
        s.count = m;
      }
      if (J.type === 'tempo') Object.assign(J, {fill: 0, phaseDone: 0});
      fair(s, boss);
      return s;
    }
    let lastText = null;
    function rhythmItem(n) {
      const P = poolFor(Math.max(n, R.rhythm.from)), from = P.fresh.length && Math.random() < .5 ? P.fresh : P.all;
      let text; for (let k = 0; k < 8; k++) { text = pick(from.length ? from : ['q q q q']); if (text !== lastText) break; }
      lastText = text;
      return {text};
    }
    function accentItem() {
      let pat = pick(R.accent.patterns).split(/\s+/);
      while (pat.length < 8) pat = pat.concat(pat);
      return {text: 'e e e e e e e e', accents: pat.slice(0, 8).map(x => x === '>')};
    }
    /** THE FAIRNESS CHECK: the time the job needs must fit in `margin` of the time the machine walks; if not, it walks slower */
    function fair(s, boss) {
      const F = R.fair, g = G(), L = g.L, n = lv(), J = s.job, X = R.exact;
      const countNeed = c => c / F.rate + (X.confirmMs + X.gapMs) / 1000 + (freezeOn() ? at(R.freeze.beats, fz()) * beatS(at(R.beat.bpm)) : 0);
      let need;
      if (J.type === 'rhythm' || J.type === 'accent') need = R.rhythm.leadS + (1 + J.measures) * 4 * beatS(J.bpm);
      else if (J.type === 'roll') need = (s.need || 0) + (s.rollRate2 || s.lurkGlitch ? (api.fairBase().glitch || 0) : 0);
      else if (J.type === 'tempo') need = R.maestro.bpm.slice(0, (L.boss && L.boss.phases) || 3).reduce((a, bpm) => a + R.rhythm.leadS + (4 + R.maestro.beats) * beatS(bpm), 0);
      else need = boss ? (s.phases || (L.boss && L.boss.phases) || 1) * countNeed(s.count) : countNeed(s.count);
      const shows = 1 - (s.dark ? s.revealAt || 0 : 0);
      const stag = boss ? 1 + (window.SHOWTIME_RULES.bossStagger || 0) * ((L.boss && L.boss.phases || 1) - 1) : 1;
      let walk = s.walk || L.walk / (s.speed || 1);
      if (need > walk * shows * stag * F.margin) {
        walk = need / (shows * stag * F.margin);
        if (s.walk) s.walk = walk; else s.speed = L.walk / walk;
        s.snareSlowed = true;
      }
      s.snareNeed = need; s.snareWalk = +walk.toFixed(2); s.snareShows = shows * stag;
    }

    /* ---------- the target changes: its job starts (a rhythm's count-in, the freeze roll, a challenge card) ---------- */
    function onTarget(t) {
      if (!H) return;
      if (!t) { countIn(null); return; }
      const J = t.job || {type: 'count'};
      if ((J.type === 'count' || J.type === 'p' || J.type === 'f') && !t.boss && !t.special && !t.mini && freezeOn() && t.freezeAt == null) {   // regular machines (specials have their own tricks)
        const ch = FORCED === 'freeze' ? 1 : FORCED ? 0 : at(R.freeze.chance, fz());   // (tests: ?demo&snarejob=freeze always, any other forced job never)
        t.freezeAt = t.left > 1 && Math.random() < ch ? Math.max(1, t.left - Math.ceil(t.left * R.freeze.at)) : -1;
      }
      if (J.type === 'p' || J.type === 'f') meet('drum-dynamics');
      if (J.type === 'roll') meet(t.cresc ? 'drum-cresc-roll' : 'drum-even-roll');
      if (J.type === 'rhythm' || J.type === 'accent' || J.type === 'tempo') {
        if (J.type === 'tempo' && J.phase !== t.phase) { J.phase = t.phase; J.fill = 0; }
        J.bpmNow = J.type === 'tempo' ? R.maestro.bpm[(t.phase - 1) % R.maestro.bpm.length] : J.bpm;
        begin(t);
        meet(J.type === 'tempo' ? 'drum-tempo-lock' : J.type === 'accent' ? 'drum-accent' : 'drum-rhythm');
      } else H.pulse = {t0: H.clk, beatS: beatS(at(R.beat.bpm))};
    }
    const meet = id => api.meet(id, DRUM[id]);
    /** a timed job starts (again): the pulse at its tempo, a one-measure silent count-in */
    function begin(t) {
      const J = t.job, b = beatS(J.bpmNow);
      J.start = H.clk + R.rhythm.leadS; J.k = 0; J.marks = null;
      H.pulse = {t0: J.start, beatS: b};
      H.dirty = false;
    }

    /* ---------- a hit ---------- */
    function hit(o) {
      const g = G();
      if (!H || !g || g.over || g.paused || g.held || g.scare) return;
      if (H.stillNow || A.Pitch.isSuppressed(performance.now())) return;   // the band stands still (a sound mutes the microphone): nothing counts
      api.attacked(o.time);
      const p = o.time - H.lag, t0 = gt(p), level = o.level == null ? R.demo.level : o.level;
      H.hits.push({gt: t0, p: o.time, level}); while (H.hits.length && H.hits[0].p < o.time - 6000) H.hits.shift();
      if (H.confirm && H.confirm.b.state === 'walk') return overHit(H.confirm.b);
      if (t0 < H.gapUntil) { H.gapUntil = t0 + R.exact.gapMs / 1000; log('gap'); return; }   // the gap after a reboot: silence first
      const t = api.target(); if (!t) return;
      const J = t.job || {type: 'count'};
      if (H.freeze) return frozen(H.freeze.b);
      if (J.type === 'roll') { if (t.cresc) crescHit(t, level); return; }
      if (J.type === 'rhythm' || J.type === 'accent') { flash(); return; }   // judged measure by measure (tick)
      if (J.type === 'tempo') return tempoHit(t, t0);
      if (J.type === 'p' && split() && level >= split()) {                 // p: a loud hit adds one
        t.left++; t.total++; api.sour(t); api.setPrompt('Softer! Only soft hits count on a p machine.', 'bad'); api.drawSign(t); api.drawPanel(t); log('loud-on-p'); return;
      }
      if (J.type === 'f' && split() && level < split()) { api.setPrompt('Louder! Only loud hits count on an f machine.', 'hint'); log('soft-on-f'); return; }
      api.counted(t);
      if (t.left > 0) {
        api.countedMore(t);
        if (J.type === 'count' && t.left === 1) api.setPrompt('1 more… and STOP!', 'good');
        if (t.freezeAt > 0 && !t.froze && t.left <= t.freezeAt) tryFreeze(t);
      } else confirm(t);
      api.hud();
    }
    /** tests: when the band stood still and moved again (perf ms, the last 20), for a failure message */
    function trail(what, now) { (H.trail || (H.trail = [])).push(what + ' ' + Math.round(now)); if (H.trail.length > 20) H.trail.shift(); }
    function log(what) { if (H) { H.log.push(what); if (H.log.length > 40) H.log.shift(); } }
    function flash() { const p = $('tpanel'); p.classList.remove('sn-hit'); void p.offsetWidth; p.classList.add('sn-hit'); }

    /* EXACT COUNTS: at 0, CONFIRM; a hit = an over-hit; silence = the reboot (tick) */
    function confirm(t) {
      H.confirm = {b: t, until: H.clk + R.exact.confirmMs / 1000};
      api.drawSign(t); api.drawPanel(t);
      api.setPrompt('Stop! Let it ring…', 'good');
    }
    function overHit(b) {
      H.confirm = null;
      b.left += R.exact.overhitAdd; b.total += R.exact.overhitAdd;
      api.sour(b); api.drawSign(b); api.drawPanel(b);
      api.setPrompt('Too many! Count your hits and stop.', 'bad');
      log('overhit'); api.hud();
    }

    /* FREEZE: the Maestro's hand */
    function tryFreeze(t) {
      const g = G(), b = H.pulse.beatS, beats = at(R.freeze.beats, fz()), dur = beats * b;
      if (!beats) return;
      const soon = g.bots.filter(x => x.state === 'walk').some(x => (1 - x.z) * x.walk - dur * R.freeze.walkMul < R.freeze.guard);
      t.froze = true;
      if (soon) { log('freeze-guard'); return; }                      // never in the last seconds before a machine reaches the front
      const next = H.pulse.t0 + Math.ceil((H.clk - H.pulse.t0) / b + 1e-6) * b;
      H.freeze = {b: t, from: H.clk, until: next + dur, beats};
      $('stHand').hidden = false; $('tpFreeze').hidden = false; $('tpanel').classList.add('sn-frozen');
      api.setPrompt("FREEZE! The Maestro's hand is up: don't play!", 'bad');
      log('freeze');
      meet('drum-freeze');
    }
    function frozen(b) {
      b.left += R.freeze.penalty; b.total += R.freeze.penalty;
      api.sour(b); api.drawSign(b); api.drawPanel(b);
      api.setPrompt('Freeze means FREEZE!', 'bad');
      log('freeze-hit'); api.hud();
    }

    /* ---------- every frame the band moves (the game clock ran) ---------- */
    function tick(dt, now) {
      if (!H) return;
      if (H.stillNow) trail('go', now);
      // the clock runs on performance.now(), the time every hit is stamped with: never on the frame's own timestamp,
      // which on a busy page can be well behind the moment the frame actually runs (hits then judged early / late)
      const pn = performance.now();
      H.clk += Math.max(0, pn - H.tPerf) / 1000; H.tPerf = pn; H.stillNow = false;
      if (H.dirty) redo();
      // confirm → reboot; freeze → GO!
      if (H.confirm && (H.confirm.b.state !== 'walk' || H.clk >= H.confirm.until)) {
        const b = H.confirm.b; H.confirm = null;
        if (b.state === 'walk') {
          api.complete(b); H.gapUntil = H.clk + R.exact.gapMs / 1000; api.hud(); log('reboot');
          const f = b.job && ({p: 'drum-dynamics', f: 'drum-dynamics'})[b.job.type]; if (f) beaten(f);
          if (b.froze && b.freezeAt > 0) beaten('drum-freeze');
        }
      }
      if (H.freeze && H.clk >= H.freeze.until) {
        H.freeze = null;
        $('stHand').hidden = true; $('tpFreeze').hidden = true; $('tpanel').classList.remove('sn-frozen');
        api.banner('GO!', 'go'); setTimeout(() => { if (H && !H.freeze) api.banner(''); }, 700);
        const t = api.target(); if (t) api.setPrompt(`GO! ${t.left} more… and STOP.`, 'good');
      }
      const t = api.target(), J = t && t.job;
      if (J && (J.type === 'rhythm' || J.type === 'accent')) rhythmTick(t);
      if (J && J.type === 'tempo') tempoTick(t);
      pulse();
    }
    /** the band stood still (a sound, the pause, a card, a scare): a timed job starts again from its count-in */
    function still(now) { if (!H) return; if (!H.stillNow) trail('still', now); H.stillNow = true; if (now) H.tPerf = performance.now(); const t = api.target(), J = t && t.job; if (J && J.start != null && (J.type === 'rhythm' || J.type === 'accent' || J.type === 'tempo')) H.dirty = true; }
    function redo() {
      H.dirty = false;
      const t = api.target(); if (!t || !t.job || t.job.start == null) return;
      begin(t); api.setPrompt('Again from the count-in: 1, 2, 3, 4…', 'hint'); api.drawPanel(t);
    }
    /** THE PULSE: the stage lights and the panel's border swell on each beat (smooth, ≤ maxSwells a second); the dots */
    function pulse() {
      const P = H.pulse, x = (H.clk - P.t0) / P.beatS, ph = x - Math.floor(x);
      const RM = A.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)');
      const v = x < 0 ? 0 : RM.matches ? .6 : Math.exp(-ph * 3.2);
      $('tpanel').style.setProperty('--pulse', v.toFixed(3)); $('arena').style.setProperty('--pulse', v.toFixed(3));
      if (H.freeze) { const k = Math.floor((H.clk - H.freeze.from) / P.beatS); beatDots(H.freeze.beats, Math.min(H.freeze.beats - 1, k), 'freeze'); }
      else beatDots(4, x < 0 ? -1 : Math.floor(x) % 4);
    }
    let dotsKey = '';
    function beatDots(n, k, cls = '') {
      const d = $('tpBeats'); if (!d) return;
      const key = n + ':' + k + ':' + cls; if (key === dotsKey) return; dotsKey = key;
      if (d.children.length !== n) d.innerHTML = '<i></i>'.repeat(n);
      d.className = 'tp-beats ' + cls;
      [...d.children].forEach((e, i) => e.classList.toggle('on', i === k));
    }
    function countIn(num) { const c = $('tpIn'); if (!c) return; c.textContent = num ? String(num) : ''; c.classList.toggle('on', !!num); }

    /* ---------- RHYTHM and ACCENT machines: measure by measure ---------- */
    const measureS = J => 4 * beatS(J.bpmNow);
    const mStart = (J, k) => J.start + (1 + k) * measureS(J);
    function rhythmTick(t) {
      const J = t.job, W = J.W / 1000, M = measureS(J);
      if (J.start == null) return;
      const rel = H.clk - J.start;
      countIn(rel >= 0 && rel < M ? Math.floor(rel / beatS(J.bpmNow)) + 1 : null);
      if (H.clk < mStart(J, J.k) + M + W) return;
      judge(t);
    }
    /** the hits that belong to measure k: from just before its downbeat to just before the next one (count-in hits never count) */
    function bounds(J, k) {
      const M = measureS(J), W = J.W / 1000, item = J.list[J.idx], p = C.parse(item.text, '4/4'), spt = beatS(J.bpmNow) / 12;
      const onsets = C.attacks(C.groups(p)).map(a => a.t * spt), lastGap = M - (onsets[onsets.length - 1] || 0);
      const cut = k => mStart(J, k) + M - Math.min(W, lastGap / 2);
      return {from: k === 0 ? mStart(J, 0) - W : cut(k - 1), to: cut(k), onsets};
    }
    function judge(t) {
      const J = t.job, item = J.list[J.idx], k = J.k, B = bounds(J, k), S0 = mStart(J, k), W = J.W;
      const hits = H.hits.filter(h => h.gt >= B.from && h.gt < B.to).map(h => ({rel: h.gt - S0, level: h.level}));
      const {tg, extras} = A.RhythmJudge.match(B.onsets.map((x, i) => ({t: x, i})), hits, {perfectMs: W / 2, goodMs: W, okMs: W, lateMs: W * 2});
      const timed = tg.every(x => x.res === 'perfect' || x.res === 'good' || x.res === 'ok') && !extras.length;
      let loudness = null;
      if (item.accents && split()) {
        const bad = tg.filter(x => x.a && (item.accents[x.i] ? x.a.level < split() : x.a.level >= split()));
        if (bad.some(x => item.accents[x.i])) loudness = 'Accents louder!';
        else if (bad.length) loudness = 'Keep the others soft!';
      }
      const pass = timed && !loudness;
      const spt = beatS(J.bpmNow) / 12;
      J.marks = pass ? null : {hits: tg.filter(x => x.a && x.res !== 'perfect' && x.res !== 'good' && x.res !== 'ok').map(x => ({tick: x.a.rel / spt, kind: x.d < 0 ? 'early' : 'late'}))
        .concat(extras.map(x => ({tick: x.rel / spt, kind: 'extra'}))), miss: tg.filter(x => x.res === 'miss').map(x => x.i),
        loud: loudness ? tg.filter(x => x.a && (item.accents[x.i] ? x.a.level < split() : x.a.level >= split())).map(x => x.i) : []};
      J.last = {pass, res: tg.map(x => x.res), extras: extras.length, loudness, k, hits: hits.length};
      H.last = J.last;
      J.k++;
      if (pass) {
        J.passed++; J.idx = Math.min(J.list.length - 1, J.idx + 1);
        t.left = Math.max(0, J.measures - J.passed);
        $('tpanel').classList.remove('sn-fail'); $('tpanel').classList.add('sn-clean');
        setTimeout(() => $('tpanel') && $('tpanel').classList.remove('sn-clean'), 700);
        if (J.passed >= J.measures) { beaten(J.type === 'accent' ? 'drum-accent' : 'drum-rhythm'); t.left = 0; api.complete(t); H.gapUntil = H.clk + R.exact.gapMs / 1000; api.hud(); return; }
        api.setPrompt('Clean! Next measure: keep counting.', 'good');
      } else {
        api.sour(t); $('tpanel').classList.add('sn-fail');
        const miss = tg.some(x => x.res === 'miss'), early = tg.some(x => x.res === 'early'), late = tg.some(x => x.res === 'late');
        api.setPrompt(loudness && timed ? loudness : extras.length ? 'An extra hit! Rests too: count them, don\'t play them.' : miss ? 'A note was missed. Same rhythm again!'
          : early ? 'Early! Wait for the beat. Same rhythm again.' : late ? 'Late! Stay with the pulse. Same rhythm again.' : 'Same rhythm again!', 'bad');
      }
      api.drawSign(t); api.drawPanel(t);
    }

    /* ---------- THE TEMPO-LOCK MAESTRO ---------- */
    function tempoTick(t) {
      const J = t.job; if (J.start == null) return;
      const rel = H.clk - J.start, M = 4 * beatS(J.bpmNow);
      countIn(rel >= 0 && rel < M ? Math.floor(rel / beatS(J.bpmNow)) + 1 : null);
    }
    function tempoHit(t, t0) {
      const J = t.job; if (J.start == null) return;
      const b = beatS(J.bpmNow), e8 = b / 2, play = J.start + 4 * b;
      if (t0 < play - R.maestro.window / 1000) return;                  // the count-in: never counts
      const x = (t0 - play) / e8, d = (x - Math.round(x)) * e8 * 1000;
      J.drift = (J.drift || []).concat([{gt: t0, d}]).filter(h => t0 - h.gt <= b);
      const avg = J.drift.reduce((a, h) => a + h.d, 0) / J.drift.length, step = 1 / (2 * R.maestro.beats);
      if (Math.abs(avg) > R.maestro.window * .6 || Math.abs(d) > R.maestro.window) {
        J.fill = Math.max(0, J.fill - step);
        api.setPrompt(avg < 0 ? "You're rushing! Wait for the Maestro's beat." : "You're dragging! Keep up with the baton.", 'bad');
        log(avg < 0 ? 'rushing' : 'dragging');
      } else {
        J.fill = Math.min(1, J.fill + step);
        if (J.fill >= 1 - 1e-6) {
          J.fill = 0; J.phaseDone++;
          if (!(t.phase < t.phases)) beaten('drum-tempo-lock');
          t.left = 0; api.complete(t); api.hud(); return;
        }
      }
      api.drawPanel(t); api.drawSign(t);
    }

    /* ---------- THE LURKER'S ROLL: fast enough AND even; NIGHTMARE's Glitch Lurker: growing louder ---------- */
    function roll(t, now, rate) {
      if (!H) return {holding: false, mul: 1};
      if (A.Pitch.demoHeld && A.Pitch.demoHeld() === 'drum') return {holding: true, mul: 1};
      // the roll is ON while the hits keep coming (the last one no longer ago than two of its gaps), and it's measured
      // over the window ending at its latest hit (so a hit the microphone delivers a little late never breaks it)
      const last = H.hits[H.hits.length - 1], win = R.roll.windowS * 1000;
      if (!last || now - last.p > Math.max(250, 2000 / rate)) return {holding: false, mul: 1};
      const rec = H.hits.filter(h => last.p - h.p < win);
      if (rec.length < rate * R.roll.windowS) return {holding: false, mul: 1};
      const gaps = []; for (let i = 1; i < rec.length; i++) gaps.push(rec[i].p - rec[i - 1].p);
      const mean = gaps.reduce((a, x) => a + x, 0) / gaps.length, sd = Math.sqrt(gaps.reduce((a, x) => a + (x - mean) ** 2, 0) / gaps.length);
      const cv = mean ? sd / mean : 0, maxCv = nightmare() ? R.roll.maxCvNightmare : R.roll.maxCv;
      t.rollCv = +cv.toFixed(3);
      if (t.cresc) {
        const third = Math.min(2, Math.floor(t.holdP / t.need * 3));
        if (third > 0) {
          const lv0 = (t.thirds || [])[third - 1], listen = rec.filter(h => last.p - h.p < R.roll.crescListenS * 1000);
          const avg = listen.reduce((a, h) => a + h.level, 0) / Math.max(1, listen.length);
          if (lv0 && avg < lv0.avg * R.roll.crescK) return {holding: true, mul: 0, msg: 'Louder! Grow the roll as the ring fills.'};
        }
      }
      if (cv > maxCv) return {holding: true, mul: R.roll.clumpyMul, msg: 'Smooth it out: even hits!'};
      return {holding: true, mul: 1};
    }
    function crescHit(t, level) {
      const third = Math.min(2, Math.floor(t.holdP / t.need * 3)), T = t.thirds || (t.thirds = []);
      const x = T[third] || (T[third] = {sum: 0, n: 0, avg: 0}); x.sum += level; x.n++; x.avg = x.sum / x.n;
    }

    /* ---------- drawing: the voice box and the target panel ---------- */
    const DYN = {p: '<b class="sn-dyn" aria-label="piano: soft">p</b>', f: '<b class="sn-dyn" aria-label="forte: loud">f</b>'};
    function rhythmSVG(item, {id, counting = true, marks = null} = {}) {
      const p = C.parse(item.text, '4/4'), E = A.RhythmStaff.engrave(p, {counting, showTime: true, final: true, id, label: 'Rhythm to play'});
      let extra = '';
      if (item.accents) E.xs.forEach((x, i) => { if (item.accents[i]) extra += `<text class="sn-acc" x="${x + 6.6}" y="16" text-anchor="middle">&gt;</text>`; });
      if (marks) {
        marks.hits.forEach(m => { const x = E.xAt(Math.max(0, m.tick)); extra += `<path class="sn-tick ${m.kind}" d="M${x.toFixed(1)} 38V60"/>`; });
        (marks.miss || []).concat(marks.loud || []).forEach(i => { if (E.xs[i] != null) extra += `<circle class="sn-miss" cx="${E.xs[i]}" cy="70" r="11"/>`; });
      }
      return E.svg.replace(/viewBox="0 0 ([\d.]+) ([\d.]+)"/, (m, w, h) => `viewBox="0 -8 ${w} ${+h + 8}"`).replace('</svg>', extra + '</svg>');
    }
    function sign(b) {
      const J = b.job; if (!J) return null;
      if (J.type === 'p' || J.type === 'f') return {staff: `<span class="drum-ico big" aria-hidden="true"></span>${DYN[J.type]}`, count: `<b class="vb-count">× ${b.left}</b>`};
      if (J.type === 'rhythm' || J.type === 'accent') return {staff: `<span class="sn-mini">${rhythmSVG(J.list[J.idx], {id: 'vb' + b.id, counting: false})}</span>`,
        count: `<b class="vb-count">× ${Math.max(0, J.measures - J.passed)}</b>`};
      if (J.type === 'tempo') return {staff: '<span class="sn-baton" aria-hidden="true"></span>', count: `<b class="vb-count sn-bpm">♩ = ${J.bpmNow || R.maestro.bpm[0]}</b>`};
      if (J.type === 'count' && H && H.confirm && H.confirm.b === b) return {staff: '<span class="drum-ico big" aria-hidden="true"></span>', count: '<b class="vb-count">STOP</b>'};
      return null;
    }
    /** the target panel: true = drawn here (game.js draws the rest) */
    function panel(t) {
      const P = $('tpanel'), staffEl = $('tpStaff'), countEl = $('tpCount');
      if (!t || !H) return false;
      const J = t.job || {type: 'count'};
      const own = (key, html) => {
        if (staffEl.dataset.sn === key && staffEl.querySelector('.sn-own')) return false;
        staffEl.innerHTML = `<div class="sn-own">${html}</div>`; staffEl.dataset.sn = key; return true;
      };
      P.dataset.job = J.type;
      if (J.type === 'roll') return false;
      if (J.type === 'rhythm' || J.type === 'accent') {
        const item = J.list[J.idx];
        if (own(`${t.id}:${J.idx}:${J.k}:${JSON.stringify(J.marks)}`, rhythmSVG(item, {id: 'tp' + t.id, marks: J.marks}) +
          (item.accents ? '<p class="sn-note">&gt; = LOUD · the rest soft</p>' : ''))) A.RhythmStaff.refine(staffEl);
        countEl.innerHTML = `<span class="sn-meas">Measure ${Math.min(J.passed + 1, J.measures)} of ${J.measures}</span>`;
        countEl.setAttribute('aria-label', `${Math.max(0, J.measures - J.passed)} measures to play`);
        return true;
      }
      if (J.type === 'tempo') {
        own(`tempo:${t.phase}`, `<div class="sn-tempo"><span class="sn-baton big" aria-hidden="true"></span><p><b>Match my tempo!</b><br>♩ = ${J.bpmNow}: steady eighth notes</p></div>`);
        countEl.innerHTML = `<span class="sn-fill" role="img" aria-label="${Math.round(J.fill * 100)} percent"><i style="transform:scaleX(${J.fill.toFixed(3)})"></i></span>`;
        return true;
      }
      // counts (plain, p, f): the count going down, "…and STOP" at 1, STOP while it waits
      own(`count:${J.type}`, `<span class="drum-ico huge" aria-hidden="true"></span>${DYN[J.type] || ''}`);
      const confirming = H.confirm && H.confirm.b === t;
      countEl.innerHTML = confirming ? '<span class="sn-stop">STOP</span>' : `× ${t.left}${t.left === 1 ? '<small class="sn-andstop">…and STOP</small>' : ''}`;
      countEl.setAttribute('aria-label', confirming ? 'Stop' : `${t.left} more${t.left === 1 ? ', then stop' : ''}`);
      return true;
    }
    function prompt(t) {
      const J = t.job; if (!J) return null;
      if (J.type === 'rhythm') return 'A rhythm machine! Count along with the pulse for one measure (1, 2, 3, 4), then play the rhythm.';
      if (J.type === 'accent') return 'Accents! Count in with the pulse, then eighth notes: LOUD on every >, soft on the rest.';
      if (J.type === 'p') return `A p machine: ${t.left} SOFT hits, then stop!`;
      if (J.type === 'f') return `An f machine: ${t.left} LOUD hits, then stop!`;
      if (J.type === 'tempo') return `Match my tempo! Count in, then steady eighth notes at ♩ = ${J.bpmNow}.`;
      if (J.type === 'count') return `Hit ${t.left} times, then STOP!`;
      return null;
    }

    /* ---------- the Malfunction Files: DRUM CHALLENGES ---------- */
    function beaten(id) { const f = api.fileOf(id); f.seen = 1; f.beaten = (f.beaten || 0) + 1; api.save(); }
    function filesHTML() {
      const files = gd.files || {};
      return `<h3 class="ui-section files-sec" id="drumFilesSec">Drum challenges</h3><p class="f-sub">New jobs for the snare, showtime by showtime.</p>` +
        DRUM_IDS.map(id => {
          const D = DRUM[id], f = files[id] || {}, st = f.beaten ? 'done' : f.seen ? 'seen' : 'none';
          return `<div class="file f-${st} f-drum" data-id="${id}"><span class="dc-box">${D.art}</span><b class="f-name">${st === 'none' ? '???' : D.name}</b>
            <span class="f-how">${st === 'none' ? `Not met yet (${D.from}).` : D.how}</span><span class="f-count">${f.beaten ? `Beaten ${f.beaten} time${f.beaten === 1 ? '' : 's'}` : ''}</span></div>`;
        }).join('');
    }

    /* ---------- THE SNARE CARD on the showtime screen: what each showtime adds, the timing check, the soundcheck ---------- */
    function card(el) {
      const cal = A.Calibration && A.Calibration.saved('clap');
      el.innerHTML = `<span class="drum-ico" aria-hidden="true"></span><div class="sn-card"><b>Snare jobs</b>
        <p>Every clean hit counts down, and the count must be EXACT: hit that many times, then stop. The beat is silent: watch the lights pulse.</p>
        <ul class="sn-adds"><li><b>Showtime ${R.freeze.from}:</b> FREEZE when the Maestro raises his hand</li><li><b>${R.rhythm.from}:</b> read rhythms</li>
          <li><b>${R.dyn.from}:</b> soft and loud</li><li><b>${R.accent.from}:</b> accents</li><li><b>Nightmare:</b> even rolls, a crescendo roll and the Maestro's tempo</li></ul>
        <p class="sn-tools"><button type="button" class="btn btn-secondary btn-small" id="snTiming">${cal ? `Timing check: ${cal.ms} ms · Redo` : 'Check your timing'}</button>
          <button type="button" class="btn btn-secondary btn-small" id="snSound">${gd.snareDyn ? 'Redo soundcheck' : 'Soundcheck'}</button></p></div>`;
      $('snTiming').onclick = () => A.requireMic(() => timing());
      $('snSound').onclick = () => A.requireMic(() => soundcheck(() => api.hubRefresh()));
    }
    /** THE TIMING CHECK: the same flow as Rhythm Dojo's (shared/timing-check.js), saved for the whole arcade */
    let CLK = null;
    function timing(done) {
      CLK = CLK || A.AudioClock.create();
      const kit = raw => { const o = raw ? A.Sfx.outputRaw && A.Sfx.outputRaw() : A.Sfx.output(); return o && A.MHBacking ? A.MHBacking.create(o.ctx, o.out, {}) : null; };
      A.TimingCheck.open({els: {panel: $('stCal'), title: $('stCalTitle'), msg: $('stCalMsg'), dots: $('stCalDots'), say: $('stCalSay'), pad: $('stCalPad'), go: $('stCalGo'), skip: $('stCalSkip')},
        tap: false, first: false, rules: R.timing, clock: CLK, kit, key: 'clap', gameId: 'showtime-malfunction',
        words: {title: 'snare', what: 'playing', act: 'play one hit', Act: 'Hit', noun: 'hits'},
        onClose: ok => { if (H) H.lag = A.Calibration.lag('clap'); api.hubRefresh(); if (done) done(ok); }});
    }

    /* ---------- THE SOUNDCHECK: 4 soft hits, then 4 loud ones; the split halfway between them (log scale) ---------- */
    let SC = null;
    function soundcheck(done) {
      const P = $('stSound'), N = R.dyn.hits;
      SC = {step: 'soft', soft: [], loud: [], done, sub: null};
      A.Sfx.gameMenuMusic('showtime-malfunction', false);
      A.Pitch.pauseListening(false); if (A.Onsets) { A.Onsets.ensure(); SC.sub = A.Onsets.listen(o => scHit(o.level)); }
      P.hidden = false; $('stSoundSkip').focus();
      draw();
      function draw() {
        const list = SC[SC.step];
        $('stSoundStep').innerHTML = SC.step === 'soft' ? `Play ${N} <b>SOFT</b> hits <b class="sn-dyn">p</b>` : `Now ${N} <b>LOUD</b> hits <b class="sn-dyn">f</b>`;
        $('stSoundDots').innerHTML = Array.from({length: N}, (_, k) => `<i class="${k < list.length ? 'on' : ''}"></i>`).join('');
      }
      SC.draw = draw;
      $('stSoundSkip').onclick = () => closeSC(false);
    }
    function scHit(level) {
      if (!SC || level == null) return;
      const N = R.dyn.hits, list = SC[SC.step];
      list.push(level); SC.draw();
      if (list.length < N) return;
      if (SC.step === 'soft') { SC.step = 'loud'; $('stSoundSay').textContent = ''; SC.draw(); return; }
      const med = a => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
      const soft = med(SC.soft), loud = med(SC.loud);
      SC.result = {soft, loud, ok: loud >= soft * R.dyn.minRatio};
      if (!SC.result.ok) {
        $('stSoundSay').textContent = 'Make the soft hits softer and the loud hits louder. Let\'s try again!';
        SC.step = 'soft'; SC.soft = []; SC.loud = []; SC.draw(); return;
      }
      gd.snareDyn = {soft: +soft.toFixed(4), loud: +loud.toFixed(4), split: +Math.sqrt(soft * loud).toFixed(4), at: Date.now()};
      api.save();
      $('stSoundSay').textContent = 'All set! Soft and loud are ready.';
      setTimeout(() => closeSC(true), 900);
    }
    function closeSC(ok) {
      if (!SC) return;
      const d = SC.done; if (SC.sub) SC.sub.stop();
      SC = null; $('stSound').hidden = true; $('stSoundSay').textContent = '';
      A.Pitch.pauseListening(true); A.Sfx.gameMenuMusic('showtime-malfunction');
      if (d) d(ok);
    }
    /** before a showtime: the soundcheck first when this showtime has soft and loud machines and none is saved */
    function before(n, go) {
      if (n >= R.dyn.from && !gd.snareDyn) soundcheck(ok => { if (ok) go(); });
      else go();
    }

    /* ---------- hearing: the microphone's onsets, and ?demo's keys ---------- */
    if (A.Onsets) A.Onsets.listen(o => hit(o));
    if (A.DEMO) addEventListener('keydown', e => {
      if (e.key !== ' ' || e.repeat || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      if (SC) { e.preventDefault(); A.Onsets.fake(performance.now(), SC.step === 'soft' ? R.demo.soft : R.demo.loud); return; }
      if (!H || !G() || !$('stCal').hidden) return;
      e.preventDefault();
      A.Onsets.fake(performance.now(), e.shiftKey ? R.demo.soft : wantLevel());
    });
    /** ?demo Space: the loudness the target wants (p soft, f loud, an accent's note loud) */
    function wantLevel() {
      const t = api.target(), J = t && t.job, sp = split() || .15;
      if (!J) return R.demo.level;
      if (J.type === 'p') return Math.min(R.demo.soft, sp * .6);
      if (J.type === 'f') return Math.max(R.demo.loud, sp * 1.6);
      if (J.type === 'accent' && J.start != null) {
        const k = J.k, S0 = mStart(J, k), e8 = beatS(J.bpmNow) / 2, i = Math.max(0, Math.min(7, Math.round((H.clk + (performance.now() - H.tPerf) / 1000 - S0) / e8)));
        return J.list[J.idx].accents[i] ? Math.max(R.demo.loud, sp * 1.6) : Math.min(R.demo.soft, sp * .6);
      }
      return R.demo.level;
    }

    /* ---------- tests ---------- */
    function state() {
      if (!H) return ended;
      if (!G()) return {gt: H.clk, lag: H.lag, log: H.log.slice(), last: H.last, target: null, over: true};   // the show just ended
      const t = api.target(), J = t && t.job;
      return {gt: H.clk, lag: H.lag, gapUntil: H.gapUntil, confirm: H.confirm ? {id: H.confirm.b.id, until: H.confirm.until} : null,
        freeze: H.freeze ? {id: H.freeze.b.id, from: H.freeze.from, until: H.freeze.until, beats: H.freeze.beats} : null, walkMul: walkMul(),
        pulse: Object.assign({}, H.pulse), log: H.log.slice(), last: H.last, split: split(), trail: (H.trail || []).slice(), stillNow: !!H.stillNow,
        hits: H.hits.slice(-12).map(h => ({gt: +h.gt.toFixed(3), p: Math.round(h.p), level: h.level})), now: Math.round(performance.now()),
        target: t ? {id: t.id, left: t.left, total: t.total, z: t.z, walk: t.walk, freezeAt: t.freezeAt, froze: !!t.froze, cresc: !!t.cresc, holdP: t.holdP, rollCv: t.rollCv, phase: t.phase,
          job: J ? {type: J.type, bpm: J.bpmNow || J.bpm, measures: J.measures, passed: J.passed, k: J.k, idx: J.idx, W: J.W, fill: J.fill, start: J.start,
            text: J.list ? J.list[J.idx].text : null, accents: J.list && J.list[J.idx].accents || null, marks: J.marks || null} : null} : null};
    }
    /** perf ms for a game time (for tests firing hits at exact moments: add the timing check's lag, it's taken off) */
    function plan() {
      const t = H && G() && api.target(), J = t && t.job; if (!H || !J || J.start == null) return null;
      const b = beatS(J.bpmNow), item = J.list ? J.list[J.idx] : null;
      const onsets = item ? C.attacks(C.groups(C.parse(item.text, '4/4'))).map(a => a.t * b / 12) : [];
      return {start: J.start, beatS: b, measureS: 4 * b, k: J.k, measureStart: mStart(J, J.k), measureStartPerf: perfAt(mStart(J, J.k)) + H.lag,
        onsets, perfOf: onsets.map(o => perfAt(mStart(J, J.k) + o) + H.lag), countInPerf: perfAt(J.start) + H.lag, lag: H.lag, W: J.W};
    }
    const walkMul = () => H && H.freeze ? R.freeze.walkMul : 1;

    return {start, stop, job, onTarget, tick, still, walkMul, roll, sign, panel, prompt, filesHTML, card, before, soundcheck, timing, state, plan,
      hit, DRUM, DRUM_IDS, pools: POOLS, forced: () => !!FORCED, perfAt: t => H ? perfAt(t) + H.lag : null};
  }

  A.ShowtimeSnare = {create, DRUM, DRUM_IDS, POOLS, poolFor};
})(window.Arcade);
