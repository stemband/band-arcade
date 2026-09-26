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

  P.setInstrument = i => { inst = i; };
  P.setRange = function (lowMidi, highMidi) {
    range = lowMidi == null ? null : {lo: lowMidi, hi: highMidi, minF: mtof(lowMidi) * 0.78, maxF: Math.min(7000, mtof(highMidi) * 2.3)};
    H.pc = H.note = null; H.fired = false;
  };
  P.demoNote = null;   // ?demo: a SOUNDING midi note the page wants "played" right now (Note Checker full range)
  P.onFrame = fn => frameFns.push(fn);
  P.onHeld  = fn => heldFns.push(fn);
  /** treat whatever is sounding right now as already counted (use when a new target appears) */
  P.ignoreCurrent = () => { H.fired = true; };
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
      mic = {ctx, an, stream, buf: new Float32Array(an.fftSize), sr: ctx.sampleRate};
      P.active = true;
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

  /* ---------- main loop ---------- */
  function tick() {
    const now = performance.now();
    let reading = null, level = 0;
    if (mic && inst) {
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
      const m = P.demoNote + (Math.random() - .5) * .2;
      reading = {freq: mtof(m), midi: m, note: Math.round(m), pc: mod12(Math.round(m)), cents: (m - Math.round(m)) * 100};
      level = 0.1;
    }
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

    P.reading = reading; P.level = level;
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
