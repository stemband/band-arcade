/* Arcade.tones: pitched tones at exact pitches (A440 equal temperament), through the arcade's own audio
   (shared/sfx.js: the first tap unlocks it; mute and the EFFECTS slider apply).
   THE ONE EXCEPTION TO "games never play pitched audio": ONLY Lost Signal uses this (see CLAUDE.md). It takes turns:
   the game pauses the microphone (Arcade.Pitch.pauseListening(true)) before a pattern plays, and listens again only
   when it has fully faded (done + 400 ms), with Arcade.Pitch.ignoreCurrent(). Never play tones while listening.

     Arcade.tones.play(midis, {noteMs, gapMs, vol, onNote(i, midi)}) -> {dur (s), done (a Promise), stop()}
         midis = SOUNDING midi notes, played one after another: a soft synth voice (a triangle wave with a touch of
         square for a retro edge, a short attack and a gentle release). dur = until the last release has faded.
         onNote(i) is called as each note starts (for the waveform and the radar ping). Sound off or not unlocked:
         dur 0, {muted: true}.
     Arcade.tones.test()      one soft test tone (Lost Signal's SIGNAL CHECK), same as play([69])
     Arcade.tones.freq(midi)  440 × 2^((midi − 69) / 12)
     Arcade.tones.history     the last 30 patterns played (tests)
   Loaded after sfx.js. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const ATTACK = 0.02, RELEASE = 0.12, SUSTAIN = 0.7;
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  const history = [];

  function voice(ctx, out, f, t, len, vol) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ATTACK);
    g.gain.exponentialRampToValueAtTime(vol * SUSTAIN, t + ATTACK + 0.08);
    g.gain.setValueAtTime(vol * SUSTAIN, t + Math.max(ATTACK + 0.08, len));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + RELEASE);
    g.connect(out);
    const oscs = [['triangle', 1], ['square', 0.07]].map(([type, level]) => {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t); og.gain.value = level;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + len + RELEASE + 0.05);
      return o;
    });
    return oscs;
  }

  function play(midis, {noteMs = 700, gapMs = 120, vol = 0.45, onNote} = {}) {
    const o = A.Sfx && A.Sfx.output && A.Sfx.output();
    if (!o || !midis.length) return {dur: 0, muted: true, done: Promise.resolve(), stop() {}};
    const {ctx, out} = o;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    const len = noteMs / 1000, step = (noteMs + gapMs) / 1000, t0 = ctx.currentTime + 0.08;
    const oscs = [], timers = [];
    midis.forEach((m, i) => {
      oscs.push(...voice(ctx, out, freq(m), t0 + i * step, len, vol));
      if (onNote) timers.push(setTimeout(() => onNote(i, m), (0.08 + i * step) * 1000));
    });
    const dur = 0.08 + (midis.length - 1) * step + len + RELEASE;
    history.push({midis: midis.slice(), noteMs, gapMs, dur: +dur.toFixed(3), at: Math.round(performance.now())});
    if (history.length > 30) history.shift();
    let stopped = false, finish;
    const done = new Promise(r => { finish = r; timers.push(setTimeout(r, dur * 1000)); });
    return {dur, done, stop() {
      if (stopped) return; stopped = true;
      timers.forEach(clearTimeout);
      const t = ctx.currentTime;
      oscs.forEach(x => { try { x.stop(t + 0.03); } catch (e) {} });
      finish();
    }};
  }

  A.tones = {play, test: () => play([69], {noteMs: 900}), freq, history};
})(window.Arcade);
