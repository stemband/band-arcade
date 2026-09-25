/* Band Arcade — microphone + pitch detection engine.
   Games never touch the microphone directly. They:
     1. call Arcade.Pitch.setInstrument(inst)
     2. call Arcade.requireMic(startFn) from a button tap (see mic-gate.js)
     3. subscribe with Arcade.Pitch.onFrame(fn) and/or Arcade.Pitch.onHeld(fn)

   onFrame(reading, level, now)  runs ~25×/second.
       reading = null (nothing clear) or {freq, midi, pc, cents}
       pc is the CONCERT pitch class 0–11; use inst.writtenName(pc) for display.
   onHeld(pc, now)  fires once when a note has been held for holdMs.
       A new onHeld needs a new attack (a short gap) or a different note.
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

  let mic = null, inst = null;
  const frameFns = [], heldFns = [];
  const H = {pc: null, since: 0, last: 0, fired: false};   // hold tracker

  P.setInstrument = i => { inst = i; };
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
      const r = detect(mic.buf, mic.sr, inst.minF, inst.maxF);
      level = r.rms;
      if (r.rms >= P.gate && r.freq > 0 && r.clarity >= 0.8) {
        const m = 69 + 12 * Math.log2(r.freq / 440);
        reading = {freq: r.freq, midi: m, pc: mod12(Math.round(m)), cents: (m - Math.round(m)) * 100};
      }
    }
    if (A.DEMO && demoKey !== null && inst) {
      const m = 60 + inst.targetPc[demoKey] + (Math.random() - .5) * .2;
      reading = {freq: mtof(m), midi: m, pc: inst.targetPc[demoKey], cents: (m - Math.round(m)) * 100};
      level = 0.1;
    }
    // hysteresis: stay on the current note unless the pitch is clearly past the halfway point
    if (reading && H.pc !== null) {
      const dd = mod12(reading.midi - H.pc);
      if (dd < .65 || dd > 11.35) reading.pc = H.pc;
    }
    if (reading) {
      if (reading.pc !== H.pc) { H.pc = reading.pc; H.since = now; H.fired = false; }
      H.last = now;
    } else if (H.pc !== null && now - H.last > 110) { H.pc = null; H.fired = false; }

    P.reading = reading; P.level = level;
    if (reading && !H.fired && reading.pc === H.pc && now - H.since >= P.holdMs) {
      H.fired = true;
      heldFns.forEach(fn => fn(H.pc, now));
    }
    frameFns.forEach(fn => fn(reading, level, now));
  }
  setInterval(tick, 40);

  /** 0–5 bars for a mic level meter */
  P.bars = level => level <= 0 ? 0 : Math.max(0, Math.min(5, Math.round((Math.log10(level) + 2.7) * 2.2)));
  /** 0–100 for a wider loudness bar (log scale, 0.001–0.3 RMS) */
  P.levelPct = v => Math.max(0, Math.min(100, (Math.log10(Math.max(v, 1e-4)) + 3) / 2.5 * 100));
})(window.Arcade);
