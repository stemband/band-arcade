/* THE CROWD (tests/pitch-classroom.spec.js): a synthetic band room for Classroom mode. Everything here runs INSIDE the
   page (page.evaluate(crowdSim, opts)): it builds the audio, then runs it through the detector's own frame loop
   (Arcade.Pitch._feed: the analysis, the hold, the room floor) and the attack detector (Pitch._envFeed; the snare:
   Arcade.Onsets.analyse) on a fake clock, and counts what counted.
   THE ROOM: a TARGET (this device's student) at level L (its RMS), 5–10 CROWD players (random instruments and notes,
   notes 0.4–1.5 s with 0.1–0.8 s rests, mixed and scaled so the whole crowd's RMS is `crowd` × L; o.perTone instead:
   each player's notes at 0.25–0.4 × L (× perTone / 0.4), the attack tests: "the crowd's attacks at 0.4 L"; o.crowdShort:
   short struck notes with short rests), and a little noise.
   Returns {held: [{t, pc}], attacks: [{t, pc}], target: [{from, to, pc}], …}. */
function crowdSim(o) {
  const A = Arcade, P = A.Pitch, sr = 44100;
  const keep = Object.assign({}, P.ROOM); Object.assign(P.ROOM, o.room || {});   // o.room: try other ROOM numbers
  let seed = o.seed || 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const TIMBRES = {
    flute: [1, 0.45, 0.15, 0.08, 0.03],
    clarinet: [0.12, 0.02, 1, 0.02, 0.15, 0.01, 0.08],
    altosax: [1, 0.95, 0.55, 0.4, 0.3, 0.2, 0.15, 0.1],
    trumpet: [1, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
    horn: [1, 0.7, 0.45, 0.25, 0.15, 0.08],
    trombone: [1, 0.9, 0.7, 0.6, 0.45, 0.3, 0.2, 0.1],
    tuba: [1, 0.6, 0.3, 0.15, 0.08],
    bells: 'bell',
  };
  const SIN = new Float32Array(8192); for (let i = 0; i < 8192; i++) SIN[i] = Math.sin(2 * Math.PI * i / 8192);
  /* one note into buf from sample a to b: a timbre's harmonics (bells: a struck tone that rings down), 15 ms ramps */
  function note(buf, a, b, midi, timbre, amp, struck) {
    const f = 440 * Math.pow(2, (midi - 69) / 12), bell = timbre === 'bell';
    const parts = bell ? [[1, 1], [2.76, 0.25], [5.4, 0.08]] : timbre.map((v, k) => [k + 1, v]);
    const ramp = Math.round(0.015 * sr);
    for (const [h, v] of parts) {
      if (f * h >= sr / 2) continue;
      const step = f * h / sr * 8192; let ph = rnd() * 8192;
      for (let i = a; i < b && i < buf.length; i++) {
        const k = i - a, env = Math.min(1, k / ramp, (b - i) / ramp) * (bell || struck ? Math.exp(-k / (sr * (bell ? 0.9 : 0.35))) : 1);
        buf[i] += amp * v * env * SIN[(ph | 0) & 8191]; ph += step;
      }
    }
  }
  const rms = (buf, a = 0, b = buf.length) => { let s = 0; for (let i = a; i < b; i++) s += buf[i] * buf[i]; return Math.sqrt(s / Math.max(1, b - a)); };
  const N = Math.round(o.seconds * sr);
  const member = A.memberById(o.member), group = A.groupFor(o.member);
  P.setInstrument(group); P.setRange(null);

  /* the crowd: other students, each on their own instrument and notes */
  const crowd = new Float32Array(N), crowdMembers = Object.keys(TIMBRES);
  const players = o.players || (5 + Math.floor(rnd() * 6));
  const crowdOn = [];
  for (let p = 0; p < players; p++) {
    const id = crowdMembers[Math.floor(rnd() * crowdMembers.length)], m = A.memberById(id);
    const sc = A.chromaticScale(m).map(n => n.sounding), lo = sc[0], hi = sc[Math.floor(sc.length * 0.7)];
    // each player 0.25–0.4 (o.perTone: of L, each note's own level; else scaled with the whole crowd below)
    const tim = TIMBRES[id], trms = tim === 'bell' ? 0.73 : Math.sqrt(tim.reduce((s, v) => s + v * v, 0) / 2);
    const amp = (0.25 + rnd() * 0.15) * (o.perTone ? o.perTone / 0.4 / trms : 1);
    let t = Math.round(rnd() * 0.8 * sr);
    while (t < N) {
      const len = Math.round((o.crowdShort ? 0.15 + rnd() * 0.25 : 0.4 + rnd() * 1.1) * sr), midi = lo + Math.floor(rnd() * (hi - lo + 1));
      note(crowd, t, t + len, midi, TIMBRES[id], amp, !!o.crowdShort);
      crowdOn.push(t);
      t += len + Math.round((o.crowdShort ? 0.08 + rnd() * 0.3 : 0.1 + rnd() * 0.7) * sr);
    }
  }
  /* the target: this student, from o.start s on (the crowd plays alone before that) */
  const target = new Float32Array(N), notes = [], timbre = TIMBRES[o.member];
  const five = group.notes.map(n => A.music.writtenMidi(n) - member.sounds);
  if (o.targetNotes) {
    let t = Math.round(o.start * sr), i = 0;
    while (t < N - sr && i < o.targetNotes) {
      const len = Math.round(o.noteS * sr), midi = five[i % five.length];
      note(target, t, t + len, midi, timbre, 1, false);
      notes.push({from: t / sr, to: (t + len) / sr, pc: ((midi % 12) + 12) % 12, midi});
      t += len + Math.round(o.gapS * sr); i++;
    }
  }
  /* levels: the target's RMS while it plays = L; the crowd scaled to o.crowd × L; noise 0.03 L */
  const L = o.L || 0.05;
  const tOn = notes.length ? rms(target, Math.round(notes[0].from * sr), Math.round(notes[0].to * sr)) : 1;
  const cr = o.perTone ? o.crowd : rms(crowd);    // perTone: the crowd's notes are already in units of L
  const mix = new Float32Array(N);
  for (let i = 0; i < N; i++) mix[i] = target[i] * (L / tOn) + crowd[i] * (o.crowd * L / cr) + (rnd() - 0.5) * 0.1 * L;

  /* the device's ROOM CHECK (optional): the student's level at this mic, as the check would measure it */
  const md = A.store.gameData('mic');
  if (o.check) md.room = {floor: o.crowd * L, own: L, ratio: Math.round(10 / o.crowd) / 10, at: A.store.dayKey(), member: o.member};
  else delete md.room;
  md.classroom = o.classroom; A.store.saveGameData('mic');

  /* run it: the main loop every 40 ms (a 4096-sample window ending now), the attack envelope every 8 ms */
  P._room(null);
  P.pauseListening(true); P.pauseListening(false);
  const held = [], attacks = [], T0 = 1e6;
  if (!crowdSim.hooked) {
    crowdSim.hooked = true;
    P.onHeld((pc, now) => crowdSim.held && crowdSim.held.push({t: (now - T0) / 1000, pc}));
    P.onAttack(a => crowdSim.attacks && crowdSim.attacks.push({t: (a.time - T0) / 1000, pc: a.pc}));
  }
  crowdSim.held = held; crowdSim.attacks = attacks;
  const win = 4096, buf = new Float32Array(win);
  let ew = 256; while (ew < 1.5 * sr / group.minF && ew < 2048) ew *= 2;
  if (o.attacks) P._envFeed(null, 0, 8);
  const floors = [];
  for (let ms = 120; ms * sr / 1000 < N; ms += 8) {
    const end = Math.floor(ms * sr / 1000);
    if (o.attacks && end >= ew) P._envFeed(rms(mix, end - ew, end), T0 + ms);
    if (ms % 40 === 0 && end >= win) {
      buf.set(mix.subarray(end - win, end));
      P._feed(buf, sr, T0 + ms);
      if (ms % 1000 === 0) floors.push(+P.state().floor.toFixed(4));
    }
  }
  const out = {held, attacks, target: notes, players, L, floors, classroom: P.state().classroom, auto: P.state().auto};
  /* the snare (o.onsets): the same room through Arcade.Onsets.analyse, with and without Classroom mode */
  if (o.onsets) out.onsets = A.Onsets.analyse(mix, sr, {gate: 0.7 * P.gate, classroom: o.classroom === 'on'});
  crowdSim.held = crowdSim.attacks = null;
  Object.assign(P.ROOM, keep);
  return out;
}

/* the snare's room: the target = drum hits (a noise burst that rings down) every o.every s from o.start, the crowd =
   other drums' hits + the band's notes; scaled like crowdSim (target hit peak RMS = L, the crowd's hits o.crowd × L) */
function snareSim(o) {
  const A = Arcade, P = A.Pitch, sr = 44100, N = Math.round(o.seconds * sr);
  let seed = o.seed || 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const hit = (buf, a, amp, decay) => { for (let i = 0; i < decay * 5 * sr && a + i < buf.length; i++) buf[a + i] += amp * (rnd() * 2 - 1) * Math.exp(-i / (decay * sr)); };
  const target = new Float32Array(N), crowd = new Float32Array(N), hits = [];
  if (o.targetHits) for (let t = o.start; t < o.seconds - 0.5 && hits.length < o.targetHits; t += o.every) { hit(target, Math.round(t * sr), 1, 0.06); hits.push(t); }
  const drummers = 3 + Math.floor(rnd() * 3);
  for (let d = 0; d < drummers; d++) {
    const amp = o.crowd * (0.85 + rnd() * 0.15);
    for (let t = rnd() * 0.5; t < o.seconds; t += 0.2 + rnd() * 0.6) hit(crowd, Math.round(t * sr), amp, 0.06);
  }
  const L = o.L || 0.1, peak = buf => { let m = 0; for (let i = 0; i + 512 <= buf.length; i += 256) { let s = 0; for (let k = 0; k < 512; k++) s += buf[i + k] * buf[i + k]; m = Math.max(m, Math.sqrt(s / 512)); } return m; };
  // one lone hit of each, to scale by: the target's hit peak = L, a crowd hit = o.crowd × L
  const one = new Float32Array(sr); hit(one, 100, 1, 0.06);
  const k = L / peak(one);
  const mix = new Float32Array(N);
  for (let i = 0; i < N; i++) mix[i] = (target[i] + crowd[i]) * k + (rnd() - 0.5) * 0.02 * L;
  const md = A.store.gameData('mic');
  if (o.check) md.room = {floor: 0.2 * L, own: L, ownOnset: o.ownOnset != null ? o.ownOnset : null, ratio: 5, at: A.store.dayKey(), member: 'snare'};
  else delete md.room;
  md.classroom = o.classroom; A.store.saveGameData('mic');
  const opts = {gate: 0.7 * P.gate, classroom: o.classroom === 'on'};
  if (o.check && o.ownOnset == null) {           // the room check's onset level: the target's own hits, alone
    const solo = new Float32Array(Math.round(3 * sr)); for (let j = 0; j < 4; j++) hit(solo, Math.round((0.3 + j * 0.6) * sr), k, 0.06);
    const lv = A.Onsets.analyse(solo, sr, {gate: opts.gate}).map(x => x.level).sort((a, b) => a - b);
    md.room.ownOnset = lv[lv.length >> 1];
  }
  opts.own = md.room ? md.room.ownOnset : null;
  return {onsets: A.Onsets.analyse(mix, sr, opts), hits, drummers};
}

module.exports = {crowdSim, snareSim};
