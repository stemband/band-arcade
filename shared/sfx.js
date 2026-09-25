/* Band Arcade — sound effects for the arcade floor and Select Player ONLY.
   Never load this on a game page or the Note Checker: those pages listen to the microphone,
   and any sound would be heard as a note.
   Every sound is made here with the Web Audio API (no audio files). Browsers only allow sound
   after the first tap or key press, so the AudioContext is created then, never on page load.
     Arcade.Sfx.play('whoosh' | 'coin' | 'blip')   does nothing when muted or before the first tap
     Arcade.Sfx.playThenGo(name, href)              plays, waits GO_DELAY ms, then navigates
     Arcade.Sfx.mountControls(el)                   SOUND and AMBIENCE buttons (saved via Arcade.store) */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const VOLUME = 0.22;        // effects: gentle
  const AMBIENCE_VOL = 0.05;  // the room hum: quieter still
  const GO_DELAY = 300;       // ms the coin/blip gets before the page changes

  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, amb = null;

  /* ---------- unlock on the first tap / key press ---------- */
  function unlock() {
    if (!AC) return;
    try {
      if (!ctx) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = VOLUME;
        master.connect(ctx.destination);
      }
      if (ctx.state !== 'running') ctx.resume().then(unlocked, () => {}); else unlocked();
    } catch (e) { /* no sound on this browser; everything else still works */ }
  }
  function unlocked() {
    if (ctx.state !== 'running') return;
    UNLOCK_EVENTS.forEach(t => removeEventListener(t, unlock, true));
    syncAmbience();
  }
  // pointerdown/keydown are the first chance; touchend/click are backups for older iPads that only unlock on those
  const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend', 'click'];
  UNLOCK_EVENTS.forEach(t => addEventListener(t, unlock, true));

  /* true once this page has had a tap. A context made by that same tap may still be starting
     ("suspended"); sounds scheduled now play as soon as it runs, so the first tap still clicks. */
  function ready() {
    if (!ctx || ctx.state === 'closed' || !A.store.sfx) return false;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return true;
  }

  /* ---------- building blocks ---------- */
  /** one square-wave note: freq (Hz, or [from, to] to slide), start offset, length (s), peak volume */
  function tone(freq, at, len, vol = 1, type = 'square') {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    const [f0, f1] = Array.isArray(freq) ? freq : [freq, freq];
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + len + 0.02);
  }
  let noiseBuf = null;
  function noise() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; return s;
  }

  const SOUNDS = {
    /* carousel turn: a short filtered-noise whoosh with a soft click on the front */
    whoosh() {
      const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.Q.value = 1.2;
      f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(350, t + 0.18);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      n.connect(f); f.connect(g); g.connect(master);
      n.start(t); n.stop(t + 0.22);
      tone(1400, 0, 0.018, 0.25);
    },
    /* START: the classic two-note coin (B5 then E6) */
    coin() {
      tone(988, 0, 0.08, 0.5);
      tone(1319, 0.075, 0.24, 0.5);
    },
    /* instrument chosen: a quick rising blip */
    blip() {
      tone([660, 1320], 0, 0.07, 0.45);
      tone(1760, 0.07, 0.06, 0.3);
    },
  };

  /* ---------- the arcade-room ambience: a low electrical hum and a little room noise ---------- */
  function startAmbience() {
    if (amb || !ctx) return;
    const out = ctx.createGain(), lp = ctx.createBiquadFilter();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(AMBIENCE_VOL, ctx.currentTime + 1.5);   // fade in, never pops
    lp.type = 'lowpass'; lp.frequency.value = 300;
    lp.connect(out); out.connect(ctx.destination);     // not through master: its level is set on its own
    const hum = [60, 60.7, 120].map((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; g.gain.value = i === 2 ? 0.15 : 0.35;
      o.connect(g); g.connect(lp); o.start(); return o;
    });
    const n = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.loop = true; nf.type = 'lowpass'; nf.frequency.value = 700; ng.gain.value = 0.25;
    n.connect(nf); nf.connect(ng); ng.connect(out); n.start();
    amb = {out, nodes: [...hum, n]};
  }
  function stopAmbience() {
    if (!amb) return;
    const {out, nodes} = amb, t = ctx.currentTime;
    amb = null;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    nodes.forEach(o => o.stop(t + 0.35));
  }
  function syncAmbience() {
    if (!ctx || ctx.state !== 'running') return;
    if (A.store.sfx && A.store.ambience && !document.hidden) startAmbience(); else stopAmbience();
  }
  document.addEventListener('visibilitychange', syncAmbience);
  addEventListener('pagehide', stopAmbience);
  addEventListener('pageshow', e => { if (e.persisted) syncAmbience(); });   // back button restores the page

  /* ---------- controls ---------- */
  function mountControls(el) {
    el.innerHTML =
      `<button class="snd-btn" type="button" data-k="sfx" aria-label="Sound effects"><svg class="snd-ico" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M3 9h4l5-4v14l-5-4H3z"/><path class="waves" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/><path class="x" d="M16 9l6 6M22 9l-6 6"/></svg><span class="snd-txt"></span></button>` +
      `<button class="snd-btn" type="button" data-k="ambience" aria-label="Arcade ambience"><span class="snd-txt"></span></button>`;
    const [bs, ba] = el.querySelectorAll('button');
    function draw() {
      const on = A.store.sfx, amOn = A.store.ambience;
      bs.setAttribute('aria-pressed', on); bs.querySelector('.snd-txt').textContent = on ? 'Sound on' : 'Sound off';
      ba.setAttribute('aria-pressed', amOn); ba.querySelector('.snd-txt').textContent = amOn ? 'Ambience on' : 'Ambience off';
      ba.classList.toggle('muted', !on);   // ambience follows the main switch
    }
    bs.addEventListener('click', () => { A.store.setSfx(!A.store.sfx); draw(); syncAmbience(); if (A.store.sfx) Sfx.play('blip'); });
    ba.addEventListener('click', () => { A.store.setAmbience(!A.store.ambience); draw(); syncAmbience(); });
    draw();
  }

  let leaving = false;
  const Sfx = A.Sfx = {
    play(name) {
      if (!ready() || !SOUNDS[name]) return false;
      try { SOUNDS[name](); return true; } catch (e) { return false; }
    },
    /** play a sound, then go to href after GO_DELAY ms (straight away when muted) */
    playThenGo(name, href) {
      if (leaving) return;                 // a second tap during the wait does nothing
      leaving = true;
      setTimeout(() => { leaving = false; }, 2000);
      if (Sfx.play(name)) setTimeout(() => { location.href = href; }, GO_DELAY);
      else location.href = href;
    },
    mountControls,
  };
})(window.Arcade);
