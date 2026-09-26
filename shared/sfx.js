/* Band Arcade: THE SOUND SYSTEM. Every sound on every page goes through here.
   Which sounds exist, their files, volumes and rules: shared/sounds.js (the list). Mat's recordings: shared/sounds/
   (<file>.m4a, else <file>.mp3). A missing or broken file falls back to the sound the arcade already had for that
   action (the generated sounds below), or a short generated retro beep, so nothing ever goes silent; a missing file
   is only noted in the console.
     Arcade.Sfx.event(name)            play an event (sounds.js). Returns its length in seconds (0 = not played)
     Arcade.Sfx.sequence([names])      play events one after another, each when the last one ends (results screens)
     Arcade.Sfx.play('whoosh' | 'coin' | 'blip')   the three original generated sounds
     Arcade.Sfx.bell(soundingMidi)     a bell bar's tone at its real pitch (Chime Heist; always generated, never a file)
     Arcade.Sfx.playThenGo(name, href) play, then change page when the sound ends (never later than 1.5 s)
     Arcade.Sfx.use(...screens)        which sounds this page needs ('floor', 'select', 'game', a game id): they are
                                       preloaded after the first tap, two at a time (school Wi-Fi)
     Arcade.Sfx.mountControls(el)      the speaker button: SOUND ON/OFF, EFFECTS and AMBIENCE sliders (saved on the device)
     Arcade.Sfx.allowAmbience(false)   a page where the lobby ambience never plays (every game page, Select Player)
     Arcade.Sfx.allowMusic(true, id)   a page where the character-select music plays (Select Player only): the game's own
                                       select-music-<id> file if there is one, else select-music, else a built-in
                                       original chiptune loop
   THE MICROPHONE: a sound played while a game is listening (Arcade.Pitch.listening()) makes the detector ignore
   everything for the sound's length + ECHO_MS (Arcade.Pitch.suppress), and games pause their timers meanwhile
   (Arcade.Pitch.isSuppressed). Sounds marked mic: false in sounds.js never play while listening.
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
  let ctx = null, master = null, fxBus = null, analyser = null, span = 0;
  const store = A.store;
  const vol = k => { const v = store && store[k]; return typeof v === 'number' ? v : DEFAULTS[k]; };
  const listening = () => !!(A.Pitch && A.Pitch.listening && A.Pitch.listening());
  const entry = name => A.Sounds ? A.Sounds.get(name) : null;

  /* ---------- unlock on the first tap / key press ---------- */
  function unlock() {
    if (!AC) return;
    try {
      if (!ctx) {
        ctx = new AC();
        fxBus = ctx.createGain(); analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
        fxBus.connect(analyser); analyser.connect(ctx.destination);
        master = ctx.createGain(); master.gain.value = GEN_LEVEL; master.connect(fxBus);    // the generated sounds
        Object.values(LOOPS).forEach(c => { c.bus = ctx.createGain(); c.bus.connect(ctx.destination); });
        applySettings();
      }
      if (ctx.state !== 'running') ctx.resume().then(unlocked, () => {}); else unlocked();
    } catch (e) { /* no sound on this browser; everything else still works */ }
  }
  function unlocked() {
    if (ctx.state !== 'running') return;
    UNLOCK_EVENTS.forEach(t => removeEventListener(t, unlock, true));
    syncLoops();
    preload();
  }
  // pointerdown/keydown are the first chance; touchend/click are backups for older iPads that only unlock on those
  const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend', 'click'];
  UNLOCK_EVENTS.forEach(t => addEventListener(t, unlock, true));

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
    Object.values(LOOPS).forEach(c => {
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
    n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t + 0.16); span = Math.max(span, 0.16);
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
      return {fn: () => e.gen.forEach(([f, at, len, v = 0.3, type]) => tone(f, at, len, v, type)), kind: 'fallback'};
    }
    return {fn: GENERIC[name] || GENERIC.retro, kind: 'generated'};
  }
  function playGen(fn) { span = 0; fn(); return Math.max(span, 0.05); }

  /* ---------- sound files ---------- */
  const MISS_KEY = 'bandarcade.snd-miss', miss = new Set();
  try { JSON.parse(sessionStorage.getItem(MISS_KEY) || '[]').forEach(u => miss.add(u)); } catch (e) {}
  const files = {};            // file name -> {state: 'loading' | 'ok' | 'missing', buf | el, ext, dur, loopStart, loopEnd}
  const decode = ab => new Promise((res, rej) => { const p = ctx.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); });
  const loadEl = url => new Promise((res, rej) => {
    const el = new Audio(); let done = false;
    el.preload = 'auto';
    el.addEventListener('canplaythrough', () => { if (!done) { done = true; res(el); } }, {once: true});
    el.addEventListener('error', () => { if (!done) { done = true; rej(); } }, {once: true});
    setTimeout(() => { if (!done) { done = true; rej(); } }, 8000);
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
    rec.p = (async () => {
      let asked = false;
      for (const ext of ['m4a', 'mp3']) {
        const base = BASE + file + '.' + ext + '?v=' + VERSION();
        const url = bust ? base + '&t=' + Date.now() : base;
        if (!fresh && !bust && miss.has(base)) continue;
        asked = true;
        try {
          if (FILE_MODE || !ctx) {
            const el = await loadEl(url);
            Object.assign(rec, {state: 'ok', el, ext, url, dur: el.duration || 0.5});
          } else {
            const r = await fetch(url, bust ? {cache: 'reload'} : undefined);
            if (!r.ok) throw new Error(r.status);
            const ab = await r.arrayBuffer(); rec.bytes = ab.byteLength;
            let buf = await decode(ab);
            const pts = loopPoints(buf);
            if (loops(file)) buf = crossfaded(buf, pts);                     // a loop: bake a seamless wrap into the buffer
            Object.assign(rec, {state: 'ok', buf, ext, url, dur: buf.duration}, loops(file) ? {loopStart: 0, loopEnd: buf.duration, trimmed: pts} : pts);
          }
          miss.delete(base);
          const lc = Object.values(LOOPS).find(c => loopFiles(c).includes(file)), fs = lc ? loopFiles(lc) : [];
          if (lc && lc.cur && (lc.cur.gen || fs.indexOf(file) < fs.indexOf(lc.cur.file))) { stopLoop(lc, true); syncLoops(); }   // swap in the better loop
          return rec;
        } catch (e) {
          miss.add(base);
          try { sessionStorage.setItem(MISS_KEY, JSON.stringify([...miss])); } catch (x) {}
        }
      }
      rec.state = 'missing';
      if (asked) console.info(`Band Arcade sound: no shared/sounds/${file}.m4a or ${file}.mp3 (or it would not play); using the built-in sound.`);
      return rec;
    })();
    return rec.p;
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
  const loops = file => A.Sounds && A.Sounds.names().some(n => { const e = entry(n); return e && e.loop && e.file === file; });
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
  function playFile(rec, e) {
    const level = e.vol == null ? 0.8 : e.vol;
    if (rec.el) {
      const el = rec.el.cloneNode(); el.volume = Math.min(1, level * vol('sfxVol'));
      el.play().catch(() => {}); return rec.dur;
    }
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = rec.buf; g.gain.value = level;
    s.connect(g); g.connect(fxBus); s.start();
    return rec.dur;
  }

  /* ---------- playing an event: its file, else its fallback's file, else the built-in sound ---------- */
  function resolve(name, depth = 0) {
    const e = entry(name);
    if (e && e.file) {
      const rec = files[e.file];
      if (rec && rec.state === 'ok') return {how: 'file', rec, e};
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
  function playEvent(name, {force = false} = {}) {
    if (!force && !ready()) return 0;
    if (force && !ctx) return 0;
    const e = entry(name);
    if (e && e.loop) return 0;                             // the loop plays through the ambience controls
    if (e && e.mic === false && listening()) return 0;
    let dur = 0, how = '';
    try { const r = resolve(name); how = r.how === 'file' ? 'file:' + r.rec.file + '.' + r.rec.ext : r.kind; dur = r.how === 'file' ? playFile(r.rec, r.e) : playGen(r.fn); }
    catch (x) { dur = 0; }
    if (dur && listening()) A.Pitch.suppress(dur * 1000 + (e && e.echo != null ? e.echo : ECHO_MS));   // sounds.js `echo`: a shorter tail
    if (dur) { played.push({name, how, dur: +dur.toFixed(3), at: Math.round(performance.now()), muted: listening()}); if (played.length > 60) played.shift(); }
    return dur;
  }

  const played = [];       // the last 60 sounds played on this page (tests and the Sound Board): {name, how, dur, at, muted}

  /* ---------- preloading: only this page's sounds, after the first tap, two at a time ---------- */
  const screens = new Set(['general']);
  let queue = [], busy = 0;
  function preload() {
    if (!ctx || !A.Sounds) return;
    A.Sounds.names().forEach(n => {
      const e = entry(n);
      if (!e || !e.file || !screens.has(e.screen) || files[e.file] || queue.includes(e.file)) return;
      if (e.loop && !(loopOf(n) || {}).allowed) return;
      queue.push(e.file);
      if (e.fallback) { const f = entry(e.fallback); if (f && f.file && !queue.includes(f.file) && !files[f.file]) queue.push(f.file); }
    });
    pump();
  }
  function pump() {
    while (busy < 2 && queue.length) {
      busy++;
      load(queue.shift()).then(() => { busy--; pump(); });
    }
  }

  /* ---------- background loops: the lobby AMBIENCE (arcade floor) and the character-select MUSIC (Select Player) ----------
     Each channel has its event in sounds.js (loop: true), its own slider (ambVol / musVol) and output, where it may play
     (allowAmbience / allowMusic) and a built-in version for when there is no file: the room hum, and an original chiptune
     loop rendered once into a buffer (so it loops as seamlessly as a file). Files loop with a baked crossfade (above). */
  const LOOPS = {
    amb: {event: 'lobby-ambience', key: 'ambVol', allowed: true, cur: null, bus: null, gen: genHum},
    mus: {event: 'select-music', key: 'musVol', allowed: false, cur: null, bus: null, gen: genMusic},
  };
  const loopOf = name => Object.values(LOOPS).find(c => c.event === name);
  /** a channel's events, best first: Select Player's music tries select-music-<game id> (allowMusic(true, gameId)), then select-music */
  const loopEvents = c => [c.alt, c.event].filter(Boolean);
  const loopFiles = c => loopEvents(c).map(n => (entry(n) || {}).file).filter(Boolean);
  const loopVol = c => store.sfx ? vol(c.key) : 0;
  function loopBuffer(c, buf, from, to, level, fadeIn) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
    s.buffer = buf; s.loop = true; s.loopStart = from; s.loopEnd = to;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + fadeIn);   // fades in, never pops
    s.connect(g); g.connect(c.bus); s.start(t, from);
    return {out: g, nodes: [s]};
  }
  function startLoop(c) {
    if (c.cur || !ctx) return;
    for (const n of loopEvents(c)) {                       // the best file that has loaded
      const e = entry(n) || {vol: 0.6}, rec = files[e.file], level = e.vol == null ? 0.6 : e.vol;
      if (!rec || rec.state !== 'ok') continue;
      if (rec.el) {                                       // a double-clicked page: an <audio> loop
        const el = rec.el.cloneNode(); el.loop = true; el.volume = Math.min(1, loopVol(c) * level); el.play().catch(() => {});
        c.cur = {el, level, file: e.file}; return;
      }
      c.cur = Object.assign(loopBuffer(c, rec.buf, rec.loopStart, rec.loopEnd, level, 1.2), {file: e.file}); return;
    }
    loopFiles(c).forEach(f => { if (!files[f]) load(f); });   // the built-in loop now; a file as soon as one has loaded
    c.cur = c.gen(c);
  }
  function stopLoop(c, quick) {
    if (!c.cur) return;
    const a = c.cur; c.cur = null;
    if (a.el) { a.el.pause(); return; }
    if (!a.out) return;                                    // the chiptune was still being rendered
    const t = ctx.currentTime, fade = quick ? 0.4 : 0.3;
    a.out.gain.cancelScheduledValues(t);
    a.out.gain.setValueAtTime(Math.max(0.0001, a.out.gain.value), t);
    a.out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    a.nodes.forEach(o => o.stop(t + fade + 0.05));
  }
  function syncLoops() {
    if (!ctx || ctx.state !== 'running') return;
    Object.values(LOOPS).forEach(c => {
      if (c.allowed && store.sfx && vol(c.key) > 0 && !document.hidden && !listening()) startLoop(c); else stopLoop(c);
    });
  }
  document.addEventListener('visibilitychange', syncLoops);
  addEventListener('pagehide', () => Object.values(LOOPS).forEach(c => stopLoop(c)));
  addEventListener('pageshow', e => { if (e.persisted) syncLoops(); });   // back button restores the page

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
    if (c.buf) return Object.assign(loopBuffer(c, c.buf, 0, c.buf.duration, MUS_GEN_LEVEL, 0.8), {gen: true});
    const wait = {gen: true, rendering: true};
    if (!c.rendering) c.rendering = renderChiptune().then(buf => {
      c.buf = buf;
      if (c.cur && c.cur.rendering) { c.cur = null; syncLoops(); }   // still wanted: start it now
    }, () => { if (c.cur && c.cur.rendering) c.cur = null; });
    return wait;
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

  /* ---------- the controls: a speaker button that opens SOUND ON/OFF and two volume sliders ---------- */
  let popId = 0;
  const SPK = '<svg class="snd-ico" viewBox="0 0 24 24" aria-hidden="true"><path class="spk" d="M3 9h4l5-4v14l-5-4H3z"/><path class="waves" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/><path class="x" d="M16 9l6 6M22 9l-6 6"/></svg>';
  function mountControls(el) {
    if (!el) return;
    const id = 'sndPop' + (++popId);
    el.classList.add('sound-ctl');
    el.innerHTML =
      `<button type="button" class="snd-btn snd-open" aria-expanded="false" aria-controls="${id}" aria-label="Sound settings">${SPK}</button>` +
      `<div class="snd-pop" id="${id}" role="group" aria-label="Sound settings" hidden>` +
        `<button type="button" class="snd-btn snd-toggle">${SPK}<span class="snd-txt"></span></button>` +
        `<label class="snd-row"><span>Effects</span><input type="range" min="0" max="100" step="5" data-k="sfxVol" aria-label="Effects volume"><output></output></label>` +
        `<label class="snd-row"><span>Music</span><input type="range" min="0" max="100" step="5" data-k="musVol" aria-label="Music volume"><output></output></label>` +
        `<label class="snd-row"><span>Ambience</span><input type="range" min="0" max="100" step="5" data-k="ambVol" aria-label="Ambience volume"><output></output></label>` +
        `<p class="snd-note" hidden></p>` +
      `</div>`;
    const open = el.querySelector('.snd-open'), pop = el.querySelector('.snd-pop'), tg = el.querySelector('.snd-toggle');
    function draw() {
      const on = store.sfx;
      [open, tg].forEach(b => b.setAttribute('aria-pressed', on));
      open.setAttribute('aria-label', `Sound settings (sound ${on ? 'on' : 'off'})`);
      tg.querySelector('.snd-txt').textContent = on ? 'Sound on' : 'Sound off';
      el.querySelectorAll('input[type=range]').forEach(r => {
        r.value = Math.round(vol(r.dataset.k) * 100); r.nextElementSibling.textContent = r.value + '%';
        r.disabled = !on;
      });
      // where the loops play, when it isn't here
      const note = el.querySelector('.snd-note'), m = !LOOPS.mus.allowed, a = !LOOPS.amb.allowed;
      note.hidden = !m && !a;
      note.textContent = m && a ? 'Music plays on Select Player, ambience on the arcade floor.' : m ? 'Music plays on Select Player.' : a ? 'Ambience plays on the arcade floor.' : '';
    }
    const show = v => { pop.hidden = !v; open.setAttribute('aria-expanded', v); };
    open.addEventListener('click', () => { show(pop.hidden); if (!pop.hidden) tg.focus(); });
    tg.addEventListener('click', () => {
      store.setSfx(!store.sfx); draw(); applySettings(); syncLoops();
      if (store.sfx) playEvent('ui-toggle', {force: true}); refreshAll();
    });
    el.querySelectorAll('input[type=range]').forEach(r => {
      r.addEventListener('input', () => {
        store.setVolume(r.dataset.k, r.value / 100); r.nextElementSibling.textContent = r.value + '%';
        applySettings(); if (r.dataset.k !== 'sfxVol') syncLoops();
      });
      r.addEventListener('change', () => { if (r.dataset.k === 'sfxVol') playEvent('ui-toggle'); refreshAll(); });
    });
    document.addEventListener('pointerdown', e => { if (!pop.hidden && !el.contains(e.target)) show(false); });
    el.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) { e.stopPropagation(); show(false); open.focus(); } });
    el._draw = draw;
    draw();
  }
  const refreshAll = () => document.querySelectorAll('.sound-ctl').forEach(c => c._draw && c._draw());

  let leaving = false;
  const Sfx = A.Sfx = {
    /** the three original sounds by name ('whoosh' | 'coin' | 'blip') */
    play(name) {
      if (!ready() || !SOUNDS[name]) return 0;
      try { return playGen(SOUNDS[name]); } catch (e) { return 0; }
    },
    /** play an event from sounds.js; returns its length in seconds (0 when muted, before the first tap, or not allowed) */
    event: name => playEvent(name),
    /** play events one after another (each starts when the one before ends); falsy names are skipped */
    sequence(names, gap = 80) {
      const list = names.filter(Boolean);
      const next = () => { if (!list.length) return; const d = playEvent(list.shift()); setTimeout(next, (d || 0.05) * 1000 + gap); };
      next();
    },
    get events() { return A.Sounds ? A.Sounds.names() : Object.keys(EVENTS); },
    history: played,
    /** a bell bar at a SOUNDING midi note (Chime Heist). Respects mute like every sound here. */
    bell(midi) {
      if (!ready()) return false;
      try { bell(midi); return true; } catch (e) { return false; }
    },
    allowAmbience(on) { LOOPS.amb.allowed = !!on; syncLoops(); refreshAll(); },
    /** the character-select music may play on this page (Select Player); false fades it out (leaving the page) */
    allowMusic(on, gameId) {
      if (gameId !== undefined) { const alt = gameId ? 'select-music-' + gameId : null; if (alt !== LOOPS.mus.alt) { stopLoop(LOOPS.mus, true); LOOPS.mus.alt = alt; } }
      LOOPS.mus.allowed = !!on; syncLoops(); refreshAll();
    },
    /** the sounds this page needs, preloaded after the first tap: 'floor', 'select', 'game', or a game id */
    use(...names) { names.forEach(n => screens.add(n)); if (ctx && ctx.state === 'running') preload(); },
    /** play a sound, then go to href when it ends (at most GO_MAX ms; straight away when muted) */
    playThenGo(name, href) {
      if (leaving) return;                 // a second tap during the wait does nothing
      leaving = true;
      setTimeout(() => { leaving = false; }, GO_MAX + 500);
      const d = SOUNDS[name] ? Sfx.play(name) : playEvent(name);
      if (d) setTimeout(() => { location.href = href; }, Math.min(GO_MAX, Math.max(120, d * 1000))); else location.href = href;
    },
    mountControls,
    /* for the Sound Board (sound-board/index.html) */
    board: {
      start() { unlock(); return ctx; },
      /** fresh (default): load again, skipping every cache (what is live on the server right now); false: reuse the last load */
      load: (name, fresh = true) => { const e = entry(name); return e && e.file ? load(e.file, {fresh, bust: fresh}) : Promise.resolve({state: 'missing'}); },
      /** 'file' (with .ext), 'fallback' (the action's own built-in sound, or select-default's file) or 'generated' */
      status(name) {
        const e = entry(name), rec = e && files[e.file];
        if (rec && rec.state === 'loading') return {kind: 'checking'};
        if (rec && rec.state === 'ok') return {kind: 'file', ext: rec.ext, dur: rec.dur, bytes: rec.bytes};
        if (e && e.fallback) { const f = files[(entry(e.fallback) || {}).file]; if (f && f.state === 'ok') return {kind: 'fallback', via: e.fallback + '.' + f.ext}; }
        return {kind: builtIn(name, e).kind === 'generated' && !(e && e.fallback) ? 'generated' : 'fallback'};
      },
      play: name => playEvent(name, {force: true}),
      /** start / stop a loop event ('lobby-ambience', 'select-music') here, wherever it is normally allowed */
      loop(name, on) { const c = loopOf(name); if (!c) return null; if (on) { c.allowed = true; startLoop(c); } else stopLoop(c); return c.cur; },
      ambience(on) { return Sfx.board.loop('lobby-ambience', on); },
      renderChiptune,                                     // the built-in music as an AudioBuffer (tests, listening)
      loopState: name => { const c = loopOf(name); return c ? {allowed: c.allowed, playing: !!c.cur, gen: !!(c.cur && c.cur.gen), rendered: !!c.buf} : null; },
      analyser: () => analyser,
      bus: () => fxBus,                                   // the effects output (the board plays its loop test into it)
      entry,
      files,
    },
  };
})(window.Arcade);
