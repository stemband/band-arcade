/* Music Highway: THE BACKING BAND, generated with Web Audio on the arcade's own output (Arcade.Sfx.output(): the first
   tap unlocks it; SOUND ON/OFF and the EFFECTS slider apply). Everything is SCHEDULED on the AudioContext's clock, never
   with timers, so the groove can't drift from the highway over a whole song.

   THE DRUMS (always): unpitched noise only (a snare, a closed hi-hat, stick clicks for the count-in) and a very short
   kick (a 70 ms thump, gone before the note detector could read it as a note). No toms, nothing pitched. The note
   detector ignores them: a hit only counts with the right PITCH (drums have none), and a snare player's hits must be
   louder than the drums the microphone hears back (game.js measures that during the count-in).
   HEADPHONES MODE (only after the speaker check proves the microphone can't hear the speakers): a quiet guide melody,
   a bass line and soft chords on top. THE ONLY OTHER PITCHED AUDIO IN THE ARCADE BESIDES LOST SIGNAL (see CLAUDE.md).

     Arcade.MHBacking.create(ctx, out, {click}) -> kit with (click = the uploaded mh-click AudioBuffer, or null)
       kick(t, v) · snare(t, v) · hat(t, v) · click(t, v, accent)       drums at context time t
         click() returns its PEAK (full scale = 1): the count-in keeps the drums under the headroom that's left
       tone(t, midi, dur, vol, kind)   kind 'guide' (triangle), 'bass' (sine + a touch of triangle), 'pad' (two sines)
       file(t, buffer, offset, rate)   the uploaded backing-drums file, from `offset` seconds into it
       stopAll()                       stops everything scheduled or sounding (pause, quit)
       count()                         how many sounds are still waiting to start (tests)
     Arcade.MHBacking.groove(style, beatsPerMeasure) -> [[beat, 'kick'|'snare'|'hat', velocity], …] for one measure */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  /* ONE MEASURE of each groove: [beat position (0 = beat 1), drum, velocity 0–1] */
  const GROOVES = {
    rock: [[0, 'kick', 1], [0, 'hat', .7], [.5, 'hat', .45], [1, 'snare', .9], [1, 'hat', .6], [1.5, 'hat', .45],
           [2, 'kick', .9], [2.5, 'kick', .5], [2, 'hat', .7], [2.5, 'hat', .45], [3, 'snare', .9], [3, 'hat', .6], [3.5, 'hat', .45]],
    march: [[0, 'kick', 1], [1, 'snare', .8], [1.5, 'snare', .45], [2, 'kick', .9], [3, 'snare', .8], [3.25, 'snare', .35], [3.5, 'snare', .5],
            [0, 'hat', .5], [1, 'hat', .4], [2, 'hat', .5], [3, 'hat', .4]],
    swing: [[0, 'kick', .8], [0, 'hat', .7], [1, 'hat', .6], [1.667, 'hat', .4], [1, 'snare', .55], [2, 'kick', .7], [2, 'hat', .7],
            [3, 'hat', .6], [3.667, 'hat', .4], [3, 'snare', .55]],
    waltz: [[0, 'kick', 1], [0, 'hat', .6], [1, 'snare', .6], [1, 'hat', .45], [2, 'snare', .6], [2, 'hat', .45]],
  };
  const MARCH2 = [[0, 'kick', 1], [0, 'hat', .6], [.5, 'hat', .4], [1, 'snare', .85], [1, 'hat', .5], [1.5, 'snare', .4], [1.5, 'hat', .4]];
  const ROCK2 = [[0, 'kick', 1], [0, 'hat', .6], [.5, 'hat', .4], [1, 'snare', .85], [1, 'hat', .5], [1.5, 'hat', .4]];
  function groove(style, per) {
    if (per === 2) return style === 'march' ? MARCH2 : ROCK2;
    if (per === 3) return GROOVES.waltz;
    return GROOVES[style] || GROOVES.rock;
  }

  /* THE CLICK (count-in + the timing check): a woodblock / stick-click made of noise (no pitch the note detector could
     take for a note), rendered ONCE per sample rate and normalized so its loudest sample is exactly 1: played at level v
     it can never go past v (so clickVol 1 = full scale, never clipped). Two resonant noise bands (the "wood"), a very
     short bright transient (the "stick"); most of the energy between 1.5 and 4 kHz so small speakers carry it; 55 ms.
     The DOWNBEAT is the same click tuned about 15 % higher and CLICK.weak × louder than the others. */
  const CLICK = {len: .055, weak: .72, lo: [1850, 2800], hi: [2150, 3200], q: [2.6, 2.4], tau: [.012, .007], mix: [1, .55],
    stick: {f: 2600, q: 1.3, tau: .0015, mix: .6}, attack: .0005};
  const clickCache = {};
  function bandpass(x, fs, f, q) {                                     // an RBJ band-pass (0 dB peak) over a whole buffer
    const w = 2 * Math.PI * f / fs, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
    return y;
  }
  function renderClick(ctx, accent) {
    const fs = ctx.sampleRate, key = fs + (accent ? 'hi' : 'lo');
    if (clickCache[key]) return clickCache[key];
    const n = Math.round(CLICK.len * fs), out = new Float32Array(n);
    let seed = accent ? 11 : 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const noise = Float32Array.from({length: n}, rnd), fr = accent ? CLICK.hi : CLICK.lo;
    const layer = (y, tau, mix) => { for (let i = 0; i < n; i++) { const t = i / fs; out[i] += y[i] * mix * Math.min(1, t / CLICK.attack) * Math.exp(-t / tau); } };
    fr.forEach((f, k) => layer(bandpass(noise, fs, f, CLICK.q[k]), CLICK.tau[k], CLICK.mix[k]));
    layer(bandpass(noise, fs, CLICK.stick.f, CLICK.stick.q), CLICK.stick.tau, CLICK.stick.mix);
    let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
    for (let i = 0; i < n; i++) out[i] /= peak || 1;
    const fade = Math.round(.004 * fs); for (let i = 0; i < fade; i++) out[n - 1 - i] *= i / fade;   // no click at the end of the click
    const buf = ctx.createBuffer(1, n, fs); buf.getChannelData(0).set(out);
    return (clickCache[key] = buf);
  }
  const peakOf = new WeakMap();
  function bufferPeak(buf) {
    if (peakOf.has(buf)) return peakOf.get(buf);
    let p = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) p = Math.max(p, Math.abs(d[i])); }
    peakOf.set(buf, p || 1); return p || 1;
  }

  function create(ctx, out, opts = {}) {
    const master = ctx.createGain(); master.gain.value = 1; master.connect(out);
    // one second of white noise, made once
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const live = [];                                                  // [{node, t}] sounds scheduled, for stopAfter
    const keep = (node, t) => { live.push({node, t}); node.onended = () => { const i = live.findIndex(x => x.node === node); if (i >= 0) live.splice(i, 1); }; };

    function env(t, v, attack, len) {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      g.connect(master);
      return g;
    }
    function noise(t, v, len, filters) {
      const src = ctx.createBufferSource(); src.buffer = nb;
      let node = src;
      filters.forEach(([type, f, q]) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; node.connect(b); node = b; });
      node.connect(env(t, v, .002, len));
      src.start(t, Math.random() * .5); src.stop(t + len + .02);
      keep(src, t);
    }
    const kit = {
      kick(t, v = 1) {                                               // a 70 ms thump: a fast falling sine, no ring
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(48, t + .06);
        o.connect(env(t, .55 * v, .003, .07)); o.start(t); o.stop(t + .09); keep(o, t);
      },
      snare(t, v = 1) { noise(t, .42 * v, .13, [['highpass', 900], ['bandpass', 2200, .7]]); },
      hat(t, v = 1) { noise(t, .16 * v, .045, [['highpass', 7000]]); },
      /** the click at level v (clamped to 0–1; the downbeat full, the others CLICK.weak): the uploaded mh-click if there is
          one (normalized to its own peak; the downbeat played 12 % faster = higher), else the generated woodblock */
      click(t, v = 1, accent = false) {
        const lv = Math.min(1, Math.max(0, v)) * (accent ? 1 : CLICK.weak);
        const src = ctx.createBufferSource(), g = ctx.createGain();
        if (opts.click instanceof AudioBuffer) { src.buffer = opts.click; src.playbackRate.value = accent ? 1.12 : 1; g.gain.value = lv / bufferPeak(opts.click); }
        else { src.buffer = renderClick(ctx, accent); g.gain.value = lv; }
        src.connect(g); g.connect(master); src.start(t); keep(src, t);
        return lv;
      },
      tone(t, midi, dur, vol, kind = 'guide') {
        const g = ctx.createGain(), f = freq(midi), rel = kind === 'pad' ? .25 : .08;
        const att = kind === 'pad' ? .12 : .015;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + att);
        g.gain.setValueAtTime(vol, t + Math.max(att, dur - rel));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
        g.connect(master);
        const waves = kind === 'bass' ? [['sine', 1], ['triangle', .25]] : kind === 'pad' ? [['sine', .6], ['sine', .4, 1.003]] : [['triangle', 1]];
        waves.forEach(([type, lv, det = 1]) => {
          const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f * det; og.gain.value = lv;
          o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + rel + .05); keep(o, t);
        });
      },
      file(t, buf, offset = 0, rate = 1) {
        const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
        const g = ctx.createGain(); g.gain.value = 1; src.connect(g); g.connect(master);
        src.start(t, Math.max(0, offset)); keep(src, t);
        return src;
      },
      stopAll() {
        live.slice().forEach(x => { try { x.node.stop(); } catch (e) {} });
        live.length = 0;
      },
      fade(s = .15) { const n = ctx.currentTime; master.gain.cancelScheduledValues(n); master.gain.setValueAtTime(master.gain.value, n); master.gain.linearRampToValueAtTime(0, n + s); },
      count: () => live.filter(x => x.t > ctx.currentTime).length,
      ctx,
    };
    return kit;
  }

  A.MHBacking = {create, groove, renderClick, CLICK, GROOVES};
})(window.Arcade);
