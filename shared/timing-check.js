/* THE TIMING CHECK FLOW (moved out of Rhythm Dojo, so every game runs the SAME check: Rhythm Dojo, Showtime
   Malfunction's snare card): 4 clicks to listen to, then clap / tap / hit on the next 8; shared/calibration.js's
   analyse() finds this device's delay (a round that is really the click itself is refused) and Calibration.store()
   keeps it for the whole arcade (gameData('rhythm-dojo').calib[key]: the Arcade Backup Code carries it).
   The clicks go straight to the arcade's raw output (music-highway/backing.js's kit, never Sfx.event), on a MENU only:
   never during play (a sound while a game listens would mute the microphone).
     Arcade.TimingCheck.open({els, tap, first, rules, clock, kit, key, gameId, words, onClose})
       els     {panel, title, msg, dots, say, pad, go, skip}: the game's own panel (an .overlay with those parts)
       tap     true = the touch pad / Space (no microphone), false = the microphone (claps, snare hits: shared/onsets.js)
       first   the first check on this device ("First, a quick timing check.", "Skip for now")
       rules   {calLead, calClicks, calBpm, calNeed, maxLagMs, calMinSpreadMs, calClickMaxMs, calTooEarlyMs, bleedMs,
               bleedK, clickVol} (Rhythm Dojo: RD_RULES; Showtime Malfunction: SNARE_RULES.timing)
       clock   an Arcade.AudioClock.create();   kit(raw) -> a backing.js kit on Sfx.outputRaw() (null = sound off)
       key     'clap' | 'tap' (where it's saved: the snare is heard like claps)
       gameId  its menu music comes back when the panel closes
       words   {what: 'clapping', act: 'clap', Act: 'Clap', noun: 'claps', title?} (the default: claps; tap mode: tapping)
       onClose(ok)
     Arcade.TimingCheck.state() -> {clicks (context times), last (the last result), running}   (tests) */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  let run = null, last = null, O = null;

  function open(o) {
    O = o;
    const {els: E, tap, first, rules: R} = o;
    const W = Object.assign(tap ? {what: 'tapping', act: 'tap the pad (or press Space)', Act: 'Tap', noun: 'taps'}
      : {what: 'clapping', act: 'clap', Act: 'Clap', noun: 'claps'}, o.words || {});
    E.title.textContent = 'Timing check (' + (W.title || W.what) + ')';
    E.msg.textContent = (first ? 'First, a quick timing check. ' : '') + `Every microphone, screen and speaker adds a tiny delay. Listen to ${R.calLead} clicks, then ${W.act} on each of the next ${R.calClicks} clicks, right with them.`;
    E.dots.innerHTML = Array.from({length: R.calLead + R.calClicks}, (_, k) => `<i class="${k < R.calLead ? 'lead' : ''}"></i>`).join('');
    E.say.textContent = '';
    E.pad.hidden = true;
    E.go.hidden = false; E.go.textContent = 'Start';
    E.skip.textContent = first ? 'Skip for now' : 'Cancel';
    E.panel.hidden = false; E.go.focus();
    const close = ok => {
      E.panel.hidden = true;
      if (run) { clearInterval(run.timer); if (run.kit) run.kit.stopAll(); if (run.sub) run.sub.stop(); }
      run = null; A.Pitch.pauseListening(true);
      if (o.gameId) A.Sfx.gameMenuMusic(o.gameId);
      O = null;
      if (o.onClose) o.onClose(ok);
    };
    E.skip.onclick = () => close(false);
    E.go.onclick = () => {
      E.go.hidden = true;
      if (o.gameId) A.Sfx.gameMenuMusic(o.gameId, false);
      const CLK = o.clock;
      CLK.start();
      const k2 = o.kit(true), spb = 60 / R.calBpm, t0 = CLK.now() + .6, n = R.calLead + R.calClicks;
      const clicks = Array.from({length: n}, (_, k) => t0 + k * spb);
      if (k2) clicks.forEach((t, k) => k2.click(t, R.clickVol, k % 4 === 0));
      run = {attacks: [], clicks, kit: k2, tap};
      if (tap) E.pad.hidden = false;
      else { A.Pitch.pauseListening(false); A.Onsets.ensure(); run.sub = A.Onsets.listen(x => run && run.attacks.push({time: x.time, level: x.level})); }
      const dots = E.dots.children;
      run.timer = setInterval(() => {
        CLK.sample();
        const now = CLK.audAt(performance.now()), k = clicks.findIndex(t => t > now) - 1, kk = k < 0 ? (now > clicks[n - 1] ? n - 1 : -1) : k;
        [...dots].forEach((d, j) => d.classList.toggle('on', j <= kk));
        E.say.textContent = kk < 0 ? 'Get ready…' : kk < R.calLead ? `Listen… ${R.calLead - kk}` : `${W.Act} on every click!`;
        if (now > clicks[n - 1] + .7) { clearInterval(run.timer); done(); }
      }, 40);
    };
    function done() {
      A.Pitch.pauseListening(true);
      if (run.sub) run.sub.stop();
      E.pad.hidden = true;
      const CLK = o.clock;
      const res = A.Calibration.analyse({clicks: run.clicks, lead: R.calLead, attacks: run.attacks, audAt: p => CLK.audAt(p), rules: R});
      last = res;
      if (!res.ok) {
        E.say.textContent = res.why === 'click' ? `I heard the click, not your ${W.noun}. Try ${W.what} a little louder or moving the device a bit farther from the speaker.`
          : res.accepted ? `I heard ${res.accepted} of ${R.calClicks}. ${W.Act} right on each click. Let's try again!`
          : `I didn't hear anything. ${tap ? 'Tap the pad or press Space' : `Check the microphone and ${W.act} a little louder`}. Let's try again!`;
        E.go.hidden = false; E.go.textContent = 'Try again';
        return;
      }
      A.Calibration.store(o.key, res);
      E.say.textContent = `All set! Your timing check: ${Math.round(res.median)} ms.`;
      setTimeout(() => close(true), 1100);
    }
    // the pad (tap mode) and Space: bound once per panel
    if (!E.pad._tc) {
      E.pad._tc = true;
      E.pad.addEventListener('pointerdown', e => { e.preventDefault(); if (run && O && O.els.pad === E.pad) run.attacks.push({time: e.timeStamp || performance.now(), level: null}); E.pad.classList.add('down'); });
      E.pad.addEventListener('pointerup', () => E.pad.classList.remove('down'));
    }
  }
  addEventListener('keydown', e => {                                   // Space on the clicks (the panel's button has gone)
    if (!O || O.els.panel.hidden) return;
    if (e.key === ' ' && run && run.tap && !e.repeat) { e.preventDefault(); run.attacks.push({time: performance.now(), level: null}); }
    if (e.key === ' ' && run && !run.tap && A.DEMO && !e.repeat) { e.preventDefault(); A.Onsets.fake(performance.now(), .3); }
  });

  A.TimingCheck = {open, state: () => ({clicks: run ? run.clicks.slice() : null, last, running: !!run})};
})(window.Arcade);
