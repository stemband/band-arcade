/* SLIDE QUEST: THE SOUND (Arcade.SQBrass; docs/games/slide-quest.md). Everything plays on the arcade's own output
   (shared/sfx.js Sfx.output(): the first tap unlocks it; SOUND OFF and the EFFECTS slider apply; never an
   AudioContext of its own).

   THE PITCHED-AUDIO EXCEPTION (CLAUDE.md hard rules): Slide Quest never requests or uses the microphone, and every
   sound here REFUSES to play while Arcade.Pitch.listening() (it never listens, but the guard keeps the rule honest).

   THE HORN: a synthesized trombone built to BEND. One voice: a brass PeriodicWave (harmonic k at about 1/k^0.7, a
   little extra 2nd and 3rd) through a low-pass that opens with the attack ("BWAH") and settles, plus a very quiet
   band-passed breath. No vibrato: tuning needs a steady tone. Moving the slide GLIDES the voice (a glissando, the way
   a real slide sounds); a LIP change is a quick slur (a little dip, a fast jump), never a new note.
   THE DRONE: the reference, deliberately a different sound (as in a real rehearsal): a soft, mellow sine with a quiet
   2nd and 3rd harmonic. Its most important job: with the horn it BEATS (wah-wah-wah), slower as the two get closer.

     SQBrass.start(f)              the horn starts at f Hz (→ true, or false: sound off, not unlocked, listening)
     SQBrass.setFreq(f, {slur})    the horn glides to f (slur: a lip change: dip + a quick jump)
     SQBrass.stop() / playing()    the horn's release (80 ms) / is it sounding?
     SQBrass.drone(f, {sec, vol})  the drone: held until droneStop(), or for `sec` seconds (→ {stop()} or null)
     SQBrass.droneStop()           the held drone fades out (0.3 s)
     SQBrass.stopAll()             everything off (pause, leaving, a hidden page)
     SQBrass.test                  tests: {live(), drone(), voiceStart(), history, render(fHorn, fDrone, sec)}
   Loaded after sfx.js. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';

  /* ================= THE HORN and THE DRONE: every number of the sound, tune by ear =================
     Change a number, reload the page, blow the horn. (The Sound Board isn't needed: the game itself is the test.) */
  const BRASS = {
    vol: 0.34,                   // the horn's loudness, into the EFFECTS bus
    harmonics: 24,               // how many harmonics the brass wave has
    rolloff: 0.7,                // harmonic k's loudness ≈ 1 / k^rolloff (brass is bright: a slow roll-off)
    boost: {2: 1.3, 3: 1.2},     // a little extra 2nd and 3rd harmonic (the trombone's warm "core")
    // THE ATTACK ("BWAH"): the low-pass opens to `open` × the pitch in `openS`, then settles to `settle` × the pitch
    // (a time constant of settleS / 3, so it is settled after about settleS)
    open: 9, openS: 0.04, settle: 4.5, settleS: 0.15,
    minCut: 900,                 // Hz: the low-pass never closes below this, so LOW notes (E2 = 82 Hz) keep the
                                 // harmonics that carry them on tablet speakers
    maxCut: 9000,                // Hz: and never opens above this (no fizz)
    q: 0.8,                      // the low-pass's resonance
    attackS: 0.018,              // the level's rise
    releaseS: 0.08,              // the level's fall when the horn stops
    glide: 0.012,                // s: THE SLIDE's smoothing (setTargetAtTime's time constant): the glissando
    slur: {dip: 0.25, ms: 30, glide: 0.02},   // a LIP change: the level dips 25 % for 30 ms, the pitch jumps with a 0.02 s glide
    breath: {vol: 0.018, freq: 1800, q: 0.7},  // the breath: band-passed noise, very quiet
  };
  const DRONE = {
    vol: 0.26,                   // a little quieter than the horn
    harmonics: [1, 0.22, 0.1],   // a sine, a quiet 2nd and 3rd harmonic (mellow: no buzz)
    fadeIn: 0.3, fadeOut: 0.3,   // s
    sec: 2,                      // a timed drone (a level whose reference plays ONCE): this long
  };

  const history = [];
  const now = () => performance.now();
  const log = e => { history.push(Object.assign({at: Math.round(now())}, e)); if (history.length > 80) history.shift(); };
  const listening = () => !!(A.Pitch && A.Pitch.listening && A.Pitch.listening());
  function output() {
    if (listening()) return null;                         // the rule: never a pitched sound while a mic listens
    const o = A.Sfx && A.Sfx.output && A.Sfx.output();
    if (!o) return null;
    if (o.ctx.state !== 'running') o.ctx.resume().catch(() => {});
    return o;
  }

  /* the waves and the breath's noise, made once per context */
  const waves = new WeakMap(), noises = new WeakMap();
  function brassWave(ctx) {
    let w = waves.get(ctx); if (w && w.brass) return w.brass;
    const n = BRASS.harmonics + 1, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (BRASS.boost[k] || 1) / Math.pow(k, BRASS.rolloff);
    w = Object.assign(w || {}, {brass: ctx.createPeriodicWave(re, im)}); waves.set(ctx, w);
    return w.brass;
  }
  function droneWave(ctx) {
    let w = waves.get(ctx); if (w && w.drone) return w.drone;
    const n = DRONE.harmonics.length + 1, re = new Float32Array(n), im = new Float32Array(n);
    DRONE.harmonics.forEach((h, i) => { im[i + 1] = h; });
    w = Object.assign(w || {}, {drone: ctx.createPeriodicWave(re, im)}); waves.set(ctx, w);
    return w.drone;
  }
  function noise(ctx) {
    let b = noises.get(ctx); if (b) return b;
    const n = Math.round(ctx.sampleRate * 1.5); b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noises.set(ctx, b); return b;
  }
  const cutFor = (f, k) => Math.max(BRASS.minCut, Math.min(BRASS.maxCut, f * k));

  /* THE HORN's voice on any context (the game's output, or a test's OfflineAudioContext) */
  function buildHorn(ctx, dest, f, t) {
    const B = BRASS;
    const osc = ctx.createOscillator(), lp = ctx.createBiquadFilter(), env = ctx.createGain(), out = ctx.createGain();
    osc.setPeriodicWave(brassWave(ctx)); osc.frequency.setValueAtTime(f, t);
    lp.type = 'lowpass'; lp.Q.value = B.q;
    lp.frequency.setValueAtTime(cutFor(f, 1.5), t);
    lp.frequency.linearRampToValueAtTime(cutFor(f, B.open), t + B.openS);
    lp.frequency.setTargetAtTime(cutFor(f, B.settle), t + B.openS, B.settleS / 3);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(1, t + B.attackS);
    out.gain.value = B.vol;
    osc.connect(lp); lp.connect(env); env.connect(out); out.connect(dest);
    // the breath
    const ns = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();
    ns.buffer = noise(ctx); ns.loop = true;
    bp.type = 'bandpass'; bp.frequency.value = B.breath.freq; bp.Q.value = B.breath.q;
    ng.gain.value = B.breath.vol / B.vol;
    ns.connect(bp); bp.connect(ng); ng.connect(env);
    osc.start(t); ns.start(t);
    return {ctx, osc, lp, env, out, ns, freq: f, t0: t, stopped: false};
  }
  /* THE DRONE's voice on any context; sec = null: held */
  function buildDrone(ctx, dest, f, t, sec, vol = 1) {
    const osc = ctx.createOscillator(), g = ctx.createGain(), level = DRONE.vol * vol;
    osc.setPeriodicWave(droneWave(ctx)); osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(level, t + DRONE.fadeIn);
    osc.connect(g); g.connect(dest); osc.start(t);
    if (sec != null) {
      const end = t + Math.max(DRONE.fadeIn, sec);
      g.gain.setValueAtTime(level, end); g.gain.linearRampToValueAtTime(0, end + DRONE.fadeOut); osc.stop(end + DRONE.fadeOut + 0.05);
    }
    return {ctx, osc, g, freq: f, t0: t, sec, stopped: false};
  }

  /* ================= THE HORN ================= */
  let horn = null;
  function start(f) {
    const o = output();
    if (!o || !(f > 0)) { log({kind: 'horn', freq: f, played: false}); return false; }
    if (horn && !horn.stopped && horn.ctx === o.ctx) { setFreq(f); return true; }   // already sounding: it just glides
    stop();
    horn = buildHorn(o.ctx, o.out, f, o.ctx.currentTime + 0.005);
    log({kind: 'horn', freq: f, played: true});
    return true;
  }
  function setFreq(f, {slur = false} = {}) {
    if (!horn || horn.stopped || !(f > 0)) { if (horn) horn.freq = f; return false; }
    const B = BRASS, t = horn.ctx.currentTime, tc = slur ? B.slur.glide : B.glide;
    horn.osc.frequency.cancelScheduledValues(t); horn.osc.frequency.setTargetAtTime(f, t, tc);
    horn.lp.frequency.cancelScheduledValues(t); horn.lp.frequency.setTargetAtTime(cutFor(f, slur ? B.open * .7 : B.settle), t, slur ? B.settleS / 3 : tc);
    if (slur) {
      horn.lp.frequency.setTargetAtTime(cutFor(f, B.settle), t + B.slur.ms / 1000, B.settleS / 3);
      const g = horn.env.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(1 - B.slur.dip, t + B.slur.ms / 2000); g.linearRampToValueAtTime(1, t + B.slur.ms / 1000);
      log({kind: 'slur', freq: f});
    }
    horn.freq = f;
    return true;
  }
  function stop() {
    const h = horn; if (!h || h.stopped) return;
    h.stopped = true;
    const t = h.ctx.currentTime, g = h.env.gain;
    try { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0, t + BRASS.releaseS); h.osc.stop(t + BRASS.releaseS + 0.03); h.ns.stop(t + BRASS.releaseS + 0.03); } catch (e) {}
  }
  const playing = () => !!horn && !horn.stopped;

  /* ================= THE DRONE ================= */
  let drone = null;
  const timed = [];
  function stopVoice(v, s = DRONE.fadeOut) {
    if (!v || v.stopped) return;
    v.stopped = true;
    const t = v.ctx.currentTime;
    try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + s); v.osc.stop(t + s + 0.05); } catch (e) {}
    clearTimeout(v.timer);
  }
  function droneFn(f, {sec = null, vol = 1} = {}) {
    const o = output();
    if (!o || !(f > 0)) { log({kind: 'drone', freq: f, sec, played: false}); return null; }
    if (sec == null) stopVoice(drone, 0.05);
    const v = buildDrone(o.ctx, o.out, f, o.ctx.currentTime + 0.01, sec, vol);
    const h = {freq: f, sec, stop() { stopVoice(v); const i = timed.indexOf(h); if (i >= 0) timed.splice(i, 1); if (drone === v) drone = null; }, onEnd: null};
    v.handle = h;
    if (sec == null) drone = v;
    else {
      timed.push(h);
      v.timer = setTimeout(() => { v.stopped = true; const i = timed.indexOf(h); if (i >= 0) timed.splice(i, 1); if (h.onEnd) h.onEnd(); }, (Math.max(DRONE.fadeIn, sec) + DRONE.fadeOut) * 1000);
    }
    log({kind: 'drone', freq: f, sec, played: true});
    return h;
  }
  function droneStop() { stopVoice(drone); drone = null; }
  function stopAll() { stop(); droneStop(); timed.slice().forEach(h => h.stop()); }

  A.SQBrass = {
    BRASS, DRONE, start, setFreq, stop, playing, drone: droneFn, droneStop, stopAll,
    droning: () => !!drone && !drone.stopped,
    test: {
      /** the horn's oscillator frequency right now (what the audio engine is playing), or null */
      live: () => horn && !horn.stopped ? horn.osc.frequency.value : null,
      /** the frequency the horn is headed for */
      target: () => horn && !horn.stopped ? horn.freq : null,
      /** the held drone: {freq, live} or null */
      drone: () => drone && !drone.stopped ? {freq: drone.freq, live: drone.osc.frequency.value} : null,
      /** when the horn's current voice started (its context time): a glide or a slur never changes it */
      voiceStart: () => horn && !horn.stopped ? horn.t0 : null,
      history,
      /** THE BEATS, checked offline: the horn at fHorn and the drone at fDrone together for `sec` s in an
          OfflineAudioContext (mono) → Promise<{data: Float32Array, rate}> */
      render(fHorn, fDrone, sec = 3, rate = 22050) {
        const C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const ctx = new C(1, Math.round(rate * sec), rate);
        buildHorn(ctx, ctx.destination, fHorn, 0);
        buildDrone(ctx, ctx.destination, fDrone, 0, null);
        return ctx.startRendering().then(b => ({data: b.getChannelData(0), rate}));
      },
    },
  };
})(window.Arcade);
