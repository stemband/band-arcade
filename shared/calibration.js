/* TIMING: THE AUDIO CLOCK and THE TIMING CHECK (calibration), shared by the play-along games (Music Highway, Rhythm Dojo).

   THE AUDIO CLOCK: what the student HEARS is the arcade's AudioContext (Arcade.Sfx.output()) a little later than its
   currentTime says (the output latency). A clock reads the AUDIBLE context time (getOutputTimestamp, else currentTime −
   outputLatency), smoothed so frame-by-frame jitter never shakes anything on screen; with no audio (sound off) it runs on
   performance.now().
     const clk = Arcade.AudioClock.create();
     clk.start()        at the start of a song/round: takes the arcade's output (clk.ctx, clk.out; null = sound off)
     clk.sample()       once per frame (keeps the smoothed offset current)
     clk.audAt(p)       the context seconds heard at performance.now() ms p (attack and tap times go through this)
     clk.now()          the context's currentTime (schedule sounds ahead of it)

   THE TIMING CHECK: the student plays/claps/taps along with clicks; the median offset between their attacks and the
   clicks is the delay of THIS device's microphone (or touch screen) + speakers, which the game subtracts from every attack.
     Arcade.Calibration.analyse({clicks, lead, attacks, audAt, rules, accept}) -> result
       clicks   the context times of every click (the first `lead` are for listening only)
       attacks  [{time (performance ms), level, pc}]
       accept(a, bleed) optional: may this attack be the student? (default: level above rules.bleedK × the bleed, the
                loudest attack heard near a listening click, when nobody was playing yet)
       rules    {bleedMs, bleedK, maxLagMs, calNeed, calMinSpreadMs, calClickMaxMs, calTooEarlyMs}
       result   {offs, median, spread, accepted, rejectedAsClick, bleed, clickLike, ok, why ('click'|'few'|'none'|null)}
     A round that is machine-steady near 0 ms, or far too early, is the click itself (the microphone heard the speaker):
     it's refused (why 'click'), so a click can never calibrate the game. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  function create() {
    const C = {ctx: null, out: null, off: null, p0: 0,
      start() {
        const o = A.Sfx && A.Sfx.output();
        C.ctx = o ? o.ctx : null; C.out = o ? o.out : null; C.off = null; C.p0 = performance.now();
        if (C.ctx && C.ctx.state !== 'running') C.ctx.resume().catch(() => {});
        C.sample();
        return C;
      },
      sample() {
        const c = C.ctx, p = performance.now();
        if (!c) return;
        let raw = null;
        try { const ts = c.getOutputTimestamp && c.getOutputTimestamp(); if (ts && ts.performanceTime > 0 && ts.contextTime > 0) raw = ts.contextTime + (p - ts.performanceTime) / 1000; } catch (e) {}
        if (raw == null) raw = c.currentTime - (c.outputLatency || c.baseLatency || 0);
        const s = raw - p / 1000;
        if (C.off == null || Math.abs(s - C.off) > .06) C.off = s; else C.off += (s - C.off) * .04;
      },
      audAt: p => C.ctx ? p / 1000 + C.off : (p - C.p0) / 1000,
      now: () => C.ctx ? C.ctx.currentTime : (performance.now() - C.p0) / 1000,
    };
    return C;
  }

  function analyse({clicks, lead, attacks, audAt, rules: R, accept}) {
    const near = (a, c) => Math.abs(audAt(a.time) - c) * 1000 <= R.bleedMs;
    const bleed = Math.max(0, ...attacks.filter(a => a.level != null && clicks.slice(0, lead).some(c => near(a, c))).map(a => a.level));
    const ok = accept ? a => accept(a, bleed) : a => a.level == null || !bleed || a.level > bleed * R.bleedK;
    const heard = attacks.filter(a => audAt(a.time) > clicks[lead] - R.maxLagMs / 1000);
    const good = heard.filter(ok), clicky = heard.length - good.length;
    const offs = [];
    clicks.slice(lead).forEach(c => {
      const d = good.map(a => (audAt(a.time) - c) * 1000).filter(x => Math.abs(x) <= R.maxLagMs).sort((a, b) => Math.abs(a) - Math.abs(b))[0];
      if (d != null) offs.push(d);
    });
    offs.sort((a, b) => a - b);
    const median = offs.length ? offs[Math.floor(offs.length / 2)] : null;
    const mean = offs.length ? offs.reduce((a, b) => a + b, 0) / offs.length : 0;
    const spread = offs.length > 1 ? Math.sqrt(offs.reduce((s, x) => s + (x - mean) ** 2, 0) / offs.length) : 0;
    const clickLike = median != null && offs.length >= R.calNeed && ((spread < R.calMinSpreadMs && Math.abs(median) < R.calClickMaxMs) || median < -R.calTooEarlyMs);
    const why = clickLike || (offs.length < R.calNeed && clicky >= R.calNeed) ? 'click' : offs.length < R.calNeed || median == null ? (offs.length ? 'few' : 'none') : null;
    return {offs, median, spread: +spread.toFixed(1), accepted: offs.length, rejectedAsClick: clicky, bleed: +bleed.toFixed(4), clickLike, ok: !why, why};
  }

  A.AudioClock = {create};
  A.Calibration = {analyse};
})(window.Arcade);
