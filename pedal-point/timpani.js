/* PEDAL POINT: THE SOUND (Arcade.Timpani). Two ENGINES for the drum, one API (game.js and practice.js never know which
   one plays): SAMPLES = RECORDED timpani (samples.js's table, files in shared/sounds/timpani/: the default), and the
   SYNTH = a believable timpani by MODAL SYNTHESIS (the fallback: before the files have loaded, where they can't load,
   and the student's DRUM SOUND: SYNTH). The pitch pipe is always synthesized. Everything plays on the arcade's own
   output (shared/sfx.js Sfx.output(): the first tap unlocks it; SOUND OFF and the EFFECTS slider apply; never an
   AudioContext of its own).

   THE PITCHED-AUDIO EXCEPTION (CLAUDE.md hard rules): Pedal Point never requests or uses the microphone, and every
   sound here REFUSES to play while Arcade.Pitch.listening() (it never listens, but the guard keeps the rule honest).

   A real timpani's head rings in several MODES at once. The one we hear as the pitch is the PRINCIPAL (the (1,1)
   mode); the others sit at near-harmonic ratios above it (1.5, 2, 2.5, 3: the kettle's air tunes them), each a little
   quieter and dying a little faster. A low (0,1) "thump" under the principal dies almost at once, and the felt
   mallet's contact is a soft ~30 ms burst of filtered noise.

     Timpani.strike(key, freq, {soft, at, vel, center, layer})  a drum (key = its place on the stage) struck at
                                        `freq` Hz (its principal): soft = a TUNING TAP, else a full stroke; at = a
                                        context time (scheduled ahead); vel = × the loudness; center 0–1 = the THUD
                                        (toward the head's center); layer = ADD to the ring (the Practice Room), else
                                        a new strike restarts that drum's ring at its current pitch.
                                        → true, or false (sound off, not unlocked, listening)
     Timpani.ROLL                       the Practice Room's roll: strokes a second, unevenness (commented block)
     Timpani.setFreq(key, freq)         THE PEDAL: every partial of a RINGING drum glides to the new pitch together
                                        (setTargetAtTime, TIMPANI.glide), so the glissando is heard
     Timpani.damp(key) / stopAll()      a hand on the head (quick fade) / everything off (pause, leaving)
     Timpani.pipe(freq, {sec})          THE PITCH PIPE: a reedy held tone (the reference, a different sound from the
                                        drum, as in real life) → {dur, stop()} or null
     Timpani.ringing(key)               is that drum still sounding?
     Timpani.engine() / setEngine(name) the DRUM SOUND setting: 'samples' (RECORDED, the default) or 'synth'
     Timpani.preload()                  load the recorded drums (mid, then soft, then loud; a few at a time; it waits
                                        for the first tap's audio): game.js calls it when the page opens
     Timpani.samplesState()             'idle' | 'loading' | 'ready' | 'missing' (no file could load: the synth plays);
                                        Timpani.onSamples(fn) hears every change
     Timpani.HIT_OFFSET_S               where a recorded strike starts in its file (2 ms before the mallet's hit)
     Timpani.test                       tests: {principal(key), partials(key), ringing(key), history, glides, samples()}
   THE RECORDED DRUMS (docs/games/pedal-point.md): a strike picks the decoded sample nearest its pitch in the wanted
   LAYER (a tuning tap = soft, a stroke = mid; the Practice Room's p / mf / f = soft / mid / loud) and plays it with
   playbackRate = freq / its measured hz, so the principal is EXACTLY freq; ROUND ROBIN never repeats a take on a drum;
   strokes OVERLAP (a roll rings on); the pedal glides every ringing take's playbackRate. A strike never waits: with
   no sample decoded yet, the synth plays that one.
   Loaded after sfx.js and samples.js. */
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
    // THE CENTER "THUD" (the Practice Room: where the head is struck matters a little, like a real head). A stroke at the
    // PLAYING SPOT (about 3–4 inches in from the rim) is the normal tone above; toward the CENTER the upper modes fade
    // and the ring gets short and dull. `from` = how far out (0 = the center, 1 = the rim) the thud starts; at the very
    // center the upper modes × upper, the ring × ring, the low thump × thump, the mallet's band × mallet
    thud: {from: 0.38, upper: 0.12, ring: 0.22, thump: 1.8, mallet: 0.5},
    spot: 0.73,                  // the playing spot's ring, drawn on the head (× the head's radius)
    layers: 4,                   // the Practice Room's strokes ADD to a ringing drum (a roll is one sustained tone):
                                 // at most this many at once per drum, the oldest fading out
  };
  /* ================= THE ROLL (the Practice Room: PRESS AND HOLD a drum) =================
     Single strokes, hand to hand, at a steady rate, a little uneven so it never sounds like a machine. */
  const ROLL = {
    rate: 14,                    // strokes a second
    holdMs: 170,                 // a press held this long becomes a roll (the press's own stroke is its first)
    jitterMs: 6,                 // each stroke lands up to this many ms early or late
    velJitter: 0.12,             // each stroke's loudness ± this share
    rlBalance: 0.06,             // the left hand a touch softer than the right (real players aren't perfectly even)
    vel: 0.62,                   // a roll's strokes, × the dynamic's loudness (a roll is played lighter than a stroke)
    holdFrac: 0.7,               // PLAY ALONG: a roll note needs a hold covering at least this share of its length
  };
  /* ================= THE PITCH PIPE (the reference) =================
     A free reed: bright and buzzy, steady pitch, no vibrato (so its pitch is exact). harmonics = the loudness of the
     2nd, 3rd… harmonic over the fundamental (odd ones a little stronger, like a reed). */
  const PIPE = {
    vol: 0.32, sec: 2, attack: 0.06, release: 0.14,
    harmonics: [1, 0.62, 0.58, 0.38, 0.34, 0.22, 0.2, 0.12, 0.11, 0.07, 0.06, 0.04],
    brightness: 14,              // the low-pass sits at this × the pitch (≤ 4 kHz): the reed's buzz without hiss
  };
  /* ================= THE RECORDED DRUMS: every number of the SAMPLES engine (pedal-point/samples.js = the files) =================
     Match the recorded drum's loudness to the synth's BY EAR: switch DRUM SOUND between RECORDED and SYNTH in the
     settings, tap, and change `vol` (all of it) or a layer's `gainDb` until they sound the same. */
  const SAMPLES = {
    vol: 1,                      // the whole recorded drum (× the stroke's own level, as the synth's TIMPANI.vol)
    tapVol: 0.55,                // a TUNING TAP, × vol (the soft takes already sound light)
    // each LAYER's files lifted to about the same loudness (dB). The recordings keep the real difference between
    // layers (peaks: soft ≈ −24 dB, mid ≈ −16, loud ≈ −4); the stroke's level (a tap, p / mf / f) then sets the loudness
    // (a full mid stroke peaks about −3 dB: a roll's overlapping strokes still have room)
    gainDb: {soft: 19, mid: 13, loud: 3},
    // the layer a Practice Room stroke wants, from its dynamic's loudness (practice.js PRACTICE.dyn: p .42, mf .68,
    // f .9): below `soft` = the soft takes, below `mid` = the mid takes, else the loud ones
    dynLayer: {soft: 0.55, mid: 0.8},
    LAYER_COST: 300,             // cents: a take from the wrong layer scores this much worse per layer away (the right
                                 // layer wins unless its nearest take is far: F♯3 has one mid take)
    // ROUND ROBIN: a stroke varies its take only among the takes of the BEST take's GROUP (the same recorded note: its
    // file name without the layer and take number, timp-d3-mid-2 → timp-d3) and layer, never the file this drum played
    // last (real drums never sound the same twice). It never turns between two different recorded notes: they come
    // from different drums with different attacks, and alternating them sounds like every other note is accented
    MAX_RING: 6,                 // strokes ringing at once on one drum (they OVERLAP, like a real head); the oldest
    fadeMs: 80,                  // beyond that fades out over this long
    batch: 4,                    // files loaded at a time (the page never stalls)
    giveUp: 8,                   // this many files failing before ANY loads = none are here: the synth plays, quietly
    thud: {lowpass: 450, ring: 0.35, level: 0.7},   // THE CENTER THUD (the Practice Room): at the dead center the take
                                 // goes through a low-pass at `lowpass` Hz, fades in `ring` s, at × `level`
    minRate: 0.5, maxRate: 2,    // the pedal's glide guard (playbackRate; these drums never get near it)
  };
  const SP = window.PP_SAMPLES || {dir: 'timpani/', HIT_MS: 10, list: []};
  const LEAD_S = 0.002;                                   // a take starts this long before its hit (the attack stays whole)
  const HIT_OFFSET_S = (SP.HIT_MS - LEAD_S * 1000) / 1000; // where in the file a take starts
  const LAYERS = ['soft', 'mid', 'loud'];
  const groupOf = file => file.replace(/-(soft|mid|loud)-\d+$/, '');   // timp-e3-mid-2 → timp-e3 (ROUND ROBIN)
  const SMP = SP.list.map(([file, hz, layer, sec]) => ({file, hz, layer, sec, li: LAYERS.indexOf(layer), group: groupOf(file), buf: null, lead: 0}));

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

  const layered = {};            // key -> older voices still ringing under the newest (the Practice Room's layers)
  const allOf = key => (layered[key] || []).concat(voices[key] ? [voices[key]] : []);
  function stopVoice(v, ms = TIMPANI.dampMs) {
    if (!v || v.stopped) return;
    v.stopped = true;
    const t = Math.max(v.ctx.currentTime, v.t0);
    try { v.out.gain.cancelScheduledValues(t); v.out.gain.setValueAtTime(v.out.gain.value, t); v.out.gain.linearRampToValueAtTime(0, t + ms / 1000); } catch (e) {}
    v.nodes.forEach(o => { try { o.stop(t + ms / 1000 + 0.02); } catch (e) {} });
    v.until = Math.min(v.until, t + ms / 1000);
  }

  /* opts: soft (a tuning tap), at (a context time to play at: scheduled ahead, HEAR IT), vel (× the loudness: the
     Practice Room's dynamics and a roll's strokes), center (0 = the playing spot or farther out … 1 = dead center: the
     THUD), layer (true: the stroke ADDS to the ring instead of restarting it: the Practice Room; the recorded drum's
     strokes always overlap), dyn (the dynamic's loudness, 0–1, without a roll's or an accent's share: the Practice
     Room; it picks the recorded LAYER) */
  function strike(key, f, opts = {}) {
    const o = output();
    if (!o || !(f > 0)) { log({kind: 'strike', key, freq: f, soft: !!opts.soft, played: false, at: opts.at || null}); return false; }
    if (engineWish === 'samples' && (state === 'loading' || state === 'ready')) {
      if (strikeSample(key, f, opts, o)) return true;
    }
    return strikeSynth(key, f, opts, o);
  }
  function strikeSynth(key, f, {soft = false, at = null, vel = 1, center = 0, layer = false} = {}, o) {
    const {ctx, out} = o, T = TIMPANI, t = Math.max(ctx.currentTime + 0.01, at || 0);
    if (layer) {
      const old = (layered[key] || []).filter(v => !v.stopped && ctx.currentTime < v.until);
      if (voices[key] && !voices[key].stopped) old.push(voices[key]);
      while (old.length >= T.layers) stopVoice(old.shift(), 40);
      layered[key] = old;
    } else {
      (layered[key] || []).forEach(v => stopVoice(v, 25)); layered[key] = [];
      stopVoice(voices[key], 25);                         // a new stroke restarts the ring at the current pitch
    }
    const c = Math.max(0, Math.min(1, center)), H = T.thud, mix = (a, b) => a + (b - a) * c;
    const ring = ringOf(f) * mix(1, H.ring), level = T.vol * (soft ? T.tapVol : 1) * vel;
    const vout = ctx.createGain(); vout.gain.value = level; vout.connect(out);
    const v = {ctx, out: vout, nodes: [], modes: [], freq: f, t0: t, until: t + ring, soft, stopped: false, engine: 'synth'};
    // the modes
    T.partials.forEach((p, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(f * p.ratio, t);
      const amp = p.gain * (soft && i > 0 ? T.tapBright : 1) * (i > 0 ? mix(1, H.upper) : 1), tau = ring * p.decay / LN1000;
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
    tg.gain.setValueAtTime(0, t); tg.gain.linearRampToValueAtTime(T.thump.gain * (soft ? 0.6 : 1) * mix(1, H.thump) * 0.5, t + T.attack);
    tg.gain.setTargetAtTime(0, t + T.attack, T.thump.decay / LN1000);
    th.connect(tg); tg.connect(vout); th.start(t); th.stop(t + T.thump.decay + 0.1);
    v.nodes.push(th); v.modes.push({osc: th, ratio: T.thump.ratio});
    // the mallet
    const src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(), ms = T.mallet.ms / 1000;
    src.buffer = noise(ctx);
    bp.type = 'bandpass'; bp.frequency.value = (soft ? T.mallet.tapFreq : T.mallet.freq) * mix(1, H.mallet); bp.Q.value = T.mallet.q;
    ng.gain.setValueAtTime(T.mallet.gain, t); ng.gain.linearRampToValueAtTime(0, t + ms);
    src.connect(bp); bp.connect(ng); ng.connect(vout); src.start(t); src.stop(t + ms + 0.01);
    v.nodes.push(src);
    voices[key] = v;
    log({kind: 'strike', key, freq: f, soft, played: true, engine: 'synth', ring: +ring.toFixed(2), at: at ? t : null, vel: +vel.toFixed(3), center: +c.toFixed(3), layer, thud: c > 0});
    return true;
  }

  /* ================= THE RECORDED DRUMS ================= */
  let engineWish = 'samples', state = 'idle', loadP = null;
  const lastFile = {};                                    // key -> the take that drum played last (ROUND ROBIN)
  const stateFns = [];
  function setState(s) { state = s; stateFns.slice().forEach(fn => { try { fn(s); } catch (e) {} }); }
  const db = x => Math.pow(10, x / 20);
  const cents = (f, hz) => 1200 * Math.log2(f / hz);
  const clampRate = r => Math.max(SAMPLES.minRate, Math.min(SAMPLES.maxRate, r));
  /** the layer a stroke wants: a tap = soft; the Practice Room's dynamic picks; else mid */
  function wantLayer({soft, dyn}) {
    if (soft) return 'soft';
    if (dyn == null) return 'mid';
    return dyn < SAMPLES.dynLayer.soft ? 'soft' : dyn < SAMPLES.dynLayer.mid ? 'mid' : 'loud';
  }
  /** the take for a strike at f: the BEST take is the decoded one with the lowest |cents| + LAYER_COST × layers away;
      ROUND ROBIN turns only among the decoded takes of its group and layer (the same recorded note), never the one
      this drum played last (one picked at random from the rest; a group with one take repeats it) */
  function choose(key, f, want) {
    const wi = LAYERS.indexOf(want), ok = SMP.filter(s => s.buf);
    if (!ok.length) return null;
    const score = s => Math.abs(cents(f, s.hz)) + SAMPLES.LAYER_COST * Math.abs(s.li - wi);
    const best = ok.reduce((a, s) => score(s) < score(a) ? s : a);
    let c = ok.filter(s => s.group === best.group && s.layer === best.layer);
    if (c.length > 1) c = c.filter(s => s.file !== lastFile[key]);
    return c[Math.floor(Math.random() * c.length)];
  }
  function strikeSample(key, f, {soft = false, at = null, vel = 1, center = 0, dyn = null, take = null} = {}, o) {
    const want = take ? take.layer : wantLayer({soft, dyn}), s = take || choose(key, f, want);
    if (!s) return false;                                 // nothing decoded yet: the synth plays this one
    const {ctx, out} = o, now = ctx.currentTime;
    const start = at == null ? now : Math.max(now, at - LEAD_S);   // the hit lands on `at` (a live strike: at once)
    const offset = HIT_OFFSET_S + s.lead, rate = clampRate(f / s.hz);
    // OVERLAP: the drum's earlier strokes ring on under this one (at most MAX_RING; the oldest fades)
    const old = allOf(key).filter(v => !v.stopped && !v.ended && now < v.until);
    while (old.length >= SAMPLES.MAX_RING) stopVoice(old.shift(), SAMPLES.fadeMs);
    layered[key] = old;
    const c = Math.max(0, Math.min(1, center)), H = SAMPLES.thud, mix = (a, b) => a + (b - a) * c;
    const level = SAMPLES.vol * db(SAMPLES.gainDb[s.layer] || 0) * (soft ? SAMPLES.tapVol : 1) * vel * mix(1, H.level);
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = s.buf; src.playbackRate.setValueAtTime(rate, start);
    g.gain.setValueAtTime(level, start);
    let len = Math.max(0.05, (s.buf.duration - offset) / rate);
    let into = g;
    if (c > 0) {                                          // THE CENTER THUD: darker and short
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = Math.exp(Math.log(12000) + (Math.log(H.lowpass) - Math.log(12000)) * c); lp.Q.value = 0.5;
      src.connect(lp); lp.connect(g); into = null;
      const ring = mix(len, H.ring);
      g.gain.setTargetAtTime(0, start + 0.02, ring / LN1000);
      len = Math.min(len, ring + 0.1);
    }
    if (into) src.connect(g);
    g.connect(out);
    src.start(start, offset); src.stop(start + len + 0.02);
    const v = {ctx, out: g, nodes: [src], modes: [], freq: f, t0: start, until: start + len, soft, stopped: false, ended: false,
      engine: 'samples', src, s, rate};
    src.onended = () => { v.ended = true; };
    voices[key] = v; lastFile[key] = s.file;
    log({kind: 'strike', key, freq: f, soft, played: true, engine: 'samples', file: s.file, hz: s.hz, layer: s.layer, want, rate,
      start, offset, at: at != null ? at : null, vel: +vel.toFixed(3), center: +c.toFixed(3), thud: c > 0, ringing: old.length + 1});
    return true;
  }
  /** load the recorded drums: mid, then soft, then loud, `batch` at a time, once the first tap has made the audio (never
      a context of its own). No file at all (none uploaded, a double-clicked page, offline) = 'missing': the synth plays */
  function preload() {
    if (loadP) return loadP;
    setState('loading');
    loadP = new Promise(done => {
      const order = ['mid', 'soft', 'loud'].reduce((a, L) => a.concat(SMP.filter(s => s.layer === L)), []);
      let next = 0, active = 0, ok = 0, failed = 0, over = false;
      const finish = () => {
        if (over) return; over = true;
        if (SMP.some(s => s.buf)) setState('ready');
        else { setState('missing'); if (window.console) console.debug('Pedal Point: no recorded timpani could load (shared/sounds/timpani/); the synth plays.'); }
        done(state);
      };
      const pump = () => {
        if (over) return;
        if (!ok && failed >= SAMPLES.giveUp) return finish();   // (the tests' made-up takes still count as loaded)
        while (active < SAMPLES.batch && next < order.length) {
          const s = order[next++]; active++;
          A.Sfx.fileBuffer(SP.dir + s.file).then(b => {
            if (b) { s.buf = b; s.lead = leadOf(b); ok++; } else failed++;
          }, () => { failed++; }).then(() => { active--; pump(); });
        }
        if (!active && next >= order.length) finish();
      };
      const go = () => {
        if (!A.Sfx || !A.Sfx.fileBuffer || location.protocol === 'file:') { failed = SAMPLES.giveUp; return finish(); }
        if (!(A.Sfx.output && A.Sfx.output())) { setTimeout(go, 300); return; }   // before the first tap (or SOUND OFF)
        pump();
      };
      go();
    });
    return loadP;
  }
  /* a browser that keeps the AAC encoder's priming (silence before the file's own start) shifts every take: find the
     hit (the first 1 ms over a quarter of the peak) and, when it's far past HIT_MS, start that much later */
  function leadOf(b) {
    const d = b.getChannelData(0), w = Math.max(1, Math.round(b.sampleRate / 1000)), n = Math.min(d.length, w * 200);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (!peak) return 0;
    for (let i = 0; i < n; i++) if (Math.abs(d[i]) >= peak / 4) { const ms = i / w; return ms > SP.HIT_MS + 25 ? (ms - SP.HIT_MS - 3) / 1000 : 0; }
    return 0;
  }

  /** THE PEDAL: glide a ringing drum to a new principal (nothing to do when it isn't ringing) */
  function setFreq(key, f) {
    const v = voices[key];
    if (!v || v.stopped || !(f > 0)) return false;
    const t = v.ctx.currentTime;
    if (t > v.until || v.ended) return false;
    const rates = [];
    allOf(key).forEach(x => {
      if (x.stopped || x.ended || t > x.until) return;
      x.freq = f;
      x.modes.forEach(m => { try { m.osc.frequency.setTargetAtTime(f * m.ratio, Math.max(t, x.t0), TIMPANI.glide); } catch (e) {} });
      if (x.src) {                                         // a recorded take: its playbackRate glides (the same glissando)
        const r = clampRate(f / x.s.hz);
        try { x.src.playbackRate.setTargetAtTime(r, Math.max(t, x.t0), TIMPANI.glide); } catch (e) {}
        x.until = Math.max(t, x.t0) + (x.until - Math.max(t, x.t0)) * x.rate / r;   // a faster take ends sooner
        rates.push({file: x.s.file, rate: r});
        x.rate = r;
      }
    });
    glides.push({key, freq: f, tc: TIMPANI.glide, at: Math.round(now()), rates: rates.length ? rates : null}); if (glides.length > 200) glides.shift();
    return true;
  }
  const live = v => !v.stopped && !v.ended && v.ctx.currentTime < v.until;
  const ringing = key => allOf(key).some(live);
  function damp(key) { allOf(key).forEach(v => stopVoice(v)); layered[key] = []; }
  function stopAll() { Object.keys(voices).forEach(k => damp(k)); pipes.slice().forEach(p => p.stop()); }

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
    TIMPANI, PIPE, ROLL, SAMPLES, HIT_OFFSET_S, LEAD_S, strike, setFreq, damp, stopAll, pipe, piping, ringing, ringOf,
    /** the DRUM SOUND setting: 'samples' (RECORDED) or 'synth' */
    engine: () => engineWish,
    setEngine(name) {
      const n = name === 'synth' ? 'synth' : 'samples';
      if (n !== engineWish) { engineWish = n; Object.keys(voices).forEach(k => damp(k)); }
      if (n === 'samples') preload();
      return engineWish;
    },
    preload, samplesState: () => state,
    onSamples(fn) { stateFns.push(fn); return () => { const i = stateFns.indexOf(fn); if (i >= 0) stateFns.splice(i, 1); }; },
    /** the sample table as it is this visit (THE SAMPLE TUNER nudges `hz` here; nothing is saved) */
    samples: SMP, SAMPLE_DIR: SP.dir,
    /** THE SAMPLE TUNER: one take at its own rate (its hz), no drum key of the game's */
    playSample(file, {vel = 1} = {}) {
      const o = output(), s = SMP.find(x => x.file === file);
      if (!o || !s || !s.buf) return false;
      return strikeSample('tuner', s.hz, {vel, take: s}, o);
    },
    test: {
      principal: key => voices[key] ? voices[key].freq : null,
      /** the frequencies every mode is headed for (principal × each ratio, the thump last; a recorded take: its principal) */
      partials: key => voices[key] ? (voices[key].src ? [voices[key].freq] : voices[key].modes.map(m => voices[key].freq * m.ratio)) : [],
      /** the oscillators' own frequency right now (what the audio engine is playing) */
      live: key => voices[key] ? (voices[key].src ? [voices[key].s.hz * voices[key].src.playbackRate.value] : voices[key].modes.map(m => m.osc.frequency.value)) : [],
      ringing, history, glides,
      voiceStart: key => voices[key] ? voices[key].t0 : null,
      voices: key => allOf(key).filter(live).length,
      /** the recorded takes: {loaded, total, missing: [files that didn't load], state} */
      samples: () => ({loaded: SMP.filter(s => s.buf).length, total: SMP.length, missing: state === 'idle' || state === 'loading' ? [] : SMP.filter(s => !s.buf).map(s => s.file), state}),
      /** the take a drum is playing now: {file, hz, layer, rate (its playbackRate's target), start, offset} */
      take: key => { const v = voices[key]; return v && v.src ? {file: v.s.file, hz: v.s.hz, layer: v.s.layer, rate: v.rate, live: v.src.playbackRate.value, start: v.t0} : null; },
      /** tests in a browser that can't decode AAC (the open-source Chromium): every take gets a made-up buffer (a
          decaying sine at its hz, the hit at HIT_MS) so the engine's picking, rates and overlap can be checked */
      fakeBuffers() {
        const o = A.Sfx && A.Sfx.output && A.Sfx.output(); if (!o) return false;
        const ctx = o.ctx, sr = ctx.sampleRate;
        SMP.forEach(s => {
          const n = Math.round(sr * s.sec), b = ctx.createBuffer(1, n, sr), d = b.getChannelData(0), h = Math.round(sr * SP.HIT_MS / 1000);
          for (let i = h; i < n; i++) d[i] = 0.2 * Math.sin(2 * Math.PI * s.hz * (i - h) / sr) * Math.exp(-(i - h) / sr / (s.sec / 5));
          s.buf = b; s.lead = 0;
        });
        loadP = loadP || Promise.resolve('ready'); setState('ready');
        return true;
      },
    },
  };
})(window.Arcade);
