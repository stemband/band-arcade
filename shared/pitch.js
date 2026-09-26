/* Band Arcade — microphone + pitch detection engine.
   Games never touch the microphone directly. They:
     1. call Arcade.Pitch.setInstrument(inst)
     2. call Arcade.requireMic(startFn) from a button tap (see mic-gate.js)
     3. subscribe with Arcade.Pitch.onFrame(fn) and/or Arcade.Pitch.onHeld(fn)

   onFrame(reading, level, now)  runs ~25×/second.
       reading = null (nothing clear) or {freq, midi, note, pc, cents}
       pc is the CONCERT pitch class 0–11; use inst.writtenName(pc) for display.
       note is the rounded SOUNDING midi note (exact octave; see setRange for octave fixing).
   onHeld(pc, now, note)  fires once when a note has been held for holdMs.
       A new onHeld needs a new attack (a short gap) or a different note.

   Full range (Note Checker, and games with a scale or Chromatic NOTES pool): setRange(lowMidi, highMidi) with a member's SOUNDING range
   (instruments.js) widens the search to that range and makes it octave-exact:
     - a new note is a new held note even if it has the same letter (D4 then D5 fires twice)
     - a reading outside the range whose octave above/below is inside is reported in that octave
       (built-in mics often hear low brass an octave off); reading.folded says by how much
   setRange(null) goes back to the default (the group's first-five range, letter names only).
   Games call it for scale and chromatic pools (ModePicker.useRange, shared/mode-picker.js); with First 5 they behave exactly as before.
*/
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const {mod12, mtof} = A.music;

  const P = A.Pitch = {
    active: false,     // true once the mic is running
    demoReady: false,  // true in ?demo mode when the mic could not start
    holdMs: 280,       // how long a note must sound to count
    reading: null,
    level: 0,
    gate: 0.01,        // minimum loudness (RMS) before we try to detect a pitch
  };

  let mic = null, inst = null, range = null;
  const frameFns = [], heldFns = [];
  const H = {pc: null, note: null, since: 0, last: 0, fired: false};   // hold tracker

  P.setInstrument = i => { inst = i; sizeEnvelope(); };
  P.setRange = function (lowMidi, highMidi) {
    range = lowMidi == null ? null : {lo: lowMidi, hi: highMidi, minF: mtof(lowMidi) * 0.78, maxF: Math.min(7000, mtof(highMidi) * 2.3)};
    sizeEnvelope();
    H.pc = H.note = null; H.fired = false;
  };
  P.instrument = () => inst;                  // read-only: the group being listened for, and the range (null = default)
  P.range = () => range;
  P.demoNote = null;   // ?demo: a SOUNDING midi note the page wants "played" right now (Note Checker full range)
  P.demoJitter = 0.2;  // ?demo: how much a demoNote wobbles, in semitones (0.2 = ±10 cents; Sustain Speedway's "perfect" note uses less)
  P.onFrame = fn => frameFns.push(fn);
  P.onHeld  = fn => heldFns.push(fn);
  /** treat whatever is sounding right now as already counted (use when a new target appears) */
  P.ignoreCurrent = () => { H.fired = true; };
  /** SOUND AND THE MICROPHONE: hear nothing for ms (a sound is playing through the speaker), then ignore whatever
      is still sounding, so only a fresh note (a new attack or a different pitch) can count afterwards.
      shared/sfx.js calls it for EVERY sound played while listening (the sound's length + 250 ms of room echo).
      Meanwhile onHeld never fires, onFrame gets reading = null, and games pause their timers: they check
      P.isSuppressed(now) each frame (Ghost Notes, Note Storm), or wait for P.suppressedUntil (Neon Face-Off). */
  P.suppressedUntil = 0;
  P.suppress = ms => { P.suppressedUntil = Math.max(P.suppressedUntil, performance.now() + ms); H.fired = true; };
  P.isSuppressed = (t = performance.now()) => t < P.suppressedUntil;
  /** true while a game is listening (the mic is running, or ?demo is standing in for it) */
  P.listening = () => (P.active || P.demoReady) && !P.paused;
  /** PAUSE LISTENING between challenges (Arcade Quest: the mic only listens while the student plays). While paused
      nothing is analysed: onFrame gets null, no holds, no attacks, and listening() is false, so sounds play without
      muting anything. The microphone stays open, so listening resumes at once (no new permission tap). */
  P.paused = false;
  P.pauseListening = on => {
    P.paused = !!on;
    if (!on) { H.pc = H.note = null; H.fired = true; if (env) env.hist.length = 0; }   // start fresh: only a new note counts
  };
  P.heldPc = () => H.pc;

  /* sensitivity slider 0–100 -> loudness gate. 0 ignores quiet sounds, 100 hears almost anything */
  P.gateFromSens = v => 0.05 * Math.pow(0.04, v / 100);
  P.setSensitivity = v => { P.gate = P.gateFromSens(v); };
  P.setSensitivity(A.store ? A.store.sens : 50);

  /** Start the microphone. Must be called from a tap/click (iPad requires it). Throws {name} on failure. */
  P.start = async function () {
    if (P.active) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !AC) {
      throw {name: 'Insecure'};
    }
    const ctx = new AC();
    if (ctx.resume) ctx.resume();                  // inside the tap, so iPad Safari allows audio
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // browsers' voice-call processing mangles instrument tone; turn it all off
        audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false}
      });
      if (ctx.state === 'suspended') await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 4096;               // ~85 ms window: enough for tuba low B♭
      an.smoothingTimeConstant = 0;
      src.connect(an);                 // not connected to the speakers
      mic = {ctx, an, stream, src, buf: new Float32Array(an.fftSize), sr: ctx.sampleRate};
      P.active = true;
      if (attackFns.length) startEnvelope();
    } catch (e) {
      try { ctx.close(); } catch (_) {}
      throw e;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && mic && mic.ctx.state === 'suspended') mic.ctx.resume();
  });

  /* ---------- YIN pitch detection on the newest part of the buffer ---------- */
  let yin = new Float32Array(2100);
  function detect(buf, sr, minF, maxF) {
    const n = buf.length;
    let rms = 0; for (let i = 0; i < n; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / n);
    const maxTau = Math.min(Math.floor(sr / minF), Math.floor(n / 2) - 2);
    const minTau = Math.max(2, Math.floor(sr / maxF));
    const W = Math.min(n - maxTau - 1, Math.max(maxTau, 600));
    const off = n - (W + maxTau + 1);
    if (yin.length < maxTau + 2) yin = new Float32Array(maxTau + 2);
    const d = yin; d[0] = 1; let run = 0;
    for (let tau = 1; tau <= maxTau; tau++) {
      let s = 0;
      for (let j = off; j < off + W; j++) { const x = buf[j] - buf[j + tau]; s += x * x; }
      run += s; d[tau] = run > 0 ? s * tau / run : 1;
    }
    let tau = -1;
    for (let t = minTau; t <= maxTau; t++) {
      if (d[t] < 0.15) { while (t + 1 <= maxTau && d[t + 1] < d[t]) t++; tau = t; break; }
    }
    if (tau < 0) {
      let best = 1, bt = -1;
      for (let t = minTau; t <= maxTau; t++) if (d[t] < best) { best = d[t]; bt = t; }
      if (best < 0.22) tau = bt;
    }
    if (tau < 0) return {rms, freq: 0, clarity: 0};
    let bt = tau;
    if (tau > 1 && tau < maxTau) {
      const a = d[tau - 1], b = d[tau], c = d[tau + 1], den = a + c - 2 * b;
      if (den) bt = tau + (a - c) / (2 * den);
    }
    return {rms, freq: sr / bt, clarity: 1 - d[tau]};
  }

  /* Low ranges (full-range tuba, bassoon, trombone…) need long lags, and YIN's cost grows with lag².
     Averaging k samples first (sample rate / k) keeps the cost about the same as a game's range.
     Only used with setRange; k keeps the new Nyquist at least 4× the highest pitch searched. */
  let dec = new Float32Array(0);
  function decimate(buf, k) {
    const m = Math.floor(buf.length / k);
    if (dec.length !== m) dec = new Float32Array(m);
    for (let i = 0, j = 0; i < m; i++) { let s = 0; for (let q = 0; q < k; q++) s += buf[j++]; dec[i] = s / k; }
    return dec;
  }
  P._detect = detect; P._decimate = decimate;   // for tests only

  /* ---------- demo keys (?demo): hold 1–5 to "play" the five notes ---------- */
  let demoKey = null;
  if (A.DEMO) {
    addEventListener('keydown', e => { if (/^[1-5]$/.test(e.key)) demoKey = +e.key - 1; });
    addEventListener('keyup',   e => { if (/^[1-5]$/.test(e.key)) demoKey = null; });
  }

  /* ---------- ATTACK DETECTION (opt-in: only pages that call onAttack pay for it) ----------
     onAttack(fn): fn({time, pc, midi}) once per new articulation: a tongued note, a new mallet strike, a drum hit.
     A small separate analyser is read every ENV.every ms (5 ms for short windows). Its window follows the instrument:
     ENV.periods cycles of its lowest note (a power of two, ENV.minWin–ENV.maxWin samples): long enough that a tuba's
     slow wave doesn't ripple, short enough that a bell's mallet click stands out (bells 256, trumpet 512, tuba 2048). An attack is a sharp RISE of that loudness envelope after a dip, not a start from silence:
       loud enough (ENV.gateK × the sensitivity gate), rising, and either ENV.rise × the quietest point of the last
       ENV.dipMs (tonguing with a 40 ms gap, a snare hit), or ENV.jump × the level ENV.jumpMs ago AND ENV.above × the
       loudest point 40–120 ms ago (a bell struck again while it still rings: it climbs ABOVE its decaying ring).
       A slur (new pitch, no new attack) doesn't rise, and a slur's little dip only comes back to the same level,
       so neither fires. Mat can tune these numbers with the Note Checker's ARTICULATION test.
     After an attack nothing fires for ENV.refractoryMs (no double counts from one attack, bell shimmer, brass blips).
     Its pitch: the stable reading (two agreeing detector frames) from ENV.pitchFrom to ENV.pitchBy ms after the
     attack; none = pc null (a drum). Nothing counts while a sound plays (suppress), like every other detection.
     ?demo on a page that uses attacks: tap Space (or T) = an attack on P.demoTarget() (the right note), tap W = an attack
     on a wrong note, hold S = a steady note with no new attacks. */
  const ENV = {periods: 1.5, minWin: 256, maxWin: 2048, every: 8, gateK: 1.2, rise: 2.2, dipMs: 70, jump: 1.35, jumpMs: 24, above: 1.25, refractoryMs: 90, pitchFrom: 50, pitchBy: 170};
  P.ENV = ENV;
  const attackFns = [], pend = [];
  let env = null, lastAttack = -1e9;
  P.onAttack = fn => { attackFns.push(fn); if (mic) startEnvelope(); };
  /** ?demo: the game says which note is "right" now ({pc, midi} concert, or null = unpitched) */
  P.demoTarget = () => null;
  /** ?demo: turn the Space / W / S attack keys on (a page's own Space key keeps working while this is false) */
  P.demoAttacks = false;
  function envWin(sr) {
    const f = range ? range.minF : inst ? inst.minF : 80;
    const want = ENV.periods * sr / f;
    let w = ENV.minWin; while (w < want && w < ENV.maxWin) w *= 2;
    return w;
  }
  function startEnvelope(source, minF) {
    if (env) return;
    const ctx = source ? source.context : mic.ctx, an = ctx.createAnalyser();
    an.smoothingTimeConstant = 0;
    (source || mic.src).connect(an);
    env = {an, sr: ctx.sampleRate, minF, hist: [], timer: 0};
    sizeEnvelope();
  }
  /* (re)size the envelope window for the instrument / range being listened for */
  function sizeEnvelope() {
    if (!env) return;
    const w = env.minF ? (() => { let x = ENV.minWin; while (x < ENV.periods * env.sr / env.minF && x < ENV.maxWin) x *= 2; return x; })() : envWin(env.sr);
    if (env.an.fftSize !== w || !env.buf) { env.an.fftSize = w; env.buf = new Float32Array(w); env.hist = []; }
    const every = w <= 256 ? 5 : ENV.every;
    if (!env.timer || env.every !== every) { clearInterval(env.timer); env.every = every; env.timer = setInterval(envTick, every); }
  }
  function envTick() {
    const now = performance.now();
    if (P.paused) return;
    env.an.getFloatTimeDomainData(env.buf);
    let s = 0; const b = env.buf; for (let i = 0; i < b.length; i++) s += b[i] * b[i];
    const e = Math.sqrt(s / b.length), h = env.hist;
    h.push([now, e]); while (h.length && now - h[0][0] > Math.max(ENV.dipMs, 120) + 20) h.shift();
    if (h.length < 3 || e < P.gate * ENV.gateK || now - lastAttack < ENV.refractoryMs || now < P.suppressedUntil) return;
    const prev = h[h.length - 2][1];
    if (e <= prev) return;                                          // only on the way up
    let dip = Infinity, ago = null, before = 0;
    for (const [t, v] of h) {
      const d = now - t;
      if (d <= ENV.dipMs && d >= env.every) dip = Math.min(dip, v);
      if (ago === null && d <= ENV.jumpMs + env.every) ago = v;
      if (d >= 40 && d <= 120) before = Math.max(before, v);
    }
    if (e >= dip * ENV.rise || (ago !== null && e >= ago * ENV.jump && e >= before * ENV.above)) attackAt(now);
  }
  function attackAt(time, pitch) {
    lastAttack = time;
    if (pitch !== undefined) return fireAttack({time, pc: pitch ? pitch.pc : null, midi: pitch ? pitch.midi : null});
    pend.push({time, seen: []});
  }
  function fireAttack(a) { attackFns.forEach(fn => fn(a)); }
  /* called by the main loop with each reading: settle the pitch of pending attacks */
  function settleAttacks(reading, now) {
    for (let i = pend.length - 1; i >= 0; i--) {
      const a = pend[i], dt = now - a.time;
      if (dt < ENV.pitchFrom) continue;
      if (reading) a.seen.push({pc: reading.pc, midi: reading.note});
      const n = a.seen.length, two = n >= 2 && a.seen[n - 1].pc === a.seen[n - 2].pc;
      if (two || dt >= ENV.pitchBy) {
        pend.splice(i, 1);
        let pick = two ? a.seen[n - 1] : null;
        if (!pick && n) { const c = {}; a.seen.forEach(x => { c[x.pc] = (c[x.pc] || 0) + 1; }); const best = +Object.keys(c).sort((x, y) => c[y] - c[x])[0]; pick = a.seen.filter(x => x.pc === best).pop(); }
        fireAttack({time: a.time, pc: pick ? pick.pc : null, midi: pick ? pick.midi : null});
      }
    }
  }
  /** tests only: run attack detection on any audio node (a synthetic signal) instead of the mic */
  P._attackSource = (node, minF) => { if (env) { clearInterval(env.timer); env = null; } startEnvelope(node, minF); };
  if (A.DEMO) {
    let heldS = false;
    const wrongOf = t => t ? {pc: mod12(t.pc + 2), midi: t.midi + 2} : null;
    addEventListener('keydown', e => {
      if (!attackFns.length || !P.demoAttacks || P.paused || e.repeat || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName) && e.key === ' ') return;
      const t = P.demoTarget(), k = e.key.toLowerCase();
      if (k === ' ' || k === 't') { e.preventDefault(); if (performance.now() >= P.suppressedUntil) attackAt(performance.now(), t); }
      else if (k === 'w') { if (performance.now() >= P.suppressedUntil) attackAt(performance.now(), t ? wrongOf(t) : {pc: 1, midi: 61}); }
      else if (k === 's' && !heldS) { heldS = true; if (t) { P.demoNote = t.midi; demoHeldPc = t.pc; } else demoHeldPc = 'drum'; }
    });
    addEventListener('keyup', e => { if (e.key.toLowerCase() === 's' && heldS) { heldS = false; P.demoNote = null; demoHeldPc = null; } });
  }
  let demoHeldPc = null;
  /** ?demo: a note (or drum roll) is being held with S (no new attacks): games use it for "Tongue each note!" */
  P.demoHeld = () => demoHeldPc;

  /* ---------- main loop ---------- */
  function tick() {
    const now = performance.now();
    let reading = null, level = 0;
    if (mic && inst && !P.paused) {
      mic.an.getFloatTimeDomainData(mic.buf);
      let r;
      if (range) {
        const k = Math.max(1, Math.min(4, Math.floor(mic.sr / (range.maxF * 8))));
        r = k > 1 ? detect(decimate(mic.buf, k), mic.sr / k, range.minF, range.maxF) : detect(mic.buf, mic.sr, range.minF, range.maxF);
      } else {
        r = detect(mic.buf, mic.sr, inst.minF, inst.maxF);
      }
      level = r.rms;
      if (r.rms >= P.gate && r.freq > 0 && r.clarity >= 0.8) {
        const m = 69 + 12 * Math.log2(r.freq / 440);
        reading = {freq: r.freq, midi: m, note: Math.round(m), pc: mod12(Math.round(m)), cents: (m - Math.round(m)) * 100};
      }
    }
    if (A.DEMO && demoKey !== null && inst) {
      const m = 60 + inst.targetPc[demoKey] + (Math.random() - .5) * .2;
      reading = {freq: mtof(m), midi: m, note: Math.round(m), pc: inst.targetPc[demoKey], cents: (m - Math.round(m)) * 100};
      level = 0.1;
    }
    if (A.DEMO && P.demoNote !== null && inst) {
      const m = P.demoNote + (Math.random() - .5) * P.demoJitter;
      reading = {freq: mtof(m), midi: m, note: Math.round(m), pc: mod12(Math.round(m)), cents: (m - Math.round(m)) * 100};
      level = 0.1;
    }
    if (P.paused) { reading = null; level = 0; }            // not listening right now (demo notes included)
    // full range: a reading an octave (or two) outside the range is moved into it
    if (reading && range && (reading.note < range.lo || reading.note > range.hi)) {
      const k = [12, -12, 24, -24].find(k => reading.note + k >= range.lo && reading.note + k <= range.hi);
      if (k) { reading.note += k; reading.midi += k; reading.freq *= Math.pow(2, k / 12); reading.folded = k; }
    }
    if (range) {
      // full range: exact notes. Stay on the current note unless the pitch is clearly past the halfway point.
      if (reading && H.note !== null && Math.abs(reading.midi - H.note) < .65) { reading.note = H.note; reading.pc = mod12(H.note); }
      if (reading) {
        if (reading.note !== H.note) { H.note = reading.note; H.pc = reading.pc; H.since = now; H.fired = false; }
        H.last = now;
      } else if (H.note !== null && now - H.last > 110) { H.note = H.pc = null; H.fired = false; }
    } else {
      // hysteresis: stay on the current note unless the pitch is clearly past the halfway point
      if (reading && H.pc !== null) {
        const dd = mod12(reading.midi - H.pc);
        if (dd < .65 || dd > 11.35) reading.pc = H.pc;
      }
      if (reading) {
        if (reading.pc !== H.pc) { H.pc = reading.pc; H.since = now; H.fired = false; }
        H.note = reading.note;
        H.last = now;
      } else if (H.pc !== null && now - H.last > 110) { H.pc = null; H.fired = false; }
    }

    // a sound effect is playing: keep tracking what is heard but count none of it. Anything still sounding when the
    // window ends stays counted too, so only a NEW note (a new attack or a different pitch) can fire afterwards.
    const quiet = now < P.suppressedUntil;
    if (quiet) { H.fired = true; reading = null; }       // …and nothing heard during the window is reported at all
    P.reading = reading; P.level = level;
    if (pend.length) settleAttacks(reading, now);
    if (reading && !H.fired && reading.pc === H.pc && now - H.since >= P.holdMs) {
      H.fired = true;
      heldFns.forEach(fn => fn(H.pc, now, H.note));
    }
    frameFns.forEach(fn => fn(reading, level, now));
  }
  setInterval(tick, 40);

  /** 0–5 bars for a mic level meter */
  P.bars = level => level <= 0 ? 0 : Math.max(0, Math.min(5, Math.round((Math.log10(level) + 2.7) * 2.2)));
  /** 0–100 for a wider loudness bar (log scale, 0.001–0.3 RMS) */
  P.levelPct = v => Math.max(0, Math.min(100, (Math.log10(Math.max(v, 1e-4)) + 3) / 2.5 * 100));
})(window.Arcade);
