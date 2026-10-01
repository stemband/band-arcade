/* Band Arcade: THE SOUND SYSTEM. Every sound on every page goes through here.
   Which sounds exist, their files, volumes and rules: shared/sounds.js (the list). Mat's recordings: shared/sounds/
   (<file>.m4a, else <file>.mp3). A missing or broken file falls back to the sound the arcade already had for that
   action (the generated sounds below), or a short generated retro beep, so nothing ever goes silent; a missing file
   is only noted in the console.
     Arcade.Sfx.event(name, {muteCap})  play an event (sounds.js). Returns its length in seconds (0 = not played).
                                       muteCap (ms): the most this play may mute the microphone, echo included
     Arcade.Sfx.sequence([names], gap, {channel})  play events one after another, each when the last one ends (its real
                                       length); a voice line waits for any voice still speaking; returns {cancel()}
     Arcade.Sfx.play('whoosh' | 'coin' | 'blip')   the three original generated sounds
     Arcade.Sfx.bell(soundingMidi)     a bell bar's tone at its real pitch (Chime Heist; always generated, never a file)
     Arcade.Sfx.playThenGo(name, href) play, then change page when the sound ends (never later than 1.5 s)
     Arcade.Sfx.prefer(names)          load these small effects now, ahead of everything (the floor: the front
                                       cabinet's select-<id> and its two neighbors, on every turn; before the first
                                       tap they are downloaded and decoded on unlock)
     Arcade.Sfx.eventSoon(name, ms)    like event(), but if its file is still downloading, wait for it (up to ms,
                                       default 600) instead of playing the fallback: the floor's START uses it
     Arcade.Sfx.duck(ms, {level, down, up})  dip the music + ambience to level (0.4) over down s (0.2), hold ms, back
                                       up over up s (0.5): voice lines (Select Player's choose-instrument)
     Arcade.Sfx.busy(['voice'])        ms until the last effect (or the last voice line) played has finished (0 = quiet)
     Arcade.Sfx.cancelAll(channel)     drop every pending Sfx.sequence (of that channel): Dojo Duel when a match ends;
                                       Sfx.pending(channel) = how many still have sounds to play
     Arcade.Sfx.gameMenuMusic(gameId, on, {afterEffects})  a game's menu music (games.js menuMusic, else select-music):
                                       true on every menu screen (pauses the mic), false as a level starts (0.5 s fade)
     Arcade.Sfx.hush(fade)             fade out (0.15 s) any VOICE line still speaking (effects always finish)
     Arcade.Sfx.preloadScreen(screen)  load + decode every effect of a sounds.js screen now (a game's setup screen)
     Arcade.Sfx.whenReady(names, ms)   a Promise: these events' files are loaded (or missing), or ms (default 1500)
                                       passed; Dojo Duel's first countdown waits for it so the voices are on time
     Arcade.Sfx.use(...screens)        which sounds this page needs ('floor', 'select', 'game', a game id): they are
                                       preloaded after the first tap, two at a time (school Wi-Fi)
     Arcade.Sfx.mountControls(el)      the top bar's SETTINGS button (a speaker showing sound on/off): opens the shared
                                      Settings panel (shared/ui-kit.js); settingsChanged(k), loopNote(), refreshControls()
   THE MUSIC MANAGER (the only way background loops ever start; Arcade.sfx is the same object):
     Arcade.Sfx.setMusic(name | [names] | null, {builtIn})     the track this page WANTS on the MUSIC channel
     Arcade.Sfx.setAmbience(name | [names] | null, {builtIn})  the same for the AMBIENCE channel (the lobby room sound)
       [names] = best first (['select-music-ghost-notes', 'select-music']: the first file that exists plays).
       builtIn: true = if none of the files exist, play the built-in version (the chiptune / the room hum).
       Call them any time, even before the first tap or while the file is still downloading: the manager remembers
       the wish and starts the track (fading in) as soon as BOTH the audio is unlocked by the first tap/click/key AND
       the file has loaded. Asking for the track that is already playing does nothing (no restart); a different one
       crossfades (0.5 s). null fades the channel out. Mute and the MUSIC / AMBIENCE sliders are respected, loops stop
       while a game listens to the microphone (Arcade.Sfx.sync() after listening starts/stops) and pause while the tab
       is hidden (the AudioContext is suspended, so they carry on where they were).
     Arcade.Sfx.preloadMusic([names])  fetch the likely next tracks now (Arcade Quest: the foyer, the manor, battle)
     A music file is never remembered as missing (a 404 is asked again past the browser's cache), so a track uploaded
     after a browser once got "404" for it still plays. ?debug on any page shows the MUSIC LOG (console + a box).
   THE MICROPHONE: a sound played while a game is listening (Arcade.Pitch.listening()) makes the detector ignore
   everything for the sound's length + ECHO_MS (Arcade.Pitch.suppress), and games pause their timers meanwhile
   (Arcade.Pitch.isSuppressed). Note Storm never pauses: it caps the muted part (Sfx.muteMax) and uses
   Arcade.Pitch.softSuppress. Sounds marked mic: false in sounds.js never play while listening.
   Browsers allow sound only after a tap or key press on each page: the AudioContext starts then, never on load. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const GEN_LEVEL = 0.37;      // the generated sounds at 100 % effects (the default 60 % = their old level, 0.22)
  const AMB_GEN_LEVEL = 0.17;  // the generated room hum at 100 % ambience (the default 30 % = its old level, 0.05)
  const MUS_GEN_LEVEL = 0.5;   // the built-in chiptune at 100 % music
  const ECHO_MS = 250;         // the detector stays deaf this long after a sound ends (room echo)
  const GO_MAX = 1500;         // playThenGo never waits longer than this
  const DEFAULTS = {sfxVol: 0.6, ambVol: 0.3, musVol: 0.4};

  const AC = window.AudioContext || window.webkitAudioContext;
  const FILE_MODE = location.protocol === 'file:';   // a double-clicked page: Web Audio can't read files, use <audio>
  const here = document.currentScript && document.currentScript.src || (document.querySelector('script[src$="sfx.js"]') || {}).src;
  const BASE = here ? new URL('sounds/', here).href : '';
  let ctx = null, master = null, fxBus = null, rawBus = null, analyser = null, span = 0;
  const store = A.store;
  const vol = k => { const v = store && store[k]; return typeof v === 'number' ? v : DEFAULTS[k]; };
  const listening = () => !!(A.Pitch && A.Pitch.listening && A.Pitch.listening());
  const entry = name => A.Sounds ? A.Sounds.get(name) : null;

  /* ---------- unlock on the first tap / key press ---------- */
  function unlock(e) {
    if (!AC) return;
    try {
      if (!ctx) {
        ctx = new AC();
        fxBus = ctx.createGain(); analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
        fxBus.connect(analyser); analyser.connect(ctx.destination);
        rawBus = ctx.createGain(); rawBus.connect(analyser);                                 // outputRaw(): no EFFECTS slider
        master = ctx.createGain(); master.gain.value = GEN_LEVEL; master.connect(fxBus);    // the generated sounds
        Object.values(CH).forEach(c => { c.bus = ctx.createGain(); c.duck = ctx.createGain(); c.bus.connect(c.duck); c.duck.connect(ctx.destination); });   // bus = the slider, duck = duck()
        applySettings();
        // the audio can stop again (iPad: another app, a call, the tab in the background, a resume refused without a
        // tap): then the next tap/key unlocks it again, and the music carries on
        ctx.onstatechange = () => { mdbg('audio ' + ctx.state); if (ctx.state === 'running') unlocked(); else if (ctx.state !== 'closed') arm(true); };
        mdbg('audio unlocking (' + (e && e.type || 'tap') + ')');
      }
      if (ctx.state !== 'running') { resumeAt = performance.now(); ctx.resume().then(unlocked, () => {}); } else unlocked();
    } catch (e) { /* no sound on this browser; everything else still works */ }
  }
  let wasUnlocked = false, resumeAt = 0;          // resumeAt: when a tap last asked a stopped AudioContext to start
  function unlocked() {
    if (ctx.state !== 'running') return;
    arm(false);
    applyAll();                                           // the wanted track loads (and starts) first
    if (wasUnlocked) return;
    wasUnlocked = true;
    mdbg('audio unlocked');
    preload();
    // then the other music fetched before this tap is decoded, ONE file at a time after the wanted one: a slow iPad
    // decoding four big files at once would keep the wanted one waiting
    const wantedNow = Object.values(CH).map(c => c.want && files[fileOf(c.want.events[0])]).filter(r => r && r.p).map(r => r.p);
    Promise.all(wantedNow).then(() => [...early].reduce((p, f) => p.then(() => files[f] ? null : load(f)), Promise.resolve()));
  }
  // pointerdown/keydown are the first chance; touchend/click are backups for older iPads that only unlock on those
  const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend', 'click'];
  const arm = on => UNLOCK_EVENTS.forEach(t => (on ? addEventListener : removeEventListener)(t, unlock, true));
  arm(true);

  /* ?debug: a log of what the music manager does (the track asked for, every URL tried, what loaded, start/stop),
     in the console and in a small box on the page (for iPads, which have no console) */
  const DEBUG = /[?&]debug(=|&|$)/.test(location.search);
  const musicLog = [];
  let logBox = null;
  function mdbg(msg) {
    if (!DEBUG) return;
    const line = (performance.now() / 1000).toFixed(2) + ' s  ' + msg;
    musicLog.push(line); if (musicLog.length > 60) musicLog.shift();
    console.log('[sound] ' + msg);
    if (!document.body) return;
    if (!logBox) {
      logBox = document.createElement('pre');
      logBox.setAttribute('aria-hidden', 'true');
      logBox.style.cssText = 'position:fixed;left:4px;bottom:4px;z-index:9999;max-width:min(96vw,560px);max-height:40vh;overflow:hidden;margin:0;' +
        'padding:6px 8px;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none;border-radius:6px;' +
        'background:var(--deep,black);color:var(--text-hi,white);border:1px solid var(--cyan,white);opacity:.9';
      document.body.appendChild(logBox);
    }
    logBox.textContent = 'SOUNDS (?debug)\n' + musicLog.slice(-14).join('\n');
  }

  /* true once this page has had a tap. A context made by that same tap may still be starting
     ("suspended"); sounds scheduled now play as soon as it runs, so the first tap still clicks. */
  function ready() {
    if (!ctx || ctx.state === 'closed' || !store.sfx) return false;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    return true;
  }
  function applySettings() {
    if (!ctx) return;
    const t = ctx.currentTime;
    fxBus.gain.setTargetAtTime(vol('sfxVol'), t, 0.02);
    Object.values(CH).forEach(c => {
      c.bus.gain.setTargetAtTime(loopVol(c), t, 0.05);
      if (c.cur && c.cur.el) c.cur.el.volume = Math.min(1, loopVol(c) * c.cur.level);
    });
  }

  /* ---------- the built-in (generated) sounds: the fallbacks ---------- */
  /** one square-wave note: freq (Hz, or [from, to] to slide), start offset, length (s), peak volume */
  function tone(freq, at, len, vol = 1, type = 'square') {
    const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
    span = Math.max(span, at + len);
    o.type = type;
    const [f0, f1] = Array.isArray(freq) ? freq : [freq, freq];
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(genDest || master);
    o.start(t); o.stop(t + len + 0.02);
  }
  /** UNPITCHED: band-passed noise around freq (or sweeping [from, to]), width q (low = wide, no pitch to hear).
      sounds.js `gen` entries with type 'noise' use it: static, clicks and sweeps the microphone can't take for a note. */
  function noiseBurst(freq, at, len, vol = 0.3, q = 0.8) {
    const t = ctx.currentTime + at, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const [f0, f1] = Array.isArray(freq) ? freq : [freq, freq];
    f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, len / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    n.connect(f); f.connect(g); g.connect(genDest || master);
    n.start(t, Math.random() * 0.5); n.stop(t + len + 0.02);
    span = Math.max(span, at + len);
  }
  let genDest = null;          // where the generated sounds go (null = master); a capped play (sounds.js `cap`) routes them through its limiter

  /* ---------- THE LOUDNESS CAP (sounds.js `cap`: Showtime Malfunction's jump-scare stings) ----------
     A capped sound is never more than `cap` dB louder than the arcade's normal loudest effect, measured two ways: its
     PEAK and its LOUDNESS (the loudest 50 ms stretch, RMS). The reference = the loudest uncapped effect file played on
     this page (vol × the file's own peak / loudness), and never less than REF_PEAK / REF_RMS: measured from the files
     in shared/sounds (the loudest peak .9; the loudness of showtime-start, .38, the loudest sound a student hears in
     Showtime Malfunction before a scare). A file is scaled down to both limits before it plays (measured once), and
     everything (files and the generated fallback) then passes a hard limiter at the peak limit, so nothing gets past it.
     It sits before the EFFECTS slider like every effect, so SOUND ON/OFF and the slider apply as usual. */
  const REF_PEAK = 0.9, REF_RMS = 0.38, RMS_S = 0.05;
  let loudest = 0, loudestRms = 0;
  const peakOf = buf => {
    if (buf._peak != null) return buf._peak;
    let p = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = d[i] < 0 ? -d[i] : d[i]; if (v > p) p = v; } }
    return (buf._peak = p);
  };
  /** the loudest 50 ms stretch (RMS, half-overlapping windows, the louder channel) */
  const rmsOf = buf => {
    if (buf._rms != null) return buf._rms;
    const W = Math.max(1, Math.round(buf.sampleRate * RMS_S));
    let best = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i + W <= d.length; i += W >> 1) { let q = 0; for (let j = i; j < i + W; j++) q += d[j] * d[j]; if (q > best) best = q; }
    }
    return (buf._rms = Math.sqrt(best / W));
  };
  const capLimit = e => { const k = Math.pow(10, (+e.cap || 0) / 20); return {peak: Math.max(loudest, REF_PEAK) * k, rms: Math.max(loudestRms, REF_RMS) * k}; };
  const limiters = {};
  /** a hard limiter at `limit` (a WaveShaper: the input halved, then the curve clamps at ±limit) into the effects bus */
  function limiterFor(limit) {
    const k = limit.toFixed(3);
    if (limiters[k]) return limiters[k];
    const pre = ctx.createGain(), sh = ctx.createWaveShaper(), N = 2049, curve = new Float32Array(N);
    for (let i = 0; i < N; i++) { const u = (i / (N - 1)) * 2 - 1; curve[i] = Math.max(-limit, Math.min(limit, u * 2)); }
    pre.gain.value = 0.5; sh.curve = curve; sh.oversample = 'none';
    pre.connect(sh); sh.connect(fxBus);
    return (limiters[k] = pre);
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
      n.connect(f); f.connect(g); g.connect(genDest || master);
      n.start(t); n.stop(t + 0.22); span = Math.max(span, 0.22);
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
    n.connect(f); f.connect(g); g.connect(genDest || master); n.start(t); n.stop(t + 0.16); span = Math.max(span, 0.16);
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
      o.connect(g); g.connect(genDest || master); o.start(t); o.stop(t + len + 0.02);
    });
  }


  /* a piano key at a SOUNDING midi note (Keys to the City's TOUCH mode; never while a microphone listens): a hammer
     tap, a few partials that die away faster the higher they are, and a gentle long decay like a real string */
  function piano(midi) {
    const f = 440 * Math.pow(2, (midi - 69) / 12), t = ctx.currentTime, low = Math.max(0, (60 - midi) / 36);
    const decay = 1.4 + 1.6 * low;                                     // low strings ring longer
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(12000, f * 9), t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(9000, f * 3), t + .6); lp.connect(master);
    [[1, .42, 1], [2.001, .2, .6], [3.003, .09, .4], [4.006, .05, .3], [5.01, .025, .22]].forEach(([ratio, vol, len], k) => {
      const fr = f * ratio; if (fr > 14000) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), d = decay * len;
      o.type = k ? 'sine' : 'triangle'; o.frequency.setValueAtTime(fr, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .004);
      g.gain.exponentialRampToValueAtTime(vol * .35, t + .12); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + d + .05);
    });
    // the hammer: a short soft thump of filtered noise
    const n = ctx.createBufferSource(), nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .03), ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    n.buffer = nb; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = Math.min(4000, f * 4); bp.Q.value = .8;
    const ng = ctx.createGain(); ng.gain.value = .05; n.connect(bp); bp.connect(ng); ng.connect(lp); n.start(t);
  }

  /* built-in fallbacks for events whose sound didn't exist before (short generated retro sounds) */
  const GENERIC = {
    'cabinet-focus':   () => tone(2093, 0, 0.03, 0.12, 'triangle'),
    'player2-join':    () => { tone(330, 0, 0.3, 0.22, 'sawtooth'); arp([659, 784, 988, 1319], 0.06, 'square', 0.3); },
    'ui-back':         () => tone([988, 494], 0, 0.1, 0.28, 'square'),
    'life-lost':       () => { tone([523, 262], 0, 0.22, 0.32, 'square'); tone([392, 196], 0.05, 0.22, 0.2, 'triangle'); },
    'game-over':       () => arp([523, 392, 330, 262, 196], 0.14, 'square', 0.3),
    'all-notes-found': () => { arp([523, 659, 784, 1047, 1319, 1568], 0.07, 'square', 0.3); tone(2093, 0.45, 0.25, 0.18, 'triangle'); },
    'retro':           () => tone([880, 1175], 0, 0.08, 0.3, 'square'),
    // Showtime Malfunction
    'attack-tick':     () => tone(1760, 0, 0.025, 0.2, 'square'),                                                     // tiny: fast tonguing keeps counting
    'reboot':          () => { tone([220, 880], 0, 0.18, 0.28, 'sawtooth'); tone(1319, 0.16, 0.14, 0.22, 'triangle'); },     // a power-up whirr
    'spotlight-out':   () => { tone([392, 98], 0, 0.3, 0.28, 'square'); tone(60, 0.02, 0.25, 0.18, 'sawtooth'); },      // a bulb dying
    'showtime-over':   () => { arp([392, 370, 349, 330], 0.18, 'triangle', 0.26); tone([165, 82], 0.7, 0.6, 0.2, 'sawtooth'); },   // a slow wind-down, never a scream
  };
  /* the sound each action had before sound files: new names for old sounds */
  const CURRENT = {'wheel-left': SOUNDS.whoosh, 'wheel-right': SOUNDS.whoosh, 'select-default': SOUNDS.coin,
                   'player-continue': EVENTS['player-select'], 'ui-toggle': SOUNDS.blip, 'lobby-ambience': () => {},
                   'select-music': () => {}};     // the loops' built-in versions play through the loop channels below
  /** the built-in sound for an event, and whether it is the action's own ('fallback') or a generic beep */
  function builtIn(name, e) {
    if (EVENTS[name]) return {fn: EVENTS[name], kind: 'fallback'};
    if (CURRENT[name]) return {fn: CURRENT[name], kind: 'fallback'};
    if (e && e.gen) {
      if (typeof e.gen === 'string') return {fn: EVENTS[e.gen] || GENERIC[e.gen] || CURRENT[e.gen] || GENERIC.retro, kind: 'fallback'};
      return {fn: () => e.gen.forEach(([f, at, len, v = 0.3, type, q]) => type === 'noise' ? noiseBurst(f, at, len, v, q) : tone(f, at, len, v, type)), kind: 'fallback'};
    }
    return {fn: GENERIC[name] || GENERIC.retro, kind: 'generated'};
  }
  function playGen(fn, e) {
    span = 0;
    // a capped sound's generated fallback: through the same limiter (GEN_LEVEL is applied after it by `master`'s share)
    if (e && e.cap != null) { const g = ctx.createGain(); g.gain.value = GEN_LEVEL; g.connect(limiterFor(capLimit(e).peak)); genDest = g; }
    try { fn(); } finally { genDest = null; }
    return Math.max(span, 0.05);
  }

  /* ---------- sound files ---------- */
  /* an effect file that 404'd (or wouldn't decode) is skipped for a while in this tab, so a missing .m4a costs one request,
     not one per page. The memory EXPIRES after MISS_MS (GitHub Pages lets browsers keep a 404 for 10 minutes too):
     a file uploaded later is found again, even in a tab (or an iPad home-screen app) that stays open for days. */
  const MISS_KEY = 'bandarcade.snd-miss2', MISS_MS = 10 * 60 * 1000, missAt = {};
  try { const o = JSON.parse(sessionStorage.getItem(MISS_KEY) || '{}'); if (o && typeof o === 'object' && !Array.isArray(o)) Object.assign(missAt, o); } catch (e) {}
  const saveMiss = () => { try { sessionStorage.setItem(MISS_KEY, JSON.stringify(missAt)); } catch (x) {} };
  const miss = {
    has: u => !!missAt[u] && Date.now() - missAt[u] < MISS_MS,
    add: u => { missAt[u] = Date.now(); saveMiss(); },
    delete: u => { if (u in missAt) { delete missAt[u]; saveMiss(); } },
  };
  const retries = {};          // music file -> tries after network errors
  const files = {};            // file name -> {state: 'loading' | 'ok' | 'missing', buf | el, ext, dur, loopStart, loopEnd}
  const decode = ab => new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
  const loadEl = url => new Promise((res, rej) => {
    const el = new Audio(); let done = false;
    el.preload = 'auto';
    el.addEventListener('canplaythrough', () => { if (!done) { done = true; res(el); } }, {once: true});
    // a file that isn't there (or won't play) = missing, like a 404; too slow = a network hiccup (tried again later)
    el.addEventListener('error', () => { if (!done) { done = true; rej(Object.assign(new Error('missing'), {status: 404})); } }, {once: true});
    setTimeout(() => { if (!done) { done = true; rej(new Error('timeout')); } }, 8000);
    el.src = url; el.load();
  });
  /* CACHING: games load <file>.<ext>?v=<SOUNDS_VERSION> (shared/sounds.js) with the browser's normal cache, so students
     keep fast cached sounds; bumping SOUNDS_VERSION makes every device fetch the new files. The Sound Board passes
     bust: it always asks the server again (cache: 'reload' + a unique ?t=), so it shows what is live right now. */
  const VERSION = () => (A.Sounds && A.Sounds.VERSION) || 1;
  /** load a file (tries .m4a, then .mp3). fresh: ignore what failed before. bust: skip every cache and load again
      even if it loaded before (the Sound Board: a replaced or deleted file shows up at once) */
  function load(file, {fresh = false, bust = false} = {}) {
    if (!file || !BASE) return Promise.resolve({state: 'missing'});
    if (files[file] && !bust && !(fresh && files[file].state === 'missing')) return files[file].p;
    const rec = files[file] = {state: 'loading', file};
    // MUSIC (a loop file) is never skipped because of an earlier miss, and a 404 is asked again past the browser's
    // cache: a file uploaded after this browser once got "404" for it (GitHub Pages lets browsers keep a 404 for 10
    // minutes) must still play. Effects have a built-in sound to fall back on; music would just be silent.
    const music = loops(file);
    rec.p = (async () => {
      let asked = false, transient = false;
      for (const ext of ['m4a', 'mp3']) {
        const base = BASE + file + '.' + ext + '?v=' + VERSION();
        const url = bust ? base + '&t=' + Date.now() : base;
        if (!fresh && !bust && !music && miss.has(base)) { if (DEBUG) mdbg(`${file}.${ext}: skipped (missing a moment ago in this tab)`); continue; }
        asked = true;
        try {
          if (FILE_MODE || !ctx) {
            const el = await loadEl(url);
            Object.assign(rec, {state: 'ok', el, ext, url, dur: el.duration || 0.5});
          } else {
            let r = await fetch(url, bust ? {cache: 'reload'} : undefined);
            if (!r.ok && music && !bust) { if (wanted(file)) mdbg(`${file}.${ext}: ${r.status}, asking the server again`); r = await fetch(url, {cache: 'no-cache'}); }
            if (!r.ok) throw Object.assign(new Error(r.status), {status: r.status});
            const ab = await r.arrayBuffer(); rec.bytes = ab.byteLength;
            if (music && wanted(file)) mdbg(`${file}.${ext}: downloaded ${(ab.byteLength / 1048576).toFixed(1)} MB, decoding`);
            let buf;
            try { buf = await decode(ab); } catch (x) { throw Object.assign(new Error('decode'), {status: 'could not decode'}); }
            const pts = loopPoints(buf);
            if (loops(file)) buf = crossfaded(buf, pts);                     // a loop: bake a seamless wrap into the buffer
            // an effect's length = where its sound ENDS (the silence many recordings trail is not counted): what
            // sequence() spacing, busy() and voice overlaps go by
            Object.assign(rec, {state: 'ok', buf, ext, url, dur: loops(file) ? buf.duration : audibleEnd(buf), fileDur: buf.duration}, loops(file) ? {loopStart: 0, loopEnd: buf.duration, trimmed: pts} : pts);
          }
          miss.delete(base);
          mdbg(`${file}.${ext}: loaded (${rec.dur.toFixed(1)} s)`);
          if (wanted(file)) setTimeout(applyAll, 0);         // a music file just loaded: the manager starts it now
          return rec;
        } catch (e) {
          const st = e && e.status;
          const gone = st === 404 || st === 410 || st === 'could not decode';
          mdbg(`${file}.${ext}: ${st || 'network error'}`);
          if (!gone) { transient = true; continue; }         // a Wi-Fi hiccup is never remembered as "missing"
          if (music) continue;                               // music: never remembered (see above)
          miss.add(base);
        }
      }
      rec.state = 'missing';
      mdbg(`${file}: no .m4a or .mp3 could play`);
      // music that failed on a bad connection: try again in a few seconds while it's still wanted (3 tries)
      if (music && transient && !bust && (retries[file] = (retries[file] || 0) + 1) <= 3)
        setTimeout(() => { if (files[file] === rec && wanted(file)) { delete files[file]; applyAll(); } }, 4000 * retries[file]);
      if (wanted(file)) setTimeout(applyAll, 0);           // it won't come: the manager falls back (a lesser file, built-in, or nothing)
      if (asked) console.info(`Band Arcade sound: no shared/sounds/${file}.m4a or ${file}.mp3 (or it would not play); using the built-in sound.`);
      return rec;
    })();
    return rec.p;
  }
  /** seconds until the last sample louder than about -50 dB (+ 30 ms), at least 0.05 s */
  function audibleEnd(buf) {
    const ch = [...Array(buf.numberOfChannels)].map((_, i) => buf.getChannelData(i));
    let i = buf.length - 1;
    while (i > 0 && !ch.some(d => Math.abs(d[i]) > 0.003)) i--;
    return Math.max(0.05, Math.min(buf.duration, i / buf.sampleRate + 0.03));
  }
  /* a seamless loop: skip the silence encoders add at the start and end of .m4a/.mp3 files */
  function loopPoints(buf) {
    const n = buf.length, sr = buf.sampleRate, ch = [...Array(buf.numberOfChannels)].map((_, i) => buf.getChannelData(i));
    const loud = i => ch.some(d => Math.abs(d[i]) > 0.0015);
    let a = 0, b = n - 1;
    const lim = Math.min(n, Math.round(sr * 0.25));
    while (a < lim && !loud(a)) a++;
    while (b > n - lim && !loud(b)) b--;
    if (a >= lim) a = 0;
    if (b <= n - lim) b = n - 1;
    return {loopStart: a / sr, loopEnd: (b + 1) / sr};
  }
  // a loop file: any loop event in sounds.js, plus the optional per-game select-music-<game id> (made on the fly)
  const selMusic = n => /^select-music-/.test(n) && (A.GAMES || []).some(g => 'select-music-' + g.id === n);   // not select-music-highway (Music Highway's START)
  const loops = file => selMusic(file) || !!(A.Sounds && A.Sounds.names().some(n => { const e = entry(n); return e && e.loop && e.file === file; }));
  /** is a channel waiting for this file? (the manager re-checks when it has loaded, or turned out to be missing) */
  const wanted = file => Object.values(CH).some(c => c.want && c.want.events.some(n => fileOf(n) === file));
  /* the loop's last XF seconds are faded into its first ones, so the end runs straight into the start: no click, no
     gap, whatever the encoder did to the file's ends */
  function crossfaded(buf, {loopStart, loopEnd}) {
    const sr = buf.sampleRate, a = Math.round(loopStart * sr), L = Math.round(loopEnd * sr) - a;
    const C = Math.min(Math.round(0.08 * sr), Math.floor(L / 4));
    if (C < 32) return buf;
    const out = ctx.createBuffer(buf.numberOfChannels, L - C, sr);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const x = buf.getChannelData(ch), o = out.getChannelData(ch);
      for (let i = 0; i < L - C; i++) o[i] = x[a + i];
      for (let i = 0; i < C; i++) {                            // equal-power fade: the tail out, the head in
        const t = i / C, fin = Math.sin(t * Math.PI / 2), fout = Math.cos(t * Math.PI / 2);
        o[i] = x[a + i] * fin + x[a + L - C + i] * fout;
      }
    }
    return out;
  }
  const speaking = [];                                     // voice lines playing now: {stop(fade)} (Sfx.hush)
  function playFile(rec, e) {
    const level = e.vol == null ? 0.8 : e.vol;
    if (rec.el) {
      // file:// (<audio>): the loaded element itself when it's free; a copy otherwise, which must start at once or
      // not at all (a copy that is still loading would play late, when everything piles up)
      const free = rec.el.paused || rec.el.ended, el = free ? rec.el : rec.el.cloneNode();
      el.volume = Math.min(1, (e.cap != null ? Math.min(level, .6) : level) * vol('sfxVol'));   // capped, on file:// (can't measure the file): a moderate level
      if (free) { try { el.currentTime = 0; } catch (x) { /* not seekable yet */ } }
      let started = false; el.addEventListener('playing', () => { started = true; }, {once: true});
      el.play().catch(() => {});
      setTimeout(() => { if (!started) el.pause(); }, NOW_MS);
      if (e.voice) track(() => el.pause(), rec.dur);
      return rec.dur;
    }
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = rec.buf;
    if (e.cap != null) {                                   // the loudness cap: scaled to the limit, then the limiter
      const lim = capLimit(e);
      g.gain.value = Math.min(level, lim.peak / (peakOf(rec.buf) || 1), lim.rms / (rmsOf(rec.buf) || 1));
      s.connect(g); g.connect(limiterFor(lim.peak));
    } else {
      g.gain.value = level;
      if (!e.loop) { loudest = Math.max(loudest, level * peakOf(rec.buf)); loudestRms = Math.max(loudestRms, level * rmsOf(rec.buf)); }
      s.connect(g); g.connect(fxBus);
    }
    s.start();
    if (e.voice) track(fade => { const t = ctx.currentTime; g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); try { s.stop(t + fade + .02); } catch (x) {} }, rec.dur);
    return rec.dur;
  }

  /* ---------- playing an event: its file, else its fallback's file, else the built-in sound ---------- */
  function resolve(name, depth = 0) {
    const e = entry(name);
    if (e && e.file) {
      const rec = files[e.file];
      if (rec && rec.state === 'ok') return {how: 'file', rec, e};
      if (DEBUG && !depth) mdbg(`${name}: playing the fallback: ${e.file} is ${!rec ? 'not downloaded yet' : rec.state === 'loading' ? 'still downloading' : 'missing or would not play'}`);
      if (!rec && ctx) load(e.file);                     // not preloaded: this time the fallback, next time the file
    }
    if (e && e.fallback && depth < 3) {
      const r = resolve(e.fallback, depth + 1);
      if (r.how === 'file') return r;
    }
    const b = builtIn(name, e);
    if (b.kind === 'generated' && e && e.fallback) return {how: 'gen', fn: builtIn(e.fallback, entry(e.fallback)).fn, kind: 'fallback'};
    return {how: 'gen', fn: b.fn, kind: b.kind};
  }
  /* NOTHING PLAYS LATE. A sound either starts now or is skipped (a file that isn't decoded yet plays its generated
     fallback at once, above). While the AudioContext is stopped (an iPad interrupted by another app, a call, the lock
     screen, or a resume refused without a tap), a sound started now would wait on the stopped clock and every one of
     them would burst out together when it runs again: so they are skipped, except in the first NOW_MS after a tap
     asked it to start (the unlocking tap's own sound). */
  const NOW_MS = 400;
  const isVoice = name => { const e = entry(name); return !!(e && e.voice); };
  const live = {};                                         // event -> end times (performance.now ms) of its plays still sounding
  function track(stop, dur) {
    const v = {stop, end: performance.now() + dur * 1000};
    speaking.push(v);
    setTimeout(() => { const i = speaking.indexOf(v); if (i >= 0) speaking.splice(i, 1); }, dur * 1000 + 50);
  }
  /** fade out every voice line still speaking (fade s): a new scene that must not talk over the last one (Dojo Duel's
      REMATCH while the Sensei's victory line plays). Only voices (sounds.js voice: true); effects always finish */
  function hush(fade = 0.15) {
    speaking.splice(0).forEach(v => v.stop(fade));
    const now = performance.now();
    played.forEach(p => { if (p.voice && p.at + p.dur * 1000 > now) p.dur = Math.max(0, (now - p.at) / 1000 + fade); });
    Object.keys(live).forEach(n => { if (isVoice(n)) live[n] = []; });
  }
  function playEvent(name, {force = false, muteCap} = {}) {
    if (!force && !ready()) return 0;
    if (force && !ctx) return 0;
    const e = entry(name);
    if (e && e.loop) return 0;                             // the loop plays through the ambience controls
    if (e && e.mic === false && listening()) return 0;
    if (ctx.state !== 'running' && performance.now() - resumeAt > NOW_MS) { mdbg(`${name}: skipped (audio is ${ctx.state})`); return 0; }
    // sounds.js maxInstances (voice: true = 1): never more copies of this sound at once (a voice never talks over itself)
    const max = e && (e.maxInstances || (e.voice ? 1 : 0)), now = performance.now();
    live[name] = (live[name] || []).filter(end => end > now);
    if (max && live[name].length >= max) { mdbg(`${name}: skipped (already playing)`); return 0; }
    let dur = 0, how = '';
    try { const r = resolve(name); how = r.how === 'file' ? 'file:' + r.rec.file + '.' + r.rec.ext : r.kind; dur = r.how === 'file' ? playFile(r.rec, e && e.cap != null && r.e.cap == null ? Object.assign({}, r.e, {cap: e.cap}) : r.e) : playGen(r.fn, e); }
    catch (x) { dur = 0; }
    // sounds.js `echo`: a shorter tail. Sfx.muteMax (a page's option, ms): mute only for the first part of a longer sound
    // muteCap (ms, per play: Neon Face-Off's in-rally sounds): the WHOLE mute, echo included, is never longer; the rest of the sound plays on
    if (dur && listening()) A.Pitch.suppress(Math.min(Math.min(dur * 1000, Sfx.muteMax || Infinity) + (e && e.echo != null ? e.echo : ECHO_MS), muteCap != null ? muteCap : Infinity));
    if (dur) {
      live[name].push(now + dur * 1000);
      played.push({name, how, dur: +dur.toFixed(3), at: Math.round(now), muted: listening(), voice: isVoice(name)}); if (played.length > 60) played.shift();
    }
    return dur;
  }

  const played = [];       // the last 60 sounds played on this page (tests and the Sound Board): {name, how, dur, at, muted}

  /* ---------- DUCKING: a voice line dips the music and the ambience, then brings them back ----------
     Its own gain node after each channel's slider (the sliders and mute never undo a dip, and a dip never touches them).
     A second duck while one is on keeps the later end. (The <audio> loops of file:// testing are not dipped.) */
  function duck(ms, {level = 0.4, down = 0.2, up = 0.5} = {}) {
    if (!ctx || !(ms > 0)) return;
    const t = ctx.currentTime;
    Object.values(CH).forEach(c => {
      if (!c.duck) return;
      const g = c.duck.gain, end = c.duckEnd = Math.max(c.duckEnd > t ? c.duckEnd : 0, t + Math.max(down, ms / 1000));
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(level, t + down); g.setValueAtTime(level, end); g.linearRampToValueAtTime(1, end + up);
    });
  }
  /** a dip that lasts until released (a panel over the page: the avatar creator): duckHold(true) dips the MUSIC and
      AMBIENCE to `level`, duckHold(false) brings them back */
  function duckHold(on, {level = 0.6, down = 0.25, up = 0.5} = {}) {
    if (!ctx) return;
    const t = ctx.currentTime;
    Object.values(CH).forEach(c => {
      if (!c.duck) return;
      const g = c.duck.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      if (on) { c.duckEnd = t + 3600; g.linearRampToValueAtTime(level, t + down); }
      else { c.duckEnd = 0; g.linearRampToValueAtTime(1, t + up); }
    });
  }
  /** ms until the last effect played with event() has finished (0 = quiet); busy('voice'): the last VOICE line */
  const busyFor = (what) => Math.max(0, ...played.filter(p => what !== 'voice' || p.voice).map(p => p.at + p.dur * 1000 - performance.now()));

  /* ---------- preloading: only this page's sounds, after the first tap, two at a time ---------- */
  const screens = new Set(['general']);
  let queue = [], busy = 0, preferred = [];
  /** the files an event needs: its own and its fallback's */
  const filesOf = n => { const e = entry(n); if (!e || !e.file || e.loop) return []; const f = e.fallback && entry(e.fallback); return f && f.file ? [e.file, f.file] : [e.file]; };
  function preload() {
    if (!ctx || !A.Sounds) return;
    preferred.forEach(n => filesOf(n).forEach(f => { if (!files[f] && !queue.includes(f)) queue.push(f); }));
    A.Sounds.names().forEach(n => {
      const e = entry(n);
      if (!e || !e.file || !screens.has(e.screen) || files[e.file] || queue.includes(e.file)) return;
      if (e.loop) return;                                  // music loads through the manager, when it's wanted
      queue.push(e.file);
      if (e.fallback) { const f = entry(e.fallback); if (f && f.file && !queue.includes(f.file) && !files[f.file]) queue.push(f.file); }
    });
    pump();
  }
  /** move these events' files to the front of the queue (or remember them until the audio unlocks) */
  function prefer(names) {
    [].concat(names).forEach(n => {
      if (!preferred.includes(n)) preferred.push(n);
      if (!ctx) { filesOf(n).forEach(fetchFxEarly); return; }     // before the first tap: download now, decode on unlock
      filesOf(n).forEach(f => {
        if (files[f]) return;                                    // loaded, or already downloading
        queue = queue.filter(x => x !== f);
        if (ctx.state === 'running') load(f);                    // small: starts now, beside the two in the queue
        else queue.unshift(f);
      });
    });
  }
  /** a small effect wanted soon (the front cabinet's START sound), before the first tap: download it now, on its own
      (not behind the music), and remember a missing .m4a for this tab, so the load on unlock goes straight to the
      .mp3 in the browser's cache */
  const fxEarly = new Set();
  function fetchFxEarly(file) {
    if (!file || FILE_MODE || !BASE || files[file] || fxEarly.has(file)) return;
    fxEarly.add(file);
    (async () => {
      for (const ext of ['m4a', 'mp3']) {
        const base = BASE + file + '.' + ext + '?v=' + VERSION();
        if (miss.has(base)) continue;
        try {
          const r = await fetch(base);
          if (r.ok) { await r.arrayBuffer(); return; }
          if (r.status === 404) miss.add(base);
        } catch (e) { return; }                                  // offline: the normal load tries again later
      }
    })();
  }
  /** play an event, but give a file that is still downloading up to maxWait ms to arrive first */
  function eventSoon(name, maxWait = 600) {
    if (!ready()) return Promise.resolve(playEvent(name));
    const e = entry(name);
    if (!e || !e.file || e.loop) return Promise.resolve(playEvent(name));
    const rec = files[e.file];
    if (rec && rec.state !== 'loading') return Promise.resolve(playEvent(name));
    const p = rec ? rec.p : load(e.file);                         // not queued yet: fetch it now
    const t0 = performance.now();
    return Promise.race([p, new Promise(r => setTimeout(r, maxWait))]).then(() => {
      mdbg(`${name}: waited ${Math.round(performance.now() - t0)} ms for ${e.file}`);
      return playEvent(name);
    });
  }
  /** resolves once these events' files (and their fallbacks' files) are loaded or known missing, or after maxWait ms:
      a page waits for it before sounds that must be on time (Dojo Duel's first countdown). At once when muted */
  function whenReady(names, maxWait = 1500) {
    if (!ready()) return Promise.resolve();
    const ps = [].concat(names).flatMap(filesOf).map(f => (files[f] || {}).p || load(f));
    return Promise.race([Promise.all(ps), new Promise(r => setTimeout(r, maxWait))]).then(() => {});
  }
  function pump() {
    while (busy < 2 && queue.length) {
      busy++;
      load(queue.shift()).then(() => { busy--; pump(); });
    }
  }

  /* ---------- THE MUSIC MANAGER: two background channels, MUSIC (musVol) and AMBIENCE (ambVol) ----------
     Each channel holds the track the page WANTS ({id, events (best first), builtIn}) and what is playing now (cur).
     apply(c) makes the sound match the wish whenever anything changes: the first tap unlocking the audio, a file
     finishing loading (or turning out to be missing), mute/volume, listening to the mic, the wish itself. Files loop
     with a baked crossfade (above); without any file, builtIn channels play the room hum / the original chiptune. */
  const XF = 0.5, FADE_IN = 0.6;
  const CH = {
    mus: {name: 'music', key: 'musVol', want: null, cur: null, bus: null, gen: genMusic},
    amb: {name: 'ambience', key: 'ambVol', want: null, cur: null, bus: null, gen: genHum},
  };
  const loopVol = c => store.sfx ? vol(c.key) : 0;
  const fileOf = n => (entry(n) || {}).file;
  /* before the first tap there is no AudioContext to decode with, so the wanted files are fetched early (they sit in
     the browser's cache) and decoded the moment the audio unlocks */
  const early = new Set();
  let fetchQ = [], fetching = false;
  function fetchEarly(file, first = false) {
    if (!file || FILE_MODE || !BASE || files[file]) return;
    if (ctx) { if (first || ctx.state === 'running') load(file); else early.add(file); return; }
    if (early.has(file)) { if (first && fetchQ.includes(file)) fetchQ = [file].concat(fetchQ.filter(f => f !== file)); return; }
    early.add(file);
    if (first) fetchQ.unshift(file); else fetchQ.push(file);   // the wanted track downloads first, one file at a time
    if (!fetching) nextFetch();
  }
  async function nextFetch() {
    const file = fetchQ.shift();
    if (!file) { fetching = false; return; }
    fetching = true;
    if (!files[file]) for (const ext of ['m4a', 'mp3']) {
      const url = BASE + file + '.' + ext + '?v=' + VERSION();
      try { const r = await fetch(url); if (r.ok) { await r.arrayBuffer(); break; } } catch (e) { /* offline: load() tries again later */ }
    }
    nextFetch();
  }
  function loopBuffer(c, buf, from, to, level, fadeIn = c.fade || FADE_IN, at = from) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
    s.buffer = buf; s.loop = true; s.loopStart = from; s.loopEnd = to;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + fadeIn);   // fades in, never pops
    s.connect(g); g.connect(c.bus); s.start(t, at);
    return {out: g, nodes: [s], t0: t, at, loopStart: from, loopEnd: to};
  }
  /* RESUMING (sounds.js `resume: true`: Arcade Quest's room music): where each such track was when it stopped, for this
     page's session, so a room's music picks up where it left off after a battle or the microphone */
  const trackPos = {};
  function posOf(a) {
    if (!a || a.t0 == null || !ctx) return null;
    const len = a.loopEnd - a.loopStart;
    let p = a.at + (ctx.currentTime - a.t0);
    if (p >= a.loopEnd && len > 0) p = a.loopStart + ((p - a.loopStart) % len);
    return p;
  }
  function fadeOut(c, secs = c.fade || XF) {
    if (!c.cur) return;
    const a = c.cur; c.cur = null;
    if (a.resume) { const p = posOf(a); if (p != null) trackPos[a.file] = p; }
    mdbg(`${c.name}: stop ${a.gen ? 'the built-in loop' : a.file}`);
    if (a.el) { a.el.pause(); return; }
    if (!a.out) return;
    const t = ctx.currentTime;
    a.out.gain.cancelScheduledValues(t);
    a.out.gain.setValueAtTime(Math.max(0.0001, a.out.gain.value), t);
    a.out.gain.exponentialRampToValueAtTime(0.0001, t + secs);
    a.nodes.forEach(o => { try { o.stop(t + secs + 0.05); } catch (e) { /* already stopped */ } });
  }
  function startFile(c, rec, e) {
    const level = e.vol == null ? 0.6 : e.vol;
    if (rec.el) {                                         // a double-clicked page: an <audio> loop
      const el = rec.el.cloneNode(); el.loop = true; el.volume = Math.min(1, loopVol(c) * level); el.play().catch(() => {});
      c.cur = {el, level, file: rec.file}; mdbg(`${c.name}: START ${rec.file}.${rec.ext} (<audio>)`); return;
    }
    const from = e.resume && trackPos[rec.file] != null && trackPos[rec.file] < rec.loopEnd ? trackPos[rec.file] : rec.loopStart;
    c.cur = Object.assign(loopBuffer(c, rec.buf, rec.loopStart, rec.loopEnd, level, undefined, from), {file: rec.file, resume: !!e.resume});
    c.why = ''; mdbg(`${c.name}: START ${rec.file}.${rec.ext}${from !== rec.loopStart ? ` (resuming at ${from.toFixed(1)} s)` : ''}`);
  }
  /** make channel c sound the way the page wants it */
  function apply(c) {
    if (!ctx || ctx.state !== 'running') { if (c.want) why(c, 'waiting for the first tap to unlock the audio'); return; }   // the first tap calls applyAll()
    const w = c.want;
    if (!w || !store.sfx || vol(c.key) <= 0 || listening()) {
      if (w) why(c, !store.sfx ? 'sound is off' : vol(c.key) <= 0 ? c.name + ' slider at 0' : 'quiet while the mic listens');
      fadeOut(c); return;
    }
    let pick = null, waiting = false;
    for (const n of w.events) {                           // the best file that exists (wait while a better one loads)
      const e = entry(n), f = e && e.file;
      if (!f) continue;
      const rec = files[f];
      if (!rec) { load(f); waiting = true; break; }
      if (rec.state === 'loading') { waiting = true; break; }
      if (rec.state === 'ok') { pick = {rec, e}; break; }
    }
    if (pick) {
      if (c.cur && !c.cur.gen && c.cur.file === pick.rec.file) return;        // already playing it: never restart
      fadeOut(c); startFile(c, pick.rec, pick.e); return;                       // a new track: crossfade
    }
    if (waiting) { why(c, 'waiting for the file to load'); return; }   // it starts the moment its file has loaded
    if (!w.builtIn) { why(c, 'no file for ' + w.events.join(' / ') + ': silence'); fadeOut(c); return; }   // file-only music (Arcade Quest) and no file: silence
    const gid = genLoopOf(w);                             // a track's own built-in loop (sounds.js genLoop), else the channel's
    if (c.cur && c.cur.gen && (c.cur.genId || null) === gid) return;   // that built-in version is already playing
    fadeOut(c);
    const g = gid ? genLoop(c, gid) : c.gen(c);
    if (g) c.cur = g;
  }
  /* A TRACK'S OWN BUILT-IN LOOP: a music event with `genLoop: '<id>'` in sounds.js (Blocktave's cave) plays this
     generated loop until its file is uploaded, instead of the channel's chiptune. Rendered once per page
     (OfflineAudioContext), with a baked crossfade at the loop point so it wraps without a seam; the MUSIC slider and
     SOUND ON/OFF apply as to any loop. */
  const genLoopOf = w => { for (const n of w.events) { const e = entry(n); if (e && e.genLoop && GEN_LOOPS[e.genLoop]) return e.genLoop; } return null; };
  const genBufs = {}, genRendering = {};
  function genLoop(c, id) {
    if (genBufs[id]) return Object.assign(loopBuffer(c, genBufs[id], 0, genBufs[id].duration, GEN_LOOPS[id].level), {gen: true, genId: id});
    if (!genRendering[id]) genRendering[id] = GEN_LOOPS[id].render().then(b => { genBufs[id] = b; applyAll(); }, () => {});
    return null;
  }
  /** render `secs` (+ `xf` more) with draw(oc, out, sr), crossfade the extra tail into the start, normalize to .9 */
  function renderLoop(secs, xf, draw) {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
    const sr = 22050, oc = new OAC(1, Math.ceil((secs + xf) * sr), sr), out = oc.createGain();
    out.connect(oc.destination);
    draw(oc, out, sr);
    const done = new Promise(res => { oc.oncomplete = e => res(e.renderedBuffer); });
    const p = oc.startRendering();
    return (p && p.then ? p : done).then(full => {
      const n = Math.round(secs * sr), m = Math.round(xf * sr), src = full.getChannelData(0);
      const buf = new AudioBuffer({length: n, sampleRate: sr, numberOfChannels: 1}), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = src[i];
      for (let i = 0; i < m; i++) { const k = i / m; d[i] = src[i] * k + src[n + i] * (1 - k); }   // the tail fades into the start
      let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
      if (peak > 0) for (let i = 0; i < n; i++) d[i] *= 0.9 / peak;
      return buf;
    });
  }
  const GEN_LOOPS = {
    /* Blocktave's cave: a slow, quiet ambience: a low soft drone (two sines with a slow swell), a faint airy hum
       (filtered noise) and sparse soft water drips (a gentle attack: nothing sudden); no melody. 12 s, looping. */
    cave: {level: 0.32, render: () => renderLoop(12, 1.5, (oc, out, sr) => {
      const T = 13.5;
      [[55, .5], [82.5, .22], [110.25, .08]].forEach(([f, v], i) => {
        const o = oc.createOscillator(), g = oc.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(v * .6, 0);
        for (let t = 0; t < T; t += 3) g.gain.linearRampToValueAtTime(v * (i % 2 ? .7 : 1), t + 1.5), g.gain.linearRampToValueAtTime(v * .6, t + 3);
        o.connect(g); g.connect(out); o.start(0); o.stop(T);
      });
      const nb = oc.createBuffer(1, Math.ceil(T * sr), sr), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const ns = oc.createBufferSource(), bp = oc.createBiquadFilter(), ng = oc.createGain();
      ns.buffer = nb; bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = .7; ng.gain.value = .05;
      ns.connect(bp); bp.connect(ng); ng.connect(out); ns.start(0);
      [1.4, 4.1, 6.3, 9.7].forEach((t, k) => {                        // drips: a soft plink falling in pitch
        const o = oc.createOscillator(), g = oc.createGain(), f0 = [1400, 1150, 1700, 1300][k];
        o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * .55, t + .09);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(.12, t + .008); g.gain.exponentialRampToValueAtTime(0.0001, t + .35);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + .4);
      });
    })},
  };
  function applyAll() { Object.values(CH).forEach(apply); }
  function why(c, text) { if (c.why !== text) { c.why = text; mdbg(c.name + ': ' + text); } }
  function want(c, names, {builtIn = false, fade = null} = {}) {
    c.fade = fade;                                        // this change's fade (s): the next fade out / fade in; default XF / FADE_IN
    const events = [].concat(names || []).filter(Boolean);
    const id = events.length ? events.join('|') + (builtIn ? '+' : '') : null;
    if (id === (c.want ? c.want.id : null)) return;       // the same track again: nothing changes
    c.want = id ? {id, events, builtIn} : null;
    c.why = '';
    mdbg(`${c.name}: wanted ${id ? events.join(' or ') + (builtIn ? ' (else the built-in one)' : '') : 'nothing'}`);
    events.forEach(n => fetchEarly(fileOf(n), true));
    apply(c); refreshAll();
  }
  // a hidden tab pauses every sound where it is (the context is suspended) and carries on when it's visible again
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { if (ctx.state === 'running') ctx.suspend().catch(() => {}); Object.values(CH).forEach(c => c.cur && c.cur.el && c.cur.el.pause()); }
    else { ctx.resume().then(applyAll, () => {}); Object.values(CH).forEach(c => c.cur && c.cur.el && c.cur.el.play().catch(() => {})); }
  });
  addEventListener('pagehide', () => Object.values(CH).forEach(c => fadeOut(c, 0.15)));
  addEventListener('pageshow', e => { if (e.persisted && ctx) ctx.resume().then(applyAll, () => {}); });   // back button restores the page

  /* the generated room hum (the original ambience) */
  function genHum(c) {
    const out = ctx.createGain(), lp = ctx.createBiquadFilter();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(AMB_GEN_LEVEL, ctx.currentTime + 1.5);
    lp.type = 'lowpass'; lp.frequency.value = 300;
    lp.connect(out); out.connect(c.bus);
    const hum = [60, 60.7, 120].map((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; g.gain.value = i === 2 ? 0.15 : 0.35;
      o.connect(g); g.connect(lp); o.start(); return o;
    });
    const n = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.loop = true; nf.type = 'lowpass'; nf.frequency.value = 700; ng.gain.value = 0.25;
    n.connect(nf); nf.connect(ng); ng.connect(out); n.start();
    return {out, nodes: [...hum, n], gen: true};
  }
  /* the built-in character-select music: an original 8-bar chiptune (A minor, 132 bpm, about 14.5 s) with a pulse lead,
     a 16th-note arpeggio, a triangle bass and noise drums. Rendered once per page (OfflineAudioContext), then looped. */
  function genMusic(c) {
    if (c.buf) return Object.assign(loopBuffer(c, c.buf, 0, c.buf.duration, MUS_GEN_LEVEL), {gen: true});
    if (!c.rendering) c.rendering = renderChiptune().then(buf => { c.buf = buf; apply(c); }, () => {});   // still wanted? it starts now
    return null;
  }
  const CHIP = {
    bpm: 132,
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62], [57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],   // Am F C G Am F G E
    // the lead, one bar per line: [16th step, midi, length in 16ths]
    lead: [[[0, 76, 4], [4, 81, 2], [6, 79, 2], [8, 76, 4], [12, 74, 2], [14, 72, 2]],
           [[0, 72, 4], [4, 77, 2], [6, 76, 2], [8, 72, 6], [14, 69, 2]],
           [[0, 67, 4], [4, 72, 2], [6, 74, 2], [8, 76, 4], [12, 79, 4]],
           [[0, 74, 6], [6, 71, 2], [8, 67, 8]],
           [[0, 76, 2], [2, 76, 2], [4, 81, 4], [8, 83, 2], [10, 84, 2], [12, 83, 2], [14, 81, 2]],
           [[0, 81, 4], [4, 79, 2], [6, 77, 2], [8, 76, 4], [12, 72, 4]],
           [[0, 74, 2], [2, 76, 2], [4, 79, 4], [8, 77, 2], [10, 76, 2], [12, 74, 4]],
           [[0, 71, 4], [4, 76, 4], [8, 80, 4], [12, 83, 4]]],
  };
  function renderChiptune() {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return Promise.reject(new Error('no OfflineAudioContext'));
    const sr = 32000, step = 60 / CHIP.bpm / 4, bars = CHIP.chords.length, len = bars * 16 * step;
    const oc = new OAC(1, Math.ceil(len * sr), sr);
    const hz = m => 440 * Math.pow(2, (m - 69) / 12);
    const out = oc.createGain(); out.gain.value = 1; out.connect(oc.destination);
    const nb = oc.createBuffer(1, sr, sr), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // one note: every note ends a little before its slot, so nothing rings across the loop point
    const note = (type, m, t, dur, v, cut) => {
      const o = oc.createOscillator(), g = oc.createGain(), end = t + Math.max(0.03, dur - 0.02);
      o.type = type; o.frequency.value = hz(m);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005);
      g.gain.setTargetAtTime(v * 0.6, t + 0.01, 0.08); g.gain.setTargetAtTime(0, end - 0.015, 0.006);
      let node = o;
      if (cut) { const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; o.connect(f); node = f; }
      node.connect(g); g.connect(out); o.start(t); o.stop(end + 0.02);
    };
    const hit = (t, v, hp, dec) => {                     // noise drums
      const s = oc.createBufferSource(), f = oc.createBiquadFilter(), g = oc.createGain();
      s.buffer = nb; f.type = 'highpass'; f.frequency.value = hp;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.01);
    };
    const kick = t => {
      const o = oc.createOscillator(), g = oc.createGain();
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.16);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.17);
    };
    CHIP.chords.forEach((ch, bar) => {
      const b0 = bar * 16 * step;
      for (let i = 0; i < 16; i++) {
        const t = b0 + i * step;
        note('square', ch[i % 3] + 12 + (i % 6 === 5 ? 12 : 0), t, step, 0.035, 2600);                      // arpeggio
        if (i % 2 === 0) note('triangle', ch[0] - 12 + (i % 4 === 2 ? 12 : 0), t, step * 2, 0.24);            // bass, 8ths
        if (i % 2 === 0) hit(t, i % 4 === 2 ? 0.07 : 0.045, 7000, 0.04);                                       // hi-hat
        if (i === 0 || i === 8 || (i === 10 && bar % 2)) kick(t);
        if (i === 4 || i === 12) { hit(t, 0.2, 1500, 0.12); note('triangle', 50, t, 0.07, 0.12); }             // snare
      }
      CHIP.lead[bar].forEach(([st, m, l]) => note('square', m, b0 + st * step, l * step, 0.085, 3800));
    });
    const done = new Promise(res => { oc.oncomplete = e => res(e.renderedBuffer); });
    const p = oc.startRendering();
    return (p && p.then ? p : done).then(buf => {                 // normalized, so the MUSIC slider sets the level
      const d = buf.getChannelData(0); let peak = 0;
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
      if (peak > 0) for (let i = 0; i < d.length; i++) d[i] *= 0.9 / peak;
      return buf;
    });
  }

  /* ---------- the controls: the top bar's SETTINGS button (a speaker that shows sound on/off). It opens THE SETTINGS
     PANEL (shared/ui-kit.js: sound, music, effects, motion, mic sensitivity, the game's own options) ---------- */
  const SPK = '<svg class="snd-ico" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M3 9h4l5-4v14l-5-4H3z"/><path class="waves" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/><path class="x" d="M16 9l6 6M22 9l-6 6"/></svg>';
  function mountControls(el, {lobby = false} = {}) {
    if (!el) return;
    el.classList.add('sound-ctl');
    el.innerHTML = `<button type="button" class="snd-btn snd-open" aria-haspopup="dialog">${SPK}<span class="snd-lbl">Settings</span></button>`;
    const open = el.querySelector('.snd-open');
    function draw() {
      const on = store.sfx;
      open.setAttribute('aria-pressed', on);
      open.setAttribute('aria-label', `Settings (sound ${on ? 'on' : 'off'})`);
    }
    open.addEventListener('click', () => { if (A.UI && A.UI.settings) A.UI.settings.open({lobby, onClose: () => open.focus()}); });
    el._draw = draw;
    draw();
  }
  const refreshAll = () => document.querySelectorAll('.sound-ctl').forEach(c => c._draw && c._draw());
  /** a sound setting changed in the Settings panel (k = 'sfx' | 'sfxVol' | 'musVol' | 'ambVol'; done = the slider was let go) */
  function settingsChanged(k, done) {
    applySettings();
    if (k !== 'sfxVol') applyAll();
    if (k === 'sfx' && store.sfx) playEvent('ui-toggle', {force: true});
    if (done && k === 'sfxVol') playEvent('ui-toggle');
    refreshAll();
  }
  /** where the loops play, when it isn't here (the Settings panel's note under the volumes) */
  function loopNote() {
    const m = !CH.mus.want, a = !CH.amb.want;
    return m && a ? 'Music plays on the menus, the hum on the arcade floor.' : m ? 'Music plays on the menus.' : '';
  }

  /* ---------- GAME MENU MUSIC (games.js `menuMusic`): one call whenever a game changes screen ----------
     gameMenuMusic(gameId)          a MENU screen (level select, mode picker, intro panels, results): the game's
                                    menuMusic, else the arcade's select-music (else its built-in tune), fading in over
                                    MENU_XF s. A game that listens pauses the microphone here (nothing counts on a
                                    menu, and music never plays while the mic listens).
     gameMenuMusic(gameId, false)   a level / round starts: the music fades out over MENU_FADE s; the mic is back on at
                                    once but hears nothing new until the fade has ended (Pitch.suppress), so no game
                                    ever hears its music.
     {afterEffects: true}           (results) wait until the result sounds (and any queued Sfx.sequence) have ended
     Games that run their own music (Dojo Duel, Lost Signal, Vanishing Ink, Arcade Quest: games.js `menuMusicOwn`)
     don't call it. */
  const MENU_FADE = 0.5, MENU_XF = 0.8;
  let menuT = 0, menuPaused = false;
  function gameMenuMusic(gameId, on = true, {afterEffects = false} = {}) {
    clearTimeout(menuT); menuT = 0;
    if (A.Bg) A.Bg.menu(on);                                 // the menu background (shared/backgrounds.js) follows the same screens
    const P = A.Pitch;
    if (!on) {
      if (menuPaused && P && P.pauseListening) { if (P.suppress) P.suppress(MENU_FADE * 1000); P.pauseListening(false); }
      menuPaused = false;
      want(CH.mus, null, {fade: MENU_FADE});
      applyAll();
      return;
    }
    if (P && P.pauseListening && !P.paused) { P.pauseListening(true); menuPaused = true; }
    const g = (A.ALL_GAMES || A.GAMES || []).find(x => x.id === gameId);
    const go = () => {
      menuT = 0;
      const wait = afterEffects ? Math.max(busyFor(), seqs.size ? 200 : 0) : 0;
      if (wait > 30) { menuT = setTimeout(go, Math.min(wait + 100, 1000)); return; }
      const legacy = g && g.menuMusic && (entry(g.menuMusic) || {}).legacy;   // a track uploaded under an older name (sounds.js `legacy`)
      want(CH.mus, [g && g.menuMusic, legacy, 'select-music'], {builtIn: true, fade: MENU_XF});
      applyAll();
    };
    if (afterEffects) menuT = setTimeout(go, 150);          // the result sounds start in the same moment: let them register
    else go();
  }

  /** PRESS START's question on page load: does this browser already allow sound without a tap (Chrome sometimes
      does)? Makes the AudioContext now (it stays suspended until the first tap when the answer is no) and resolves
      true if it is running within ms. */
  function autoStart(ms = 300) {
    if (!AC) return Promise.resolve(false);
    if (!ctx) unlock({type: 'page load'});
    return new Promise(res => {
      if (!ctx) return res(false);
      if (ctx.state === 'running') return res(true);
      const t = setTimeout(() => res(ctx.state === 'running'), ms);
      ctx.addEventListener('statechange', () => { if (ctx.state === 'running') { clearTimeout(t); res(true); } });
    });
  }

  /** THE ANNOUNCER: a voice line as a screen appears ("Choose your instrument!", "Select a level!"). It plays `delay` ms
      in, or when the last effect (a START or PRESS START sound) has ended, whichever is later; at most once per `gap`
      ms (sessionStorage `key`, set when it is heard, so also across pages in this tab); only once a tap has started the
      audio (a page loaded straight onto the screen stays quiet rather than speak late). While `hold()` is true (a panel
      covers the screen) it waits; once `alive()` is false (the screen closed) or cancel() was called (the student
      already tapped a choice) it never plays. The music and ambience dip while it speaks (duck). onPlay(seconds) runs
      as it starts (the heading's swell). Returns {cancel()}. */
  function announce(name, {key, gap = 60000, delay = 500, alive = () => true, hold = () => false, onPlay} = {}) {
    let heard = 0; try { heard = +sessionStorage.getItem(key) || 0; } catch (e) { /* private mode */ }
    const h = {off: false, cancel() { h.off = true; }};
    if (!ctx || Date.now() - heard < gap) { h.off = true; return h; }
    const t0 = performance.now();
    const go = () => {
      if (h.off || !alive()) return;
      const wait = Math.max(delay - (performance.now() - t0), busyFor());
      if (wait > 20) { setTimeout(go, wait); return; }
      if (hold()) { setTimeout(go, 300); return; }
      if (!ctx || ctx.state !== 'running') return;
      whenReady(name, 400).then(() => {
        if (h.off || !alive()) return;
        const d = Sfx.event(name);
        if (!d) return;                                               // muted: not heard, so not counted
        try { sessionStorage.setItem(key, String(Date.now())); } catch (e) { /* private mode */ }
        duck(d * 1000);
        if (onPlay) onPlay(d);
      });
    };
    setTimeout(go, delay);
    return h;
  }

  let leaving = false;
  const seqs = new Set();                                 // sequences still playing (Sfx.sequence handles)
  // a channel and its sub-channels: 'dojo' also means 'dojo:voice'
  const inCh = (h, channel) => !channel || h.channel === channel || h.channel.startsWith(channel + ':');
  const chOf = name => (name === 'lobby-ambience' ? CH.amb : name === 'select-music' || selMusic(name) || /^quest-/.test(name) ? CH.mus : null);
  const Sfx = A.Sfx = A.sfx = {
    /** a page's option: the longest part of a sound (ms) that mutes the microphone (null = the whole sound).
        Note Storm sets it so a long hit sound never leaves the detector deaf; the echo margin is added after it. */
    muteMax: null,
    /** the three original sounds by name ('whoosh' | 'coin' | 'blip') */
    play(name) {
      if (!ready() || !SOUNDS[name]) return 0;
      try { return playGen(SOUNDS[name]); } catch (e) { return 0; }
    },
    /** play an event from sounds.js; returns its length in seconds (0 when muted, before the first tap, or not allowed) */
    event: (name, opts) => playEvent(name, opts && opts.muteCap != null ? {muteCap: opts.muteCap} : undefined),
    /** play events one after another (each starts `gap` ms after the one before ends, by its real length); falsy
        names are skipped. A VOICE line (sounds.js voice: true) waits until any voice already speaking has finished,
        so two voices never talk at once. maxStep (ms): the next never waits longer than this (a long recording
        overlaps the next effect instead of delaying it). Returns a handle: handle.cancel() drops the rest; `channel` groups
        sequences so a page can drop them all with cancelAll(channel) (Dojo Duel: 'dojo', when a match ends) */
    sequence(names, gap = 80, {channel = 'page', maxStep = Infinity} = {}) {
      const list = names.filter(Boolean);
      const h = {channel, timer: 0, done: false, cancelled: false,
        cancel() { if (h.done) return; h.cancelled = h.done = true; clearTimeout(h.timer); seqs.delete(h); }};
      const next = () => {
        if (h.done) return;
        if (!list.length) { h.done = true; seqs.delete(h); return; }
        const wait = isVoice(list[0]) ? busyFor('voice') : 0;
        if (wait > 20) { h.timer = setTimeout(next, wait + gap); return; }
        const d = playEvent(list.shift());
        h.timer = setTimeout(next, Math.min((d || 0.05) * 1000 + gap, maxStep));
      };
      seqs.add(h);
      next();
      return h;
    },
    /** drop every sequence still waiting to play (one channel, or all): nothing from before plays later */
    cancelAll(channel) { [...seqs].forEach(h => { if (inCh(h, channel)) h.cancel(); }); },
    /** how many sequences (of that channel) still have sounds to play */
    pending: channel => [...seqs].filter(h => inCh(h, channel)).length,
    hush,
    /** preload (and decode, once unlocked) every effect of these screens now, ahead of the rest (sounds.js `screen`):
        a game's setup screen calls it so its sounds are ready before play */
    preloadScreen(...names) {
      names.forEach(n => screens.add(n));
      prefer(A.Sounds ? A.Sounds.names().filter(n => { const e = entry(n); return e && e.file && !e.loop && names.includes(e.screen); }) : []);
    },
    get events() { return A.Sounds ? A.Sounds.names() : Object.keys(EVENTS); },
    history: played,
    /** tests: the loudness cap's reference (sounds.js `cap`) and the limits a sound with cap dB gets */
    loudness: (cap = 3) => Object.assign({loudest, loudestRms, REF_PEAK, REF_RMS}, capLimit({cap})),
    /** the arcade's audio output for shared/tones.js (Lost Signal's pitched tones): {ctx, out} once the audio is
        unlocked and sound is on (out = the EFFECTS bus: mute and the EFFECTS slider apply), else null */
    output() { return ready() ? {ctx, out: fxBus} : null; },
    /** the same output WITHOUT the EFFECTS slider (SOUND ON/OFF still mutes it: null when off). Only for sounds a
        student must hear whatever the slider says: Music Highway's calibration clicks */
    outputRaw() { return ready() ? {ctx, out: rawBus} : null; },
    /** an event's uploaded FILE as a decoded AudioBuffer, or null (no file, not decoded yet, sound off, or a file://
        page, which can't decode). Music Highway schedules its backing-drums file (mh-drums-<song>) on the audio clock
        with it; nothing here plays it. */
    buffer(name) {
      const e = entry(name);
      if (!e || !e.file || !ready() || FILE_MODE) return Promise.resolve(null);
      return load(e.file).then(r => (r && r.state === 'ok' && r.buf) || null, () => null);
    },
    /** a piano key at a SOUNDING midi note (Keys to the City's TOUCH mode only: never while a mic listens; it refuses
        then). Respects mute like every sound here. */
    piano(midi) {
      if (!ready() || (A.Pitch && A.Pitch.listening && A.Pitch.listening())) return false;
      try { piano(midi); return true; } catch (e) { return false; }
    },
    /** a bell bar at a SOUNDING midi note (Chime Heist). Respects mute like every sound here. */
    bell(midi) {
      if (!ready()) return false;
      try { bell(midi); return true; } catch (e) { return false; }
    },
    /** THE MUSIC MANAGER (see the top of this file): the track this page wants on the MUSIC channel. Never start
        audio any other way. */
    setMusic: (names, opts) => want(CH.mus, names, opts),
    gameMenuMusic, autoStart, announce,
    /** the track this page wants on the AMBIENCE channel (the arcade floor's lobby-ambience) */
    setAmbience: (names, opts) => want(CH.amb, names, opts),
    /** fetch these music events' files now (the likely next tracks), so they start at once when wanted */
    preloadMusic: names => [].concat(names || []).forEach(n => fetchEarly(fileOf(n))),
    /** re-check what should play (after Pitch.pauseListening, which changes Pitch.listening()) */
    sync: () => applyAll(),
    /** tests: what each channel wants and plays */
    musicState: () => Object.fromEntries(Object.values(CH).map(c => [c.name, {want: c.want ? c.want.events.join('|') : null, builtIn: !!(c.want && c.want.builtIn),
      playing: c.cur ? (c.cur.gen ? 'built-in' : c.cur.file) : null, duck: c.duck ? +c.duck.gain.value.toFixed(2) : 1,
      pos: c.cur && c.cur.t0 != null ? +posOf(c.cur).toFixed(2) : null}])).valueOf(),
    /** tests: where each resuming track stopped */
    trackPos: () => Object.assign({}, trackPos),
    get unlocked() { return !!ctx && ctx.state === 'running'; },
    /** a tap or key on this page has started the audio (it may still be unlocking) */
    get started() { return !!ctx; },
    duck, duckHold, busy: busyFor,
    /** ?debug: the music log (also shown on the page) */
    musicLog,
    /** the sounds this page needs, preloaded after the first tap: 'floor', 'select', 'game', or a game id */
    use(...names) { names.forEach(n => screens.add(n)); if (ctx && ctx.state === 'running') preload(); },
    prefer, eventSoon, whenReady,
    /** play a sound, then go to href when it ends (at most GO_MAX ms; straight away when muted) */
    playThenGo(name, href) {
      if (leaving) return;                 // a second tap during the wait does nothing
      leaving = true;
      setTimeout(() => { leaving = false; }, GO_MAX + 500);
      // the music and ambience fade out (0.8 s) as the page changes, instead of stopping dead; the wish stays, so a page
      // brought back with the Back button starts them again
      if (ctx) Object.values(CH).forEach(c => { if (c.cur) fadeOut(c, MENU_XF); });
      const go = d => { if (d) setTimeout(() => { location.href = href; }, Math.min(GO_MAX, Math.max(120, d * 1000))); else location.href = href; };
      if (SOUNDS[name]) go(Sfx.play(name)); else eventSoon(name).then(go);
    },
    mountControls, settingsChanged, loopNote, refreshControls: () => refreshAll(),
    /* for the Sound Board (sound-board/index.html) */
    board: {
      start() { unlock(); return ctx; },
      /** fresh (default): load again, skipping every cache (what is live on the server right now); false: reuse the last load */
      load: (name, fresh = true) => { const e = entry(name); return e && e.file ? load(e.file, {fresh, bust: fresh}) : Promise.resolve({state: 'missing'}); },
      /** 'file' (with .ext), 'fallback' (the action's own built-in sound, or select-default's file) or 'generated' */
      status(name) {
        const e = entry(name), rec = e && files[e.file];
        if (rec && rec.state === 'loading') return {kind: 'checking'};
        if (rec && rec.state === 'ok') return {kind: 'file', ext: rec.ext, dur: rec.dur, fileDur: rec.fileDur, bytes: rec.bytes};
        if (e && e.fallback) { const f = files[(entry(e.fallback) || {}).file]; if (f && f.state === 'ok') return {kind: 'fallback', via: e.fallback + '.' + f.ext}; }
        return {kind: builtIn(name, e).kind === 'generated' && !(e && e.fallback) ? 'generated' : 'fallback'};
      },
      play: name => playEvent(name, {force: true}),
      /** start / stop a loop event ('lobby-ambience', 'select-music') here, through the music manager */
      loop(name, on) { const c = chOf(name); if (!c) return null; want(c, on ? name : null, {builtIn: true}); return c.cur; },
      ambience(on) { return Sfx.board.loop('lobby-ambience', on); },
      renderChiptune,                                     // the built-in music as an AudioBuffer (tests, listening)
      loopState: name => { const c = chOf(name); return c ? {allowed: !!c.want, playing: !!c.cur, gen: !!(c.cur && c.cur.gen), rendered: !!c.buf} : null; },
      analyser: () => analyser,
      bus: () => fxBus,                                   // the effects output (the board plays its loop test into it)
      mix: () => analyser,                                // everything the arcade's effects play (fxBus + outputRaw), for tests
      entry,
      files,
    },
  };
})(window.Arcade);
