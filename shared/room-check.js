/* THE ROOM CHECK (about 8 seconds, per device): how loud THIS student's instrument is at THIS device's microphone,
   compared with the rest of the band room. Classroom mode (shared/pitch.js ROOM, docs/engine/pitch.md) then knows
   how loud "the closest instrument" is: a reading must reach ROOM.ownShare × that level.
     1. "Stay quiet for 3 seconds" (the room can keep playing): the room's level (the median of what the mic hears).
     2. "Play your FIRST note and hold it for 3 seconds" (the member's first-five tonic on a staff in their clef; the
        ring fills only while a note is heard). Snare: "Hit your drum 4 times" (the median hit peak).
     3. The ratio: ≥ ROOM.minRatio "Great! Your instrument is 6× louder than the room. Classroom mode is ready."
        Below it: move the device closer, TRY AGAIN.
   It measures with Pitch.probe(): the normal detector rules, nothing reaches the game (it works from a paused game's
   Settings), nothing is recorded; only the numbers are kept:
     gameData('mic').room = {floor, own, ratio, at: 'YYYY-MM-DD', member, ownOnset (the snare: its hits as
     shared/onsets.js measures them)}   (this device + this instrument; never in
     the Backup Code: storage.js exportAll leaves gameData.mic out)
   A check older than ROOM.staleDays days is STALE: it still works, and the offer below comes back.
   THE OFFER: once a day at most, when a listening game starts (Arcade.requireMic) in a room that was loud in the last
   ROOM.loudMin minutes (Auto's rule, seen by pitch.js on any page today) and this instrument has no check, or a stale
   one: a small card "Loud room! …" with CHECK NOW / Not now. Never forced; the game starts after either.
     Arcade.RoomCheck.open({onClose})   the panel (asks for the microphone first, from the tap)
     Arcade.RoomCheck.offer(fn) -> bool  shows the card when it's due (true: it calls fn when it closes)
     Arcade.RoomCheck.saved() / stale(c) / summary() / state()   the saved check, for Settings, Tune Up, ?teacher, tests */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const P = () => A.Pitch;
  const R = () => A.Pitch.ROOM;
  const data = () => A.store.gameData('mic');
  const peek = () => (A.store.peekGameData ? A.store.peekGameData('mic') : null) || {};
  const save = () => A.store.saveGameData('mic');
  const today = () => A.store.dayKey();
  const median = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  /** the saved check for the instrument being played (null = none, or another instrument's) */
  function saved() {
    const c = peek().room, me = A.store.player;
    return c && c.own > 0 && (!c.member || c.member === me) ? c : null;
  }
  const daysOld = c => Math.round((new Date(today() + 'T12:00') - new Date(c.at + 'T12:00')) / 864e5);
  const stale = c => !c || !c.at || daysOld(c) >= R().staleDays;
  const dateName = at => new Date(at + 'T12:00').toLocaleDateString([], {month: 'short', day: 'numeric'});
  /** one line for Settings and Tune Up: "6× louder than the room · Oct 3" */
  function summary() {
    const c = saved();
    if (!c) return 'Not checked yet on this device.';
    return `Last check: ${c.ratio}× louder than the room · ${dateName(c.at)}${stale(c) ? ' (over a week ago)' : ''}`;
  }

  /* a loud room seen on any page today is remembered for ROOM.loudMin minutes (the offer reads it at the next start) */
  let loudSaved = 0;
  function watchLoud() {
    if (!P() || !P().onFrame || watchLoud.on) return;
    watchLoud.on = true;
    P().onFrame(() => {
      const st = P().state && P().state();
      if (!st || !st.loud || Date.now() - loudSaved < 60000) return;
      loudSaved = Date.now(); data().loudAt = loudSaved; save();
    });
  }
  /** is the once-a-day offer due right now? */
  function due() {
    const Pi = P(); if (!Pi || !Pi.classroomSetting || !A.store) return false;
    if (Pi.classroomSetting().mode === 'off') return false;                     // Classroom mode can't be used: no point
    const d = peek(), loud = (Pi.state && Pi.state().loud) || (d.loudAt && Date.now() - d.loudAt < R().loudMin * 60000);
    return !!loud && d.offered !== today() && stale(saved());
  }

  /* ---------- the offer card ---------- */
  let skipOffer = false;
  function offer(fn) {
    if (skipOffer || S || !due() || document.querySelector('.rc-ov')) return false;
    data().offered = today(); save();
    const ov = document.createElement('div');
    ov.className = 'overlay rc-ov rc-offer-ov';
    ov.innerHTML = `<div class="panel rc-panel rc-offer" role="dialog" aria-modal="true" aria-labelledby="rcOfT">
      <h2 class="ui-title" id="rcOfT">Loud room!</h2>
      <p class="rc-big">A quick room check helps the game hear YOU.</p>
      <p class="ui-howto">It takes about 8 seconds.</p>
      <div class="acts"><button type="button" class="btn btn-primary" data-act="check">Check now</button>
      <button type="button" class="btn btn-secondary" data-act="later">Not now</button></div></div>`;
    document.body.appendChild(ov);
    const close = () => { A.UI.layer.close(ov, {restore: false}); ov.remove(); };
    A.UI.layer.open(ov, {trap: true, onEsc: () => { close(); fn(); }, focus: '[data-act=check]'});
    ov.querySelector('[data-act=later]').addEventListener('click', () => { close(); fn(); });
    ov.querySelector('[data-act=check]').addEventListener('click', () => { close(); open({onClose: fn}); });
    return true;
  }

  /* ---------- the panel ---------- */
  let S = null;
  const RING = 2 * Math.PI * 34;
  function open(o = {}) {
    if (S || !P()) return;
    skipOffer = true;                               // (the microphone first, from this tap: its own screen when needed)
    try { A.requireMic(() => { if (!S) build(o); }); } finally { skipOffer = false; }
  }
  function build({onClose} = {}) {
    const inst = P().instrument() || (A.currentInstrument && A.currentInstrument());
    const ov = document.createElement('div');
    ov.className = 'overlay rc-ov';
    ov.innerHTML = `<div class="panel rc-panel" role="dialog" aria-modal="true" aria-labelledby="rcT">
      <h2 class="ui-title" id="rcT">Room check</h2>
      <div class="rc-step" aria-live="polite"></div>
      <div class="rc-gauge"><svg class="rc-ring" viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="34" class="rc-track"/>
        <circle cx="40" cy="40" r="34" class="rc-fill" stroke-dasharray="${RING.toFixed(1)}" stroke-dashoffset="${RING.toFixed(1)}"/></svg>
        <div class="stage rc-staff"></div></div>
      <span class="ui-label">Mic level</span><div class="ui-meter rc-meter" aria-hidden="true"><i></i></div>
      <p class="ui-howto rc-privacy">The microphone only measures how loud things are. Nothing is recorded or saved except those numbers.</p>
      <div class="acts"></div></div>`;
    document.body.appendChild(ov);
    S = {ov, inst, timer: 0, onClose};
    A.UI.layer.open(ov, {trap: true, onEsc: () => close()});
    begin();
  }
  function close() {
    if (!S) return;
    const s = S; S = null;
    clearInterval(s.timer);
    A.UI.layer.close(s.ov); s.ov.remove();
    if (s.onClose) s.onClose();
  }
  function say(big, small, buttons) {
    const st = S.ov.querySelector('.rc-step');
    st.innerHTML = `<p class="rc-big">${big}</p>` + (small ? `<p class="ui-howto">${small}</p>` : '');
    const acts = S.ov.querySelector('.acts'); acts.innerHTML = '';
    (buttons || []).forEach(([label, kind, fn]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-' + kind; b.textContent = label;
      b.addEventListener('click', fn); acts.appendChild(b);
    });
    const f = acts.querySelector('.btn-primary') || acts.querySelector('button'); if (f) f.focus({preventScroll: true});
  }
  function ring(frac) { S.ov.querySelector('.rc-fill').setAttribute('stroke-dashoffset', (RING * (1 - Math.max(0, Math.min(1, frac)))).toFixed(1)); }
  function meter(level) { const i = S.ov.querySelector('.rc-meter i'); i.style.width = P().levelPct(level) + '%'; }
  const pitched = () => S.inst && S.inst.pitched !== false;
  const onTap = o => { if (S && S.phase === 'hits') S.onsets.push(o.level); };

  function begin() {
    const cancel = ['Cancel', 'secondary', close];
    S.phase = 'quiet'; S.quiet = []; S.own = []; S.hits = []; S.t0 = performance.now(); S.heard = 0; S.last = null;
    S.ov.querySelector('.rc-staff').innerHTML = '';
    ring(0);
    say('Stay quiet for 3 seconds.', 'The room can keep playing.', [cancel]);
    clearInterval(S.timer);
    S.timer = setInterval(frame, 40);
  }
  function frame() {
    if (!S) return;
    const now = performance.now(), {level, reading} = P().probe(), r = R();
    meter(level);
    if (S.phase === 'quiet') {
      S.quiet.push(level);
      ring((now - S.t0) / (r.quietS * 1000));
      if (now - S.t0 >= r.quietS * 1000) toPlay();
    } else if (S.phase === 'play') {
      if (reading) { S.own.push(level); S.heard += 40; }
      ring(S.heard / (r.playS * 1000));
      if (now - S.t0 > 15000 && S.heard < 400) S.ov.querySelector('.rc-hint').textContent = 'Can\'t hear your note yet. Play a little louder, or hold the device closer.';
      if (S.heard >= r.playS * 1000) result();
    } else if (S.phase === 'hits') {
      // a hit: the level jumps above the room (2 × its level, and the sensitivity gate) after being lower; its peak is
      // the loudest level in the next 120 ms
      const room = Math.max(P().gate, 2 * S.floor), h = S.hit;
      if (h) { h.peak = Math.max(h.peak, level); if (now - h.t > 120) { S.hits.push(h.peak); S.hit = null; ring(S.hits.length / r.hits); } }
      else if (level > room && (S.last == null || S.last <= room) && now - (S.lastHit || 0) > 150) { S.hit = {t: now, peak: level}; S.lastHit = now; }
      S.last = level;
      if (S.hits.length >= r.hits) result();
    }
  }
  function toPlay() {
    S.floor = median(S.quiet); S.t0 = performance.now(); ring(0);
    const cancel = ['Cancel', 'secondary', close];
    if (pitched()) {
      S.phase = 'play';
      const n = S.inst.notes[0];
      S.ov.querySelector('.rc-staff').innerHTML = A.staffSVG(S.inst.clef, [{n, x: 150, caption: A.music.noteLabel(n)}], {label: 'Your first note: ' + A.music.noteLabel(n)});
      say('Play your FIRST note and hold it for 3 seconds.', '<span class="rc-hint">The ring fills while the game hears your note.</span>', [cancel]);
    } else {
      S.phase = 'hits'; S.hit = null; S.last = null; S.onsets = [];
      if (A.Onsets && A.Onsets.tap) A.Onsets.tap(onTap);         // the onset detector's own units too (Rhythm Dojo, Showtime's snare)
      say('Hit your drum 4 times, normal loudness.', '<span class="rc-hint">The ring fills with each hit.</span>', [cancel]);
    }
  }
  function result() {
    clearInterval(S.timer); S.phase = 'done';
    const r = R(), own = pitched() ? median(S.own) : median(S.hits), floor = Math.max(S.floor, 1e-4);
    const ratio = Math.round(own / floor * 10) / 10;
    const rec = {floor: +floor.toFixed(5), own: +own.toFixed(5), ratio, at: today(), member: A.store.player};
    if (S.onsets && S.onsets.length >= 2) { const top = S.onsets.slice().sort((a, b) => b - a).slice(0, r.hits); rec.ownOnset = +median(top).toFixed(5); }
    data().room = rec;
    save();
    S.ratio = ratio;
    ring(1);
    S.ov.querySelector('.rc-staff').innerHTML = '';
    if (ratio >= r.minRatio) {
      say(`Great! Your instrument is ${Math.round(ratio)}× louder than the room. Classroom mode is ready.`, '', [['Done', 'primary', close]]);
    } else {
      say('The room is almost as loud as you. Move the device closer to your instrument (about an arm\'s length; for brass, point the bell a little to the side) and try again.', '',
        [['Try again', 'primary', begin], ['Done', 'secondary', close]]);
    }
    S.ov.querySelector('.rc-panel').dataset.result = ratio >= r.minRatio ? 'ready' : 'closer';
  }

  /** tests */
  const state = () => ({open: !!S, phase: S ? S.phase || null : null, ratio: S ? S.ratio : null, saved: saved(), stale: stale(saved()), due: due(),
    offerShowing: !!document.querySelector('.rc-offer-ov')});

  A.RoomCheck = {open, close, offer, due, saved, stale, summary, state};
  if (P()) document.addEventListener('DOMContentLoaded', watchLoud);
  if (P() && document.readyState !== 'loading') watchLoud();
})(window.Arcade);
