/* Band Arcade — sound effects for the arcade floor, Select Player, and games that DON'T use the
   microphone (Note Ninja, Chime Heist, Ancient Ninja Scrolls, Button Masher). Never load this on a page that
   listens to the mic (Ghost Notes, Note Storm, the Note Checker): any sound would be heard as a note.
   The one exception is Neon Face-Off: it mutes the detector for each sound it plays (Arcade.Pitch.suppress).
   Every sound is made here with the Web Audio API (no audio files). Browsers only allow sound
   after the first tap or key press, so the AudioContext is created then, never on page load.
     Arcade.Sfx.play('whoosh' | 'coin' | 'blip')   does nothing when muted or before the first tap
     Arcade.Sfx.event(name)                         a named game event (EVENTS below), with fallbacks
     Arcade.Sfx.bell(soundingMidi)                  a bell bar's tone at its real pitch (always generated, never a file)
     Arcade.Sfx.playThenGo(name, href)              plays (a sound or an event), waits GO_DELAY ms, then navigates
     Arcade.Sfx.mountControls(el, {ambience})       SOUND (and AMBIENCE) buttons (saved via Arcade.store)
     Arcade.Sfx.allowAmbience(false)                a game page: never play the arcade-room hum here */
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

  /* ---------- named game events ----------
     Each is a short synthesized sound. An event with no sound of its own falls back:
     'select-<game>' -> the coin, anything else -> the blip. Add a new event here (and to README "Sounds"). */
  const arp = (fs, step, type = 'square', vol = 0.4) => fs.forEach((f, i) => tone(f, i * step, step * 1.6, vol, type));
  function slash() {                                    // a fast bright swish
    const t = ctx.currentTime, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 0.16);
  }
  const EVENTS = {
    'level-start':    () => arp([523, 659, 784], 0.07),
    'note-hit':       () => SOUNDS.blip(),
    'note-wrong':     () => tone([196, 147], 0, 0.18, 0.3, 'sawtooth'),
    'note-missed':    () => tone([440, 220], 0, 0.28, 0.3, 'triangle'),
    'level-complete': () => arp([523, 659, 784, 1047], 0.09),
    'level-failed':   () => arp([392, 330, 262], 0.13, 'triangle'),
    'star-earned':    () => { tone(1568, 0, 0.08, 0.3); tone(2093, 0.07, 0.14, 0.3); },
    'new-high-score': () => arp([784, 988, 1175, 1568, 1976], 0.07),
    'ninja-slash':    () => { slash(); tone([1320, 1760], 0.02, 0.06, 0.25); },
    'ninja-combo':    () => arp([880, 1109, 1319, 1760], 0.045, 'square', 0.3),
    'belt-earned':    () => { tone(196, 0, 1.1, 0.35, 'sine'); tone(294, 0, 1.1, 0.25, 'sine'); arp([784, 988, 1175, 1568], 0.08, 'square', 0.3); },
    'belt-diamond':   () => { EVENTS['belt-earned'](); [1568, 1976, 2349, 3136, 2349, 3136].forEach((f, i) => tone(f, 0.75 + i * 0.06, 0.1, 0.22, 'sine')); },   // the belt fanfare plus a sparkle
    // Chime Heist
    'tumbler-click':  () => { tone(2600, 0, 0.018, 0.12, 'square'); tone(1800, 0.02, 0.015, 0.08, 'square'); },     // very short and quiet, under the bell
    'alarm-buzz':     () => { tone([118, 104], 0, 0.22, 0.28, 'sawtooth'); tone([236, 208], 0, 0.22, 0.12, 'square'); },
    'caught':         () => [0, 1, 2].forEach(i => { tone(660, i * 0.3, 0.15, 0.22, 'triangle'); tone(880, i * 0.3 + 0.15, 0.15, 0.22, 'triangle'); }),
    'vault-open':     () => { tone([110, 220], 0, 0.7, 0.3, 'sine'); arp([1047, 1319, 1568, 2093], 0.09, 'triangle', 0.3); },
    'vault-unlocked': () => arp([659, 880, 1319], 0.06, 'triangle', 0.3),
    // Ancient Ninja Scrolls
    'answer-right':   () => { tone(1047, 0, 0.07, 0.25, 'triangle'); tone(1568, 0.06, 0.12, 0.25, 'triangle'); },
    'answer-wrong':   () => tone([247, 196], 0, 0.2, 0.22, 'triangle'),
    'scroll-unroll':  () => { slash(); arp([659, 784, 988, 1319], 0.06, 'triangle', 0.25); },
    'gong':           () => { tone(98, 0, 2, 0.45, 'sine'); tone(233, 0, 1.3, 0.14, 'sine'); tone(311, 0.01, 0.9, 0.08, 'triangle'); },
    'test-ready':     () => { tone(262, 0, 1.2, 0.25, 'sine'); arp([523, 659, 784, 1047, 1319], 0.09, 'triangle', 0.32); },
    // Select Player
    'tile-move':      () => tone(1175, 0, 0.03, 0.16, 'square'),                                                     // the highlight moves
    'player-select':  () => SOUNDS.blip(),                                                                          // a player is chosen
    'player-ready':   () => { tone(262, 0, 0.35, 0.22, 'sawtooth'); arp([523, 659, 784, 1047], 0.06, 'square', 0.3); },   // PLAYER 1 READY
    // Skins (shared/skins.js): each under 0.5 s, because Neon Face-Off's results can play them (the detector is muted)
    'skin-unlocked':  () => { arp([659, 988, 1319, 1976], 0.05, 'triangle', 0.3); tone(2637, 0.22, 0.12, 0.16, 'sine'); },   // UNLOCKED! card
    'skin-equip':     () => { tone([880, 1760], 0, 0.09, 0.22, 'square'); tone(2349, 0.07, 0.08, 0.14, 'triangle'); },            // a skin is put on
    // Neon Face-Off: every sound under 0.5 s; the game mutes the detector while they play (Arcade.Pitch.suppress)
    'puck-hit-soft':  () => { tone(330, 0, 0.06, 0.22, 'triangle'); tone([180, 120], 0, 0.08, 0.2, 'sine'); },
    'puck-hit-hard':  () => { tone(520, 0, 0.07, 0.3, 'square'); tone([240, 140], 0, 0.1, 0.28, 'sine'); },
    'puck-smash':     () => { slash(); tone([900, 300], 0, 0.14, 0.32, 'sawtooth'); tone([200, 90], 0.01, 0.2, 0.34, 'sine'); },
    'rail-bounce':    () => tone(1400, 0, 0.02, 0.07, 'square'),                                                    // a quiet tick, too short to be heard as a note
    'goal':           () => arp([392, 523, 659, 784], 0.08, 'square', 0.3),
    'match-win':      () => arp([523, 659, 784, 1047, 1319], 0.08, 'square', 0.32),
    'your-turn':      () => tone(1760, 0, 0.04, 0.12, 'triangle'),
    // Button Masher
    'key-press':      () => tone(1500, 0, 0.018, 0.1, 'square'),                                                       // a soft button click
    'special-move':   () => { tone([220, 1320], 0, 0.2, 0.28, 'sawtooth'); [1047, 1319, 1568].forEach((f, i) => tone(f, 0.16 + i * 0.05, 0.1, 0.22, 'square')); },
    'combo-streak':   () => arp([784, 988, 1175, 1568, 1976], 0.045, 'square', 0.26),
    'rival-counter':  () => { tone([330, 660], 0, 0.08, 0.3, 'sine'); tone([660, 150], 0.08, 0.26, 0.3, 'sine'); },    // a cartoon "boing"
    'ko':             () => { tone([880, 98], 0, 0.7, 0.28, 'sawtooth'); arp([523, 659, 784, 1047], 0.1, 'triangle', 0.3); },
    'fight-start':    () => { tone(196, 0, 0.16, 0.32, 'square'); tone(196, 0.22, 0.16, 0.32, 'square'); tone([392, 440], 0.46, 0.45, 0.36, 'square'); },
  };

  /* ---------- bell tones (Chime Heist's bell kit): always generated, so every pitch is exact ----------
     A glockenspiel bar: a bright attack and a quick decay, with its high, slightly out-of-tune partials. */
  function bell(midi) {
    const f = 440 * Math.pow(2, (midi - 69) / 12), t = ctx.currentTime;
    [[1, 0.55, 1.1], [2.76, 0.2, 0.45], [5.4, 0.1, 0.2], [8.93, 0.05, 0.1]].forEach(([ratio, vol, len]) => {
      const fr = f * ratio;
      if (fr > 15000) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(fr, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + len + 0.02);
    });
  }
  const eventSound = name => EVENTS[name] || (/^select-/.test(name) ? SOUNDS.coin : SOUNDS.blip);

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
    if (ambienceAllowed && A.store.sfx && A.store.ambience && !document.hidden) startAmbience(); else stopAmbience();
  }
  document.addEventListener('visibilitychange', syncAmbience);
  addEventListener('pagehide', stopAmbience);
  addEventListener('pageshow', e => { if (e.persisted) syncAmbience(); });   // back button restores the page

  /* ---------- controls ---------- */
  function mountControls(el, {ambience = true} = {}) {
    el.innerHTML =
      `<button class="snd-btn" type="button" data-k="sfx" aria-label="Sound effects"><svg class="snd-ico" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M3 9h4l5-4v14l-5-4H3z"/><path class="waves" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/><path class="x" d="M16 9l6 6M22 9l-6 6"/></svg><span class="snd-txt"></span></button>` +
      (ambience ? `<button class="snd-btn" type="button" data-k="ambience" aria-label="Arcade ambience"><span class="snd-txt"></span></button>` : '');
    const [bs, ba] = el.querySelectorAll('button');
    function draw() {
      const on = A.store.sfx, amOn = A.store.ambience;
      bs.setAttribute('aria-pressed', on); bs.querySelector('.snd-txt').textContent = on ? 'Sound on' : 'Sound off';
      if (!ba) return;
      ba.setAttribute('aria-pressed', amOn); ba.querySelector('.snd-txt').textContent = amOn ? 'Ambience on' : 'Ambience off';
      ba.classList.toggle('muted', !on);   // ambience follows the main switch
    }
    bs.addEventListener('click', () => { A.store.setSfx(!A.store.sfx); draw(); syncAmbience(); if (A.store.sfx) Sfx.play('blip'); });
    if (ba) ba.addEventListener('click', () => { A.store.setAmbience(!A.store.ambience); draw(); syncAmbience(); });
    draw();
  }
  let ambienceAllowed = true;

  let leaving = false;
  const Sfx = A.Sfx = {
    play(name) {
      if (!ready() || !SOUNDS[name]) return false;
      try { SOUNDS[name](); return true; } catch (e) { return false; }
    },
    /** a named game event: 'level-start', 'note-hit', 'ninja-slash', 'select-note-ninja'… (see EVENTS) */
    event(name) {
      if (!ready()) return false;
      try { eventSound(name)(); return true; } catch (e) { return false; }
    },
    events: Object.keys(EVENTS),
    /** a bell bar at a SOUNDING midi note (Chime Heist). Respects mute like every sound here. */
    bell(midi) {
      if (!ready()) return false;
      try { bell(midi); return true; } catch (e) { return false; }
    },
    allowAmbience(on) { ambienceAllowed = !!on; syncAmbience(); },
    /** play a sound, then go to href after GO_DELAY ms (straight away when muted) */
    playThenGo(name, href) {
      if (leaving) return;                 // a second tap during the wait does nothing
      leaving = true;
      setTimeout(() => { leaving = false; }, 2000);
      if (SOUNDS[name] ? Sfx.play(name) : Sfx.event(name)) setTimeout(() => { location.href = href; }, GO_DELAY);
      else location.href = href;
    },
    mountControls,
  };
})(window.Arcade);
