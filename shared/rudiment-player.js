/* THE RUDIMENT PLAYER: plays a rudiment written in the rhythm text format (shared/counting.js: sticking, accents, grace
   notes, rolls, buzzes) in time, with Mr. Graham's snare recordings, and lights each stroke as it SOUNDS.
   Loaded only by pages that use it (the Sound Board's RUDIMENT PLAYER; the Rudiment Trainer). No DOM, apart from light().
   It NEVER uses the microphone and plays only UNPITCHED drum sounds (like the metronome's click); it refuses to start
   while a microphone listens (Pitch.listening()). Full doc: docs/engine/rudiment-player.md.

     Arcade.RudimentPlayer.plan(parsed, opts) -> [{time, kind, gain, n, s, rep, hand, …}] (pure, no audio; + .bpmAt(time),
         .gridS, .endS, .patternS, .beatS, .beats)
       opts: bpm (default 80) counting `beat` ticks (default a quarter = 12; 6/8: a dotted quarter = 18) · reps (1;
             Infinity = until `untilS`, 60 s) · countOff (true) · click (false) · ramp {from, to, upS, holdS, downS} ·
             buzzLenS (the buzz file's length, RULES.buzzLenS until it is decoded)
     Arcade.RudimentPlayer.create({parsed, bpm, beat, reps, countOff, click, ramp, onStroke, onBeat, onEnd})
         -> {start() (a Promise: false = refused), stop(), setBpm(bpm), setClick(on), playing(), state()}
     Arcade.RudimentPlayer.light(svgRoot, engraved) -> an onStroke handler that puts `rp-now` on the sounding head
     Arcade.RudimentPlayer.RULES, GAIN, HIT_OFFSET_S, SOUNDS */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';

  /* Every recording's hit starts exactly 10 ms into its file (Mr. Graham trimmed them so): each buffer starts this much
     BEFORE its stroke's time, so the hit lands on the beat. */
  const HIT_OFFSET_S = 0.010;

  /* ===== THE TIMING RULES (Mr. Graham tunes these by ear on the Sound Board's RUDIMENT PLAYER) ===== */
  const RULES = {
    flamMs: 30,             // a flam: how far before the main stroke its grace lands (smaller = a tighter flam)
    dragGapMs: 45,          // a drag: the space between its two graces, and from the second grace to the main stroke
    graceMaxFrac: .35,      // at fast tempos graces move closer: never further before their note than this share of the
                            // time since the stroke before (so a grace never lands on or before that stroke)
    buzzLenS: .30,          // the buzz file's length, until it is decoded (then its real length)
    buzzOverlapMs: 60,      // a buzz note longer than the file minus this gets more copies (so a slow roll never gaps)
    buzzStepMs: 220,        // … one copy every this many ms, until the note ends
    buzzTailGain: .8,       // … each copy this loud (1 = as loud as the first)
    lookaheadS: .15,        // sounds are scheduled this far ahead on the audio clock
    tickMs: 25,             // how often the scheduler looks ahead
    startS: .15,            // the first sound comes this long after START
  };
  /* ===== THE LEVELS (relative; 1 = the file as recorded × its sounds.js vol). The files already carry the dynamics: the
     accent is about 8.5 dB above a stroke, the grace about 9 dB below. ===== */
  const GAIN = {
    stroke: 1,              // a normal stroke (rudiment-stroke)
    accent: 1,              // an accented stroke (rudiment-accent: louder on its own)
    grace: 1,               // a grace note (rudiment-grace: softer on its own)
    buzz: 1,                // a buzz stroke (rudiment-buzz)
    click: .55,             // the count-off and click-track clicks (rudiment-click)
    clickBeat: .8,          // the count-off's first click, and the downbeat of every measure on the click track
  };
  /* the five sounds (sounds.js, screen 'rudiments'), by kind */
  const SOUNDS = {stroke: 'rudiment-stroke', accent: 'rudiment-accent', grace: 'rudiment-grace', buzz: 'rudiment-buzz', click: 'rudiment-click'};
  /* the fallback when a file is missing or not decoded yet: music-highway/backing.js's kit (snare velocities) */
  const KIT = {stroke: .65, accent: 1, grace: .25, buzz: {hits: 4, gapMs: 22, v: .3}};

  /* ================= THE PLAN (pure: data in, data out) ================= */
  function setup(parsed, o) {
    const M = parsed.meter, beatTicks = o.beat || (M.compound ? 18 : 12);
    const barBeats = M.per / beatTicks, patTicks = parsed.total, strokes = A.Counting.strokes(parsed);
    const coBeats = o.countOff === false ? 0 : Math.round(barBeats * (barBeats < 3 ? 2 : 1));
    return {M, beatTicks, barBeats, patTicks, patBeats: patTicks / beatTicks, strokes, mains: strokes.filter(s => !s.grace),
      coBeats, click: !!o.click, buzzLenS: o.buzzLenS || RULES.buzzLenS};
  }
  const kindOf = st => st.grace ? 'grace' : st.accent ? 'accent' : st.buzz ? 'buzz' : 'stroke';

  /** one repetition: T(tick within the pattern) -> seconds (ticks to seconds by DIVISION only: a written-out roll's second
      stroke is at a fractional tick); prevTime = the last stroke of the repetition before (its graces' room), if any */
  function repPlan(parsed, C, T, rep, prevTime) {
    const out = [], mains = C.mains;
    if (!mains.length) return out;
    let prev = prevTime != null ? prevTime : T(mains[mains.length - 1].t) - (T(C.patTicks) - T(0));   // cyclic: the pattern's own end
    const graces = {};
    C.strokes.forEach(st => { if (st.grace) (graces[st.n] = graces[st.n] || []).push(st); });
    mains.forEach(st => {
      const time = T(st.t), kind = st.s === 0 ? kindOf(st) : 'stroke';
      const g = st.s === 0 ? graces[st.n] : null;
      if (g && g.length) {
        // one grace: flamMs before; two or more: dragGapMs apart, the last dragGapMs before the note
        const leads = g.length === 1 ? [RULES.flamMs / 1000] : g.map((x, j) => (g.length - j) * RULES.dragGapMs / 1000);
        const room = RULES.graceMaxFrac * (time - prev), k = Math.max(...leads) > room ? room / Math.max(...leads) : 1;
        g.forEach((x, j) => out.push({time: time - leads[j] * k, kind: 'grace', gain: GAIN.grace, n: x.n, s: x.s, rep, hand: x.hand}));
      }
      out.push({time, kind, gain: GAIN[kind], n: st.n, s: st.s, rep, hand: st.hand});
      if (st.buzz) {                                         // a buzz rings for its whole written value: more copies if needed
        const note = parsed.notes[st.n], dur = T(note.t + note.d) - time, step = RULES.buzzStepMs / 1000;
        for (let c = 1; c * step < dur - (C.buzzLenS - RULES.buzzOverlapMs / 1000) - 1e-9; c++)
          out.push({time: time + c * step, kind: 'buzz', gain: GAIN.buzz * RULES.buzzTailGain, n: st.n, s: 0, rep, hand: st.hand, copy: c});
      }
      prev = time;
    });
    if (C.click) for (let b = 0; b < Math.round(C.patBeats); b++) {
      const down = b % Math.round(C.barBeats) === 0;
      out.push({time: T(b * C.beatTicks), kind: 'click', gain: down ? GAIN.clickBeat : GAIN.click, n: null, s: null, rep, hand: null, beat: b, down, track: true});
    }
    return out;
  }

  /* OPEN–CLOSE–OPEN: the tempo rises linearly from `from` to `to` over upS, holds holdS, falls back over downS (then
     stays at `from`). beatsAt(τ) integrates it; tauAt(beats) inverts it, so every stroke's spacing follows the tempo of
     its own moment (smooth, never in jumps). */
  function rampMath(r) {
    const b0 = r.from, b1 = r.to, u = Math.max(0, r.upS || 0), h = Math.max(0, r.holdS || 0), d = Math.max(0, r.downS || 0);
    // segments: [start τ, length, start bpm, slope bpm/s]
    const segs = [[0, u, b0, u ? (b1 - b0) / u : 0], [u, h, b1, 0], [u + h, d, b1, d ? -(b1 - b0) / d : 0], [u + h + d, Infinity, b0, 0]];
    let acc = 0; segs.forEach(s => { s[4] = acc; if (isFinite(s[1])) acc += (s[2] * s[1] + s[3] * s[1] * s[1] / 2) / 60; });
    const bpmAt = tau => { const s = segs.find(x => tau < x[0] + x[1]) || segs[3]; return s[2] + s[3] * (tau - s[0]); };
    const beatsAt = tau => { const s = segs.find(x => tau < x[0] + x[1]) || segs[3], x = tau - s[0]; return s[4] + (s[2] * x + s[3] * x * x / 2) / 60; };
    const tauAt = beats => {
      const s = segs.find(x => !isFinite(x[1]) || beats < x[4] + (x[2] * x[1] + x[3] * x[1] * x[1] / 2) / 60);
      const c = (beats - s[4]) * 60, a = s[3] / 2, b = s[2];   // a x² + b x = c, the stable root
      return s[0] + (c <= 0 ? 0 : 2 * c / (b + Math.sqrt(Math.max(0, b * b + 4 * a * c))));
    };
    return {bpmAt, beatsAt, tauAt, endTau: u + h + d};
  }

  function plan(parsed, o = {}) {
    const C = setup(parsed, o), bpm = o.ramp ? o.ramp.from : (o.bpm || 80), beatS0 = 60 / bpm;
    let out = [], G = C.coBeats * beatS0, reps, T, bpmAt;
    const R = o.ramp ? rampMath(o.ramp) : null;
    const mk = g => R ? (rep => x => g + R.tauAt((rep * C.patTicks + x) / C.beatTicks)) : (rep => x => g + (rep * C.patTicks + x) / C.beatTicks * 60 / bpm);
    if (R) reps = Math.max(1, Math.ceil(R.beatsAt(R.endTau) / C.patBeats - 1e-9));
    else reps = o.reps == null ? 1 : o.reps;
    // no count-off: the pattern's start shifts so nothing is before 0 (the first note's graces)
    if (!C.coBeats) { const first = repPlan(parsed, C, mk(0)(0), 0, null); const lo = Math.min(0, ...first.map(e => e.time)); G = -lo; }
    T = mk(G);
    bpmAt = R ? (t => t < G ? bpm : R.bpmAt(t - G)) : (() => bpm);
    for (let k = 0; k < C.coBeats; k++) out.push({time: k * beatS0, kind: 'click', gain: k === 0 ? GAIN.clickBeat : GAIN.click, n: null, s: null, rep: -1, hand: null, beat: k, down: k === 0, countOff: true});
    const until = o.untilS || 60;
    let prev = null;
    for (let r = 0; r < reps; r++) {
      const Tr = T(r);
      if (!isFinite(reps) && Tr(0) >= until) break;
      const ev = repPlan(parsed, C, Tr, r, prev);
      const last = ev.filter(e => e.kind !== 'click' && e.kind !== 'grace' && !e.copy).pop();
      if (last) prev = last.time;
      out = out.concat(ev);
    }
    out.sort((a, b) => a.time - b.time);
    const endRep = isFinite(reps) ? reps : out.length ? out[out.length - 1].rep + 1 : 0;
    out.bpmAt = bpmAt; out.gridS = G; out.endS = T(endRep)(0); out.patternS = C.patBeats * beatS0; out.beatS = beatS0;
    out.beats = C; out.reps = endRep;
    return out;
  }

  /* ================= THE LIVE PLAYER ================= */
  function create(opts) {
    const P = opts.parsed;
    let running = false, clk = null, ctx = null, out = null, kit = null, bus = null, timer = 0, raf = 0, bufs = {}, ended = false;
    let queue = [], vis = [], nodes = [], log = [], bpm = opts.bpm || 80, pendBpm = null, clickOn = !!opts.click, pendClick = null;
    let gen = null, endS = 0, rampAt = null;                                // the next repetition to plan: {rep, start, prev}; when the run ends
    const C = setup(P, Object.assign({}, opts, {click: true}));
    const ramp = !!opts.ramp, reps = ramp ? null : (opts.reps == null ? Infinity : opts.reps);
    const clickOf = {};                                      // rep -> the click setting it was planned with

    function loadBuffers() {
      if (opts.buffers) { bufs = Object.assign({}, opts.buffers); return Promise.resolve(); }
      if (!A.Sfx || !A.Sfx.buffer) return Promise.resolve();
      return Promise.all(Object.entries(SOUNDS).map(([k, name]) => Promise.resolve(A.Sfx.buffer(name)).then(b => { if (b) bufs[k] = b; }, () => {})));
    }
    const vol = kind => { const e = A.Sounds && A.Sounds.get(SOUNDS[kind]); return e && e.vol != null ? e.vol : 1; };

    /* plan the next repetition at the tempo (and click) in force now: changes land on a repetition's start */
    function more(horizon) {
      while (gen && (!isFinite(reps) || gen.rep < reps) && gen.start < horizon + .4) {
        if (pendBpm != null) { bpm = pendBpm; pendBpm = null; }
        if (pendClick != null) { clickOn = pendClick; pendClick = null; }
        const r = gen.rep, start = gen.start, b = bpm, T = x => start + x / C.beatTicks * 60 / b;
        clickOf[r] = clickOn;
        const ev = repPlan(P, C, T, r, gen.prev).map(e => Object.assign(e, {bpm: b}));   // the tempo this repetition plays at
        const last = ev.filter(e => e.kind !== 'click' && e.kind !== 'grace' && !e.copy).pop();
        queue = queue.concat(ev).sort((x, y) => x.time - y.time);
        gen = {rep: r + 1, start: T(C.patTicks), prev: last ? last.time : gen.prev};
        endS = gen.start;
      }
    }
    function play(e) {
      const sounded = e.kind !== 'click' || !e.track || (clickOf[e.rep] != null ? clickOf[e.rep] : clickOn);
      vis.push(Object.assign({}, e, {sounded}));
      if (!sounded || !ctx) return;
      const base = e.kind === 'click' ? 'click' : e.kind, buf = bufs[base], now = ctx.currentTime;
      if (buf) {
        const at = e.time - HIT_OFFSET_S;
        if (at < now) { log.push({time: e.time, kind: e.kind, skipped: true}); return; }   // NOTHING PLAYS LATE
        const src = ctx.createBufferSource(), g = ctx.createGain(), gain = e.gain * vol(base);
        src.buffer = buf; g.gain.value = gain; src.connect(g); g.connect(bus); src.start(at);
        const nd = {src, g, at}; nodes.push(nd); src.onended = () => { const i = nodes.indexOf(nd); if (i >= 0) nodes.splice(i, 1); };
        log.push({time: e.time, start: at, kind: e.kind, file: SOUNDS[base], gain, n: e.n, s: e.s, rep: e.rep});
      } else {
        if (e.time < now) { log.push({time: e.time, kind: e.kind, skipped: true}); return; }
        if (!kit) kit = A.MHBacking.create(ctx, bus);
        if (base === 'click') kit.click(e.time, e.gain, !!e.down);
        else if (base === 'buzz') for (let h = 0; h < KIT.buzz.hits; h++) kit.snare(e.time + h * KIT.buzz.gapMs / 1000, KIT.buzz.v * e.gain);
        else kit.snare(e.time, KIT[base] * e.gain);
        log.push({time: e.time, start: e.time, kind: e.kind, file: 'kit', gain: e.gain, n: e.n, s: e.s, rep: e.rep});
      }
      if (log.length > 2000) log.splice(0, 500);
    }
    function schedule() {
      if (!running) return;
      const horizon = clk.now() + RULES.lookaheadS;
      if (!ramp) more(horizon);
      while (queue.length && queue[0].time < horizon) play(queue.shift());
    }
    function frame() {
      if (!running) return;
      clk.sample();
      let now = clk.audAt(performance.now());
      // a device whose output timestamp is nonsense (no audio device: a test machine) never lights anything: the audible
      // time is never more than a second from the context's own clock
      if (ctx && clk.ctx === ctx && Math.abs(now - ctx.currentTime) > 1) now = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      while (vis.length && vis[0].time <= now) {
        const e = vis.shift();
        try {
          if (e.kind === 'click') { if (opts.onBeat) opts.onBeat(e); }
          else if (!e.copy && opts.onStroke) opts.onStroke(e);
        } catch (err) { setTimeout(() => { throw err; }); }
      }
      if (!queue.length && !vis.length && (ramp || isFinite(reps)) && !moreToPlan() && now >= endS) { finish(false); return; }
      raf = requestAnimationFrame(frame);
    }
    const moreToPlan = () => !ramp && gen && isFinite(reps) && gen.rep < reps;

    const onHide = () => { if (document.hidden) stop(); };
    const onState = () => { if (ctx && ctx.state !== 'running') stop(); };
    function finish(cut) {
      if (!running) return;
      running = false; clearInterval(timer); timer = 0; cancelAnimationFrame(raf); raf = 0;
      document.removeEventListener('visibilitychange', onHide); removeEventListener('pagehide', stop);
      if (ctx) ctx.removeEventListener('statechange', onState);
      if (cut && ctx) {                                     // everything scheduled or ringing fades over 20 ms (never a click)
        const now = ctx.currentTime;
        nodes.forEach(({src, g}) => { try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + .02); src.stop(now + .03); } catch (e) { /* already stopped */ } });
        nodes = [];
        if (kit) { const k = kit; k.fade(.02); setTimeout(() => k.stopAll(), 40); }
      }
      kit = null; queue = []; vis = [];
      if (!ended) { ended = true; if (opts.onEnd) try { opts.onEnd({stopped: !!cut}); } catch (e) { setTimeout(() => { throw e; }); } }
    }
    // stop() while start() is still waiting (the audio unlocking, the files loading) cancels that start: it never plays
    let starting = 0, startId = 0;
    function stop() {
      if (starting && !running) { starting = 0; startId++; if (!ended) { ended = true; if (opts.onEnd) try { opts.onEnd({stopped: true}); } catch (e) { setTimeout(() => { throw e; }); } } return; }
      finish(true);
    }

    async function start() {
      if (running || starting) stop();
      if (A.Pitch && A.Pitch.listening && A.Pitch.listening()) return false;   // never while a microphone listens
      ended = false;
      const my = ++startId; starting = my;
      const cancelled = () => startId !== my;
      if (!opts.audio) for (let i = 0; i < 8 && !(A.Sfx && A.Sfx.output && A.Sfx.output()); i++) await new Promise(r => setTimeout(r, 40));   // the tap is unlocking the audio
      if (cancelled()) return false;
      const o = opts.audio || (A.Sfx && A.Sfx.output && A.Sfx.output());
      ctx = o ? o.ctx : null; out = o ? o.out : null;
      if (ctx) { bus = ctx.createGain(); bus.gain.value = 1; bus.connect(out); }
      await Promise.race([loadBuffers(), new Promise(r => setTimeout(r, 1500))]);
      if (cancelled()) return false;
      starting = 0;
      if (A.Pitch && A.Pitch.listening && A.Pitch.listening()) return false;
      clk = opts.clock || (A.AudioClock ? A.AudioClock.create().start() : null);
      if (clk && ctx && clk.ctx !== ctx && !opts.clock) { clk.ctx = ctx; clk.off = null; clk.sample(); }   // opts.audio: its own output's clock
      if (!clk || !ctx) {                                    // sound off: the strokes still light, on performance.now()
        const p0 = performance.now(); clk = {now: () => (performance.now() - p0) / 1000, audAt: p => (p - p0) / 1000, sample() {}};
      }
      const t0 = clk.now() + RULES.startS;
      log = []; nodes = []; queue = []; vis = [];
      const buzzLenS = bufs.buzz ? bufs.buzz.duration : RULES.buzzLenS;
      C.buzzLenS = buzzLenS;
      if (ramp) {
        const pl = plan(P, {ramp: opts.ramp, beat: opts.beat, countOff: opts.countOff, click: true, buzzLenS});
        queue = pl.map(e => Object.assign({}, e, {time: e.time + t0, bpm: Math.round(pl.bpmAt(e.time))}));
        for (let r = -1; r < pl.reps; r++) clickOf[r] = clickOn;
        endS = t0 + pl.endS; gen = null; rampAt = t => pl.bpmAt(t - t0);
      } else {
        const co = plan(P, {bpm, beat: opts.beat, countOff: opts.countOff, reps: 1, buzzLenS});
        queue = co.filter(e => e.countOff).map(e => Object.assign({}, e, {time: e.time + t0}));
        gen = {rep: 0, start: t0 + co.gridS, prev: null};
      }
      running = true;
      document.addEventListener('visibilitychange', onHide); addEventListener('pagehide', stop);
      if (ctx) ctx.addEventListener('statechange', onState);
      schedule();
      timer = setInterval(schedule, RULES.tickMs);
      raf = requestAnimationFrame(frame);
      return true;
    }

    return {
      start, stop,
      /** a new tempo from the next repetition's start (ignored during a ramp) */
      setBpm(b) { if (!ramp && b > 0) { if (running) pendBpm = b; else bpm = b; } },
      /** the click track on/off from the next repetition's start */
      setClick(on) { if (running) pendClick = !!on; else clickOn = !!on; },
      playing: () => running,
      state: () => ({playing: running, bpm, click: clickOn, pendBpm, pendClick, rep: gen ? gen.rep - 1 : null, queued: queue.length,
        sources: nodes.length, log: log.slice(), endS, now: clk ? clk.now() : null, kit: !!kit,
        /** the arcade's audio is really running (not sound off, not suspended): the practice-time log counts only then */
        audio: !!ctx && ctx.state === 'running',
        /** the tempo heard now (a ramp's readout) */
        bpmNow: rampAt && clk ? Math.round(rampAt(clk.audAt(performance.now()))) : bpm}),
    };
  }

  /* ================= THE HIGHLIGHT ================= */
  /** onStroke handler: `rp-now` on the drawn head of the sounding stroke (and its sticking letter), off the last one.
      Slash view: a roll's second stroke has no head of its own, so its note stays lit; written-out view: each stroke
      lights its own head. Graces light their grace group and their small letter. */
  function light(root, engraved) {
    let lit = [];
    const has = (n, s) => (engraved.strokes || []).some(x => x.n === n && x.s === s);
    const h = e => {
      lit.forEach(el => el.classList.remove('rp-now')); lit = [];
      if (!e || e.n == null) return;
      const n = e.n, s = has(e.n, e.s) ? e.s : 0, add = el => { if (el) { el.classList.add('rp-now'); lit.push(el); } };
      if (s < 0) add(root.querySelector(`g.rs-grace[data-n="${n}"]`));
      else add(root.querySelector(`g.rn[data-n="${n}"][data-s="${s}"]`) || root.querySelector(`g.rn[data-n="${n}"]:not([data-s])`));
      add(root.querySelector(`text.rs-hand[data-n="${n}"][data-s="${s}"]`));
    };
    h.clear = () => h(null);
    return h;
  }

  A.RudimentPlayer = {plan, create, light, rampMath, RULES, GAIN, HIT_OFFSET_S, SOUNDS, KIT};
})(window.Arcade);
