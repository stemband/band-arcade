/* PEDAL POINT: THE SOUND (Arcade.Timpani). A believable timpani by MODAL SYNTHESIS, and a pitch pipe for the
   reference, both made here with Web Audio on the arcade's own output (shared/sfx.js Sfx.output(): the first tap
   unlocks it; SOUND OFF and the EFFECTS slider apply; never an AudioContext of its own).

   THE PITCHED-AUDIO EXCEPTION (CLAUDE.md hard rules): Pedal Point never requests or uses the microphone, and every
   sound here REFUSES to play while Arcade.Pitch.listening() (it never listens, but the guard keeps the rule honest).

   A real timpani's head rings in several MODES at once. The one we hear as the pitch is the PRINCIPAL (the (1,1)
   mode); the others sit at near-harmonic ratios above it (1.5, 2, 2.5, 3: the kettle's air tunes them), each a little
   quieter and dying a little faster. A low (0,1) "thump" under the principal dies almost at once, and the felt
   mallet's contact is a soft ~30 ms burst of filtered noise.

     Timpani.strike(key, freq, {soft})  a drum (key = its place on the stage) struck at `freq` Hz (its principal):
                                        soft = a TUNING TAP, else a full stroke. A new strike restarts that drum's
                                        ring at its current pitch. → true, or false (sound off, not unlocked, listening)
     Timpani.setFreq(key, freq)         THE PEDAL: every partial of a RINGING drum glides to the new pitch together
                                        (setTargetAtTime, TIMPANI.glide), so the glissando is heard
     Timpani.damp(key) / stopAll()      a hand on the head (quick fade) / everything off (pause, leaving)
     Timpani.pipe(freq, {sec})          THE PITCH PIPE: a reedy held tone (the reference, a different sound from the
                                        drum, as in real life) → {dur, stop()} or null
     Timpani.ringing(key)               is that drum still sounding?
     Timpani.test                       tests: {principal(key), partials(key), ringing(key), history, glides}
   Loaded after sfx.js. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';

  /* ================= THE TIMPANI: every number of the sound, tune by ear =================
     Change a number, reload the page, tap the drum. (The Sound Board isn't needed: the game itself is the test.) */
  const TIMPANI = {
    vol: 0.9,                    // the whole drum's loudness (a full stroke), into the EFFECTS bus
    tapVol: 0.38,                // a TUNING TAP's loudness, × vol (timpanists tap lightly while tuning)
    tapBright: 0.55,             // a tap's upper partials, × their normal gain (a light tap is darker)
    // THE MODES, relative to the PRINCIPAL (the pitch we hear). gain: loudness (principal = 1);
    // decay: how long it rings, × the drum's ring time (1 = as long as the principal; smaller = dies faster)
    partials: [
      {ratio: 1.00, gain: 1.00, decay: 1.00},
      {ratio: 1.50, gain: 0.55, decay: 0.80},
      {ratio: 1.98, gain: 0.34, decay: 0.62},
      {ratio: 2.44, gain: 0.20, decay: 0.48},
      {ratio: 2.94, gain: 0.12, decay: 0.38},
    ],
    // the low "thump" ((0,1) mode): below the principal, damped almost at once
    thump: {ratio: 0.62, gain: 0.55, decay: 0.07},      // decay here in SECONDS (the time to fall to 1/1000)
    // the mallet: band-passed noise at the moment of the stroke
    mallet: {ms: 30, freq: 900, tapFreq: 550, q: 0.9, gain: 0.6},
    attack: 0.004,               // s: how fast each mode speaks after the mallet lands
    // THE RING: seconds until the principal has faded to 1/1000 (−60 dB). Low drums ring longer: ringLow at lowHz,
    // ringHigh at highHz, in between by pitch
    ringLow: 5.0, lowHz: 73.4,   // D2 (the 32" drum at the bottom)
    ringHigh: 3.2, highHz: 220,  // A3 (the 23" drum at the top)
    glide: 0.04,                 // s: THE PEDAL's smoothing (setTargetAtTime's time constant): the glissando
    dampMs: 60,                  // a hand on the head
  };
  /* ================= THE PITCH PIPE (the reference) =================
     A free reed: bright and buzzy, steady pitch, no vibrato (so its pitch is exact). harmonics = the loudness of the
     2nd, 3rd… harmonic over the fundamental (odd ones a little stronger, like a reed). */
  const PIPE = {
    vol: 0.32, sec: 2, attack: 0.06, release: 0.14,
    harmonics: [1, 0.62, 0.58, 0.38, 0.34, 0.22, 0.2, 0.12, 0.11, 0.07, 0.06, 0.04],
    brightness: 14,              // the low-pass sits at this × the pitch (≤ 4 kHz): the reed's buzz without hiss
  };

  const voices = {};             // key -> the ringing drum voice
  const history = [], glides = [];
  const now = () => performance.now();
  const listening = () => !!(A.Pitch && A.Pitch.listening && A.Pitch.listening());
  function output() {
    if (listening()) return null;                         // the rule: never a pitched sound while a mic listens
    const o = A.Sfx && A.Sfx.output && A.Sfx.output();
    if (!o) return null;
    if (o.ctx.state !== 'running') o.ctx.resume().catch(() => {});
    return o;
  }
  const log = e => { history.push(Object.assign({at: Math.round(now())}, e)); if (history.length > 60) history.shift(); };
  /** the ring time (s) for a principal frequency: between ringLow and ringHigh by log pitch */
  function ringOf(f) {
    const k = Math.max(0, Math.min(1, Math.log(f / TIMPANI.lowHz) / Math.log(TIMPANI.highHz / TIMPANI.lowHz)));
    return TIMPANI.ringLow + (TIMPANI.ringHigh - TIMPANI.ringLow) * k;
  }
  const LN1000 = Math.log(1000);
  let noiseBuf = null;
  function noise(ctx) {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    const n = Math.round(ctx.sampleRate * 0.06), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (noiseBuf = b);
  }

  function stopVoice(v, ms = TIMPANI.dampMs) {
    if (!v || v.stopped) return;
    v.stopped = true;
    const t = v.ctx.currentTime;
    try { v.out.gain.cancelScheduledValues(t); v.out.gain.setValueAtTime(v.out.gain.value, t); v.out.gain.linearRampToValueAtTime(0, t + ms / 1000); } catch (e) {}
    v.nodes.forEach(o => { try { o.stop(t + ms / 1000 + 0.02); } catch (e) {} });
    v.until = Math.min(v.until, t + ms / 1000);
  }

  function strike(key, f, {soft = false} = {}) {
    const o = output();
    if (!o || !(f > 0)) { log({kind: 'strike', key, freq: f, soft, played: false}); return false; }
    const {ctx, out} = o, T = TIMPANI, t = ctx.currentTime + 0.01;
    stopVoice(voices[key], 25);                           // a new stroke restarts the ring at the current pitch
    const ring = ringOf(f), level = T.vol * (soft ? T.tapVol : 1);
    const vout = ctx.createGain(); vout.gain.value = level; vout.connect(out);
    const v = {ctx, out: vout, nodes: [], modes: [], freq: f, t0: t, until: t + ring, soft, stopped: false};
    // the modes
    T.partials.forEach((p, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(f * p.ratio, t);
      const amp = p.gain * (soft && i > 0 ? T.tapBright : 1), tau = ring * p.decay / LN1000;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp * 0.5, t + T.attack);          // (× 0.5: five modes add up)
      g.gain.setTargetAtTime(0, t + T.attack, tau);
      osc.connect(g); g.connect(vout);
      osc.start(t); osc.stop(t + ring * p.decay + 0.1);
      v.nodes.push(osc); v.modes.push({osc, ratio: p.ratio});
    });
    // the thump
    const th = ctx.createOscillator(), tg = ctx.createGain();
    th.type = 'sine'; th.frequency.setValueAtTime(f * T.thump.ratio, t);
    tg.gain.setValueAtTime(0, t); tg.gain.linearRampToValueAtTime(T.thump.gain * (soft ? 0.6 : 1) * 0.5, t + T.attack);
    tg.gain.setTargetAtTime(0, t + T.attack, T.thump.decay / LN1000);
    th.connect(tg); tg.connect(vout); th.start(t); th.stop(t + T.thump.decay + 0.1);
    v.nodes.push(th); v.modes.push({osc: th, ratio: T.thump.ratio});
    // the mallet
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(), ms = T.mallet.ms / 1000;
    src.buffer = noise(ctx);
    bp.type = 'bandpass'; bp.frequency.value = soft ? T.mallet.tapFreq : T.mallet.freq; bp.Q.value = T.mallet.q;
    ng.gain.setValueAtTime(T.mallet.gain, t); ng.gain.linearRampToValueAtTime(0, t + ms);
    src.connect(bp); bp.connect(ng); ng.connect(vout); src.start(t); src.stop(t + ms + 0.01);
    v.nodes.push(src);
    voices[key] = v;
    log({kind: 'strike', key, freq: f, soft, played: true, ring: +ring.toFixed(2)});
    return true;
  }

  /** THE PEDAL: glide a ringing drum to a new principal (nothing to do when it isn't ringing) */
  function setFreq(key, f) {
    const v = voices[key];
    if (!v || v.stopped || !(f > 0)) return false;
    const t = v.ctx.currentTime;
    if (t > v.until) return false;
    v.freq = f;
    v.modes.forEach(m => { try { m.osc.frequency.setTargetAtTime(f * m.ratio, t, TIMPANI.glide); } catch (e) {} });
    glides.push({key, freq: f, tc: TIMPANI.glide, at: Math.round(now())}); if (glides.length > 200) glides.shift();
    return true;
  }
  const ringing = key => { const v = voices[key]; return !!v && !v.stopped && v.ctx.currentTime < v.until; };
  function damp(key) { stopVoice(voices[key]); }
  function stopAll() { Object.keys(voices).forEach(k => stopVoice(voices[k])); pipes.slice().forEach(p => p.stop()); }

  /* the pitch pipe */
  const pipes = [];
  let wave = null, waveCtx = null;
  function pipe(f, {sec = PIPE.sec, vol = 1} = {}) {
    const o = output();
    if (!o || !(f > 0)) { log({kind: 'pipe', freq: f, played: false}); return null; }
    const {ctx, out} = o, t = ctx.currentTime + 0.02;
    if (!wave || waveCtx !== ctx) {
      const n = PIPE.harmonics.length + 1, re = new Float32Array(n), im = new Float32Array(n);
      PIPE.harmonics.forEach((h, i) => { im[i + 1] = h; });
      wave = ctx.createPeriodicWave(re, im); waveCtx = ctx;
    }
    const osc = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    osc.setPeriodicWave(wave); osc.frequency.setValueAtTime(f, t);
    lp.type = 'lowpass'; lp.frequency.value = Math.min(4000, f * PIPE.brightness); lp.Q.value = 0.5;
    const level = PIPE.vol * vol;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + PIPE.attack);
    g.gain.setValueAtTime(level, t + sec); g.gain.linearRampToValueAtTime(0, t + sec + PIPE.release);
    osc.connect(lp); lp.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + sec + PIPE.release + 0.05);
    const dur = sec + PIPE.release + 0.02;
    let timer = 0, stopped = false;
    const p = {dur, freq: f, stop() {
      if (stopped) return; stopped = true; clearTimeout(timer);
      const tt = ctx.currentTime;
      try { g.gain.cancelScheduledValues(tt); g.gain.setValueAtTime(g.gain.value, tt); g.gain.linearRampToValueAtTime(0, tt + 0.05); osc.stop(tt + 0.08); } catch (e) {}
      const i = pipes.indexOf(p); if (i >= 0) pipes.splice(i, 1);
      if (p.onEnd) p.onEnd();
    }};
    timer = setTimeout(() => { stopped = true; const i = pipes.indexOf(p); if (i >= 0) pipes.splice(i, 1); if (p.onEnd) p.onEnd(); }, dur * 1000);
    pipes.push(p);
    log({kind: 'pipe', freq: f, played: true, sec});
    return p;
  }
  const piping = () => pipes.length > 0;

  A.Timpani = {
    TIMPANI, PIPE, strike, setFreq, damp, stopAll, pipe, piping, ringing, ringOf,
    test: {
      principal: key => voices[key] ? voices[key].freq : null,
      /** the frequencies every mode is headed for (principal × each ratio, the thump last) */
      partials: key => voices[key] ? voices[key].modes.map(m => voices[key].freq * m.ratio) : [],
      /** the oscillators' own frequency right now (what the audio engine is playing) */
      live: key => voices[key] ? voices[key].modes.map(m => m.osc.frequency.value) : [],
      ringing, history, glides,
      voiceStart: key => voices[key] ? voices[key].t0 : null,
    },
  };
})(window.Arcade);
