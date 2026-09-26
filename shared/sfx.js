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
     Arcade.Sfx.allowAmbience(false)   a page where the lobby ambience never plays (every game page)
   THE MICROPHONE: a sound played while a game is listening (Arcade.Pitch.listening()) makes the detector ignore
   everything for the sound's length + ECHO_MS (Arcade.Pitch.suppress), and games pause their timers meanwhile
   (Arcade.Pitch.isSuppressed). Sounds marked mic: false in sounds.js never play while listening.
   Browsers allow sound only after a tap or key press on each page: the AudioContext starts then, never on load. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const GEN_LEVEL = 0.37;      // the generated sounds at 100 % effects (the default 60 % = their old level, 0.22)
  const AMB_GEN_LEVEL = 0.17;  // the generated room hum at 100 % ambience (the default 30 % = its old level, 0.05)
  const ECHO_MS = 250;         // the detector stays deaf this long after a sound ends (room echo)
  const GO_MAX = 1500;         // playThenGo never waits longer than this
  const DEFAULTS = {sfxVol: 0.6, ambVol: 0.3};

  const AC = window.AudioContext || window.webkitAudioContext;
  const FILE_MODE = location.protocol === 'file:';   // a double-clicked page: Web Audio can't read files, use <audio>
  const here = document.currentScript && document.currentScript.src || (document.querySelector('script[src$="sfx.js"]') || {}).src;
  const BASE = here ? new URL('sounds/', here).href : '';
  let ctx = null, master = null, fxBus = null, ambBus = null, analyser = null, amb = null, span = 0;
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
        ambBus = ctx.createGain(); ambBus.connect(ctx.destination);
        applySettings();
      }
      if (ctx.state !== 'running') ctx.resume().then(unlocked, () => {}); else unlocked();
    } catch (e) { /* no sound on this browser; everything else still works */ }
  }
  function unlocked() {
    if (ctx.state !== 'running') return;
    UNLOCK_EVENTS.forEach(t => removeEventListener(t, unlock, true));
    syncAmbience();
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
    ambBus.gain.setTargetAtTime(store.sfx ? vol('ambVol') : 0, t, 0.05);
    if (amb && amb.el) amb.el.volume = Math.min(1, (store.sfx ? vol('ambVol') : 0) * amb.level);
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
  };
  /* the sound each action had before sound files: new names for old sounds */
  const CURRENT = {'wheel-left': SOUNDS.whoosh, 'wheel-right': SOUNDS.whoosh, 'select-default': SOUNDS.coin,
                   'player-continue': EVENTS['player-select'], 'ui-toggle': SOUNDS.blip, 'lobby-ambience': () => {}};
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
  /** load a file (tries .m4a, then .mp3). fresh: ignore what failed before (the Sound Board) */
  function load(file, {fresh = false} = {}) {
    if (!file || !BASE) return Promise.resolve({state: 'missing'});
    if (files[file] && !(fresh && files[file].state === 'missing')) return files[file].p;
    const rec = files[file] = {state: 'loading', file};
    rec.p = (async () => {
      let asked = false;
      for (const ext of ['m4a', 'mp3']) {
        const url = BASE + file + '.' + ext;
        if (!fresh && miss.has(url)) continue;
        asked = true;
        try {
          if (FILE_MODE || !ctx) {
            const el = await loadEl(url);
            Object.assign(rec, {state: 'ok', el, ext, url, dur: el.duration || 0.5});
          } else {
            const r = await fetch(url);
            if (!r.ok) throw new Error(r.status);
            let buf = await decode(await r.arrayBuffer());
            const pts = loopPoints(buf);
            if (loops(file)) buf = crossfaded(buf, pts);                     // a loop: bake a seamless wrap into the buffer
            Object.assign(rec, {state: 'ok', buf, ext, url, dur: buf.duration}, loops(file) ? {loopStart: 0, loopEnd: buf.duration, trimmed: pts} : pts);
          }
          miss.delete(url);
          if (file === (entry('lobby-ambience') || {}).file && amb && amb.gen) { stopAmbience(true); syncAmbience(); }   // swap the hum for the file
          return rec;
        } catch (e) {
          miss.add(url);
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
    if (dur && listening()) A.Pitch.suppress(dur * 1000 + ECHO_MS);
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
      if (e.loop && !ambienceAllowed) return;
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

  /* ---------- the lobby ambience (arcade floor and Select Player): a seamless loop ---------- */
  function startAmbience() {
    if (amb || !ctx) return;
    const e = entry('lobby-ambience') || {vol: 0.6}, rec = files[e.file];
    if (rec && rec.state === 'ok') {
      const level = e.vol == null ? 0.6 : e.vol;
      if (rec.el) {                                       // a double-clicked page: an <audio> loop
        const el = rec.el.cloneNode(); el.loop = true; el.volume = Math.min(1, vol('ambVol') * level); el.play().catch(() => {});
        amb = {el, level}; return;
      }
      const s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
      s.buffer = rec.buf; s.loop = true; s.loopStart = rec.loopStart; s.loopEnd = rec.loopEnd;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 1.2);   // fades in, never pops
      s.connect(g); g.connect(ambBus); s.start(t, rec.loopStart);
      amb = {out: g, nodes: [s]}; return;
    }
    if (!rec && e.file) load(e.file);                      // the hum now; the file as soon as it has loaded
    // the generated room hum (the original ambience)
    const out = ctx.createGain(), lp = ctx.createBiquadFilter();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    out.gain.exponentialRampToValueAtTime(AMB_GEN_LEVEL, ctx.currentTime + 1.5);
    lp.type = 'lowpass'; lp.frequency.value = 300;
    lp.connect(out); out.connect(ambBus);
    const hum = [60, 60.7, 120].map((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; g.gain.value = i === 2 ? 0.15 : 0.35;
      o.connect(g); g.connect(lp); o.start(); return o;
    });
    const n = noise(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    n.loop = true; nf.type = 'lowpass'; nf.frequency.value = 700; ng.gain.value = 0.25;
    n.connect(nf); nf.connect(ng); ng.connect(out); n.start();
    amb = {out, nodes: [...hum, n], gen: true};
  }
  function stopAmbience(quick) {
    if (!amb) return;
    const a = amb; amb = null;
    if (a.el) { a.el.pause(); return; }
    const t = ctx.currentTime, fade = quick ? 0.4 : 0.3;
    a.out.gain.cancelScheduledValues(t);
    a.out.gain.setValueAtTime(Math.max(0.0001, a.out.gain.value), t);
    a.out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    a.nodes.forEach(o => o.stop(t + fade + 0.05));
  }
  let ambienceAllowed = true;
  function syncAmbience() {
    if (!ctx || ctx.state !== 'running') return;
    if (ambienceAllowed && store.sfx && vol('ambVol') > 0 && !document.hidden && !listening()) startAmbience(); else stopAmbience();
  }
  document.addEventListener('visibilitychange', syncAmbience);
  addEventListener('pagehide', () => stopAmbience());
  addEventListener('pageshow', e => { if (e.persisted) syncAmbience(); });   // back button restores the page

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
        `<label class="snd-row"><span>Ambience</span><input type="range" min="0" max="100" step="5" data-k="ambVol" aria-label="Ambience volume"><output></output></label>` +
        `<p class="snd-note"${ambienceAllowed ? ' hidden' : ''}>Ambience plays on the arcade floor.</p>` +
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
      el.querySelector('.snd-note').hidden = ambienceAllowed;
    }
    const show = v => { pop.hidden = !v; open.setAttribute('aria-expanded', v); };
    open.addEventListener('click', () => { show(pop.hidden); if (!pop.hidden) tg.focus(); });
    tg.addEventListener('click', () => {
      store.setSfx(!store.sfx); draw(); applySettings(); syncAmbience();
      if (store.sfx) playEvent('ui-toggle', {force: true}); refreshAll();
    });
    el.querySelectorAll('input[type=range]').forEach(r => {
      r.addEventListener('input', () => {
        store.setVolume(r.dataset.k, r.value / 100); r.nextElementSibling.textContent = r.value + '%';
        applySettings(); if (r.dataset.k === 'ambVol') syncAmbience();
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
    allowAmbience(on) { ambienceAllowed = !!on; syncAmbience(); refreshAll(); },
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
      load: (name, fresh = true) => { const e = entry(name); return e && e.file ? load(e.file, {fresh}) : Promise.resolve({state: 'missing'}); },
      /** 'file' (with .ext), 'fallback' (the action's own built-in sound, or select-default's file) or 'generated' */
      status(name) {
        const e = entry(name), rec = e && files[e.file];
        if (rec && rec.state === 'ok') return {kind: 'file', ext: rec.ext, dur: rec.dur};
        if (e && e.fallback) { const f = files[(entry(e.fallback) || {}).file]; if (f && f.state === 'ok') return {kind: 'fallback', via: e.fallback + '.' + f.ext}; }
        return {kind: builtIn(name, e).kind === 'generated' && !(e && e.fallback) ? 'generated' : 'fallback'};
      },
      play: name => playEvent(name, {force: true}),
      ambience(on) { if (on) { ambienceAllowed = true; startAmbience(); } else stopAmbience(); return amb; },
      analyser: () => analyser,
      bus: () => fxBus,                                   // the effects output (the board plays its loop test into it)
      entry,
      files,
    },
  };
})(window.Arcade);
