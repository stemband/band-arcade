/* ONSETS: claps, drum hits and other SHARP sounds from the microphone, found by their energy, never their pitch
   (Rhythm Dojo's Clap and Snare modes). It listens to the same microphone as shared/pitch.js (Arcade.Pitch.start() via
   Arcade.requireMic, then Pitch.source()), and respects Pitch.pauseListening and Pitch.suppress like every listener.

   THE DETECTOR (one function for the microphone and for recordings/tests, so they can't disagree):
     the signal is pre-emphasized (y[n] = x[n] − 0.95·x[n−1]: a clap's energy is high, a hum's or a voice's is low),
     cut into FRAMES of 128 samples (~3 ms); a frame's energy E = its mean y².
     An ONSET = E above the gate (RULES.gateK × the sensitivity slider's gate, as a level) AND E ≥ RULES.rise × the
     background (the average energy RULES.bgFrom–RULES.bgTo ms before), rising; then nothing for RULES.refractoryMs
     (a clap's own crackle and a snare's ring never count twice). Its TIME = the first sample of that frame reaching
     half its peak, so it's sample-accurate however late the browser delivers the audio.
     Its LEVEL = the frame's RMS (games compare it to what the speakers' own clicks sounded like: "bleed").
   LIVE, the microphone is read in blocks by a ScriptProcessor; each sample's time is counted from the stream itself
   (performance.now() at a block's end − its length, the smallest such estimate: delivery delays never shift it).

     Arcade.Onsets.analyse(samples, sampleRate, opts?) -> [{time (s from the start), level}]   (recordings, tests)
     Arcade.Onsets.listen(fn) -> {stop()}   fn({time: performance.now() ms, level}) for every onset while the
                                           microphone listens (starts the reader the first time; one reader per page)
     Arcade.Onsets.watchNode(node)          tests: read any audio node instead of the microphone (the game's own output
                                           looped back: a count-in's clicks must never become claps)
     Arcade.Onsets.fake(time?, level?)      ?demo: an onset now (the games' demo keys)
     Arcade.Onsets.log                      the last 60 onsets (tests), Arcade.Onsets.RULES */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const RULES = {
    frame: 128,          // samples per energy frame (~2.7–2.9 ms)
    emph: .95,           // pre-emphasis
    rise: 7,             // energy must jump to rise × the background (≈ 8.5 dB)
    bgFrom: 12,          // the background = average energy from bgFrom …
    bgTo: 70,            //   … to bgTo ms ago
    gateK: .7,           // the gate: gateK × Pitch.gate (the sensitivity slider), as an RMS level of the emphasized signal
    minGate: .002,       // never below this (a silent room with the slider at 100)
    refractoryMs: 85,    // after an onset, nothing for this long (sixteenths at 100 bpm are 150 ms apart)
  };

  /* the streaming core: feed(block) as samples arrive; calls out(sampleIndex, level) per onset */
  function detector(sr, out, gate) {
    const N = RULES.frame, hist = [], maxHist = Math.ceil(RULES.bgTo / 1000 * sr / N) + 2;
    const lo = Math.floor(RULES.bgFrom / 1000 * sr / N), hi = Math.ceil(RULES.bgTo / 1000 * sr / N);
    let prevX = 0, pos = 0, fbuf = new Float32Array(N), fn = 0, lastOn = -1e12, prevE = 0;
    return {
      feed(x) {
        for (let i = 0; i < x.length; i++) {
          const y = x[i] - RULES.emph * prevX; prevX = x[i];
          fbuf[fn++] = y;
          if (fn === N) { frame(pos + i + 1 - N); fn = 0; }
        }
        pos += x.length;
      },
    };
    function frame(start) {
      let e = 0, pk = 0;
      for (let k = 0; k < N; k++) { const v = fbuf[k] * fbuf[k]; e += v; if (v > pk) pk = v; }
      e /= N;
      let bg = 0, n = 0;
      for (let k = lo; k <= hi && k <= hist.length; k++) { bg += hist[hist.length - k]; n++; }
      bg = n ? bg / n : 0;
      const g = Math.max(RULES.minGate, typeof gate === 'function' ? gate() : gate);
      const on = e > g * g && e >= RULES.rise * bg && e > prevE && (start - lastOn) / sr * 1000 >= RULES.refractoryMs;
      hist.push(e); if (hist.length > maxHist) hist.shift();
      prevE = e;
      if (!on) return;
      lastOn = start;
      let k = 0; const half = pk * .25;                            // half the peak AMPLITUDE (energy × 1/4)
      while (k < N - 1 && fbuf[k] * fbuf[k] < half) k++;
      out(start + k, Math.sqrt(e));
    }
  }

  function analyse(samples, sr, opts = {}) {
    const res = [];
    const d = detector(sr, (i, level) => res.push({time: i / sr, level}), opts.gate != null ? opts.gate : RULES.minGate);
    const B = 512;
    for (let i = 0; i < samples.length; i += B) d.feed(samples.subarray ? samples.subarray(i, i + B) : samples.slice(i, i + B));
    return res;
  }

  /* ---------- live ---------- */
  const fns = [];
  const log = [];
  let live = null;
  const gateNow = () => RULES.gateK * (A.Pitch && A.Pitch.gate || .01);
  function emit(time, level, fake) {
    const P = A.Pitch;
    if (!fake && P && (!P.listening() || P.isSuppressed(time))) return;
    const o = {time, level, fake: !!fake};
    log.push(o); if (log.length > 60) log.shift();
    fns.slice().forEach(fn => fn(o));
  }
  function attach(node) {
    if (live && live.node === node) return;
    if (live) { try { live.sp.disconnect(); live.node.disconnect(live.sp); } catch (e) {} live = null; }
    const ctx = node.context, sr = ctx.sampleRate;
    const sp = ctx.createScriptProcessor(512, 1, 1), mute = ctx.createGain(); mute.gain.value = 0;
    let base = Infinity, count = 0;
    const d = detector(sr, (i, level) => emit(base + i / sr * 1000, level), gateNow);
    sp.onaudioprocess = e => {
      const x = e.inputBuffer.getChannelData(0), now = performance.now();
      count += x.length;
      // the perf time of sample 0: the smallest estimate so far (late deliveries only make it bigger), allowed to creep
      // up slowly so the two clocks can't drift apart over a long session
      base = Math.min(base + .02, now - count / sr * 1000);
      d.feed(x);
    };
    node.connect(sp); sp.connect(mute); mute.connect(ctx.destination);
    live = {node, sp, mute};
  }
  function ensure() {
    const src = A.Pitch && A.Pitch.source && A.Pitch.source();
    if (src) attach(src);
  }
  function listen(fn) {
    fns.push(fn); ensure();
    return {stop() { const i = fns.indexOf(fn); if (i >= 0) fns.splice(i, 1); }};
  }

  A.Onsets = {RULES, analyse, listen, log,
    ensure,
    watchNode: node => attach(node),
    fake: (time = performance.now(), level = .3) => emit(time, level, true),
    reading: () => !!live,
    detector};
})(window.Arcade);
