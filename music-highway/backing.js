/* Music Highway: THE BACKING BAND, generated with Web Audio on the arcade's own output (Arcade.Sfx.output(): the first
   tap unlocks it; SOUND ON/OFF and the EFFECTS slider apply). Everything is SCHEDULED on the AudioContext's clock, never
   with timers, so the groove can't drift from the highway over a whole song.

   THE DRUMS (always): unpitched noise only (a snare, a closed hi-hat, stick clicks for the count-in) and a very short
   kick (a 70 ms thump, gone before the note detector could read it as a note). No toms, nothing pitched. The note
   detector ignores them: a hit only counts with the right PITCH (drums have none), and a snare player's hits must be
   louder than the drums the microphone hears back (game.js measures that during the count-in).
   HEADPHONES MODE (only after the speaker check proves the microphone can't hear the speakers): a quiet guide melody,
   a bass line and soft chords on top. THE ONLY OTHER PITCHED AUDIO IN THE ARCADE BESIDES LOST SIGNAL (see CLAUDE.md).

     Arcade.MHBacking.create(ctx, out) -> kit with
       kick(t, v) · snare(t, v) · hat(t, v) · click(t, v, accent)       drums at context time t
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

  function create(ctx, out) {
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
      click(t, v = 1, accent = false) { noise(t, (accent ? .55 : .4) * v, .03, [['bandpass', accent ? 3400 : 2600, 4]]); },
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

  A.MHBacking = {create, groove, GROOVES};
})(window.Arcade);
