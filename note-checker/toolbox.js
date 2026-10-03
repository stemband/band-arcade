/* TUNE UP: THE TOOLBOX. One page, three tools on tabs: NOTE CHECKER (checker.js) · TUNER (tuner.js, the hot-air
   balloon) · METRONOME (metronome.js, the avatar that bops on the beat + the TEMPO LADDER).
   Loaded BEFORE the tools: it checks the saved instrument, mounts the top bar and gives each tool
       Arcade.TuneUp = {inst, member, tab, data(), save(), register(id, {listens, enter(), leave()}), go(id)}
   The tools are tools: no stars, no setLevel, no leaderboard events.
   SWITCHING TABS stops the other tool's sound and microphone use: leave() of the old tool, then
     - a LISTENING tool (the Note Checker; the Tuner for pitched instruments): Arcade.requireMic → listening resumes
       (Pitch.pauseListening(false), the tab tap is the gesture iPads need),
     - the METRONOME (and the Snare Drum's Tuner tab): the microphone is turned OFF (Pitch.stop()) and never opened.
   The last tab is remembered (gameData('tuneup').tab); ?tool=checker|tuner|metronome opens one directly.
   Keys: ←/→ (Home/End) move between the tabs. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const {$} = A;
  const inst = A.requireInstrument('note-checker');
  const T = A.TuneUp = {inst, member: null, tab: null, tools: {}};
  if (!inst) return;

  // "Back to <game>" when opened from a game (the game links here with #<game-id>)
  const fromGame = A.GAMES.find(g => g.id === location.hash.slice(1) && g.id !== 'note-checker');
  A.mountTopbar(inst, fromGame
    ? `<a class="btn btn-secondary btn-small" href="${A.linkTo('../' + fromGame.id + '/index.html')}">Back to ${fromGame.name}</a>` : '', 'note-checker');
  T.member = A.currentMember();
  A.Pitch.setInstrument(inst);

  const ORDER = ['checker', 'tuner', 'metronome'];
  const TAB = {checker: 'tabChecker', tuner: 'tabTuner', metronome: 'tabMetro'};
  const PANEL = {checker: 'toolChecker', tuner: 'toolTuner', metronome: 'toolMetro'};
  T.data = () => A.store.gameData('tuneup');
  T.save = () => A.store.saveGameData('tuneup');
  T.register = (id, tool) => { T.tools[id] = tool; };
  const listens = id => { const t = T.tools[id]; return !!t && (typeof t.listens === 'function' ? t.listens() : !!t.listens); };
  T.listens = listens;

  /** the microphone for the tab now showing: on (asked for from this tap) or off for good */
  function micFor(id) {
    const P = A.Pitch;
    if (listens(id)) {
      const on = () => {
        if (T.tab !== id) return;                       // the student moved on while the mic was starting
        $('startRow').hidden = true;
        P.pauseListening(false);
        if (A.Sfx.sync) A.Sfx.sync();
        const t = T.tools[id]; if (t && t.micOn) t.micOn();
      };
      $('startRow').hidden = P.active || P.demoReady;
      A.requireMic(on);
    } else {
      $('startRow').hidden = true;
      if (P.active) P.stop(); else P.pauseListening(true);   // the metronome never uses the microphone
      if (A.Sfx.sync) A.Sfx.sync();
    }
  }

  T.go = function (id, {focus = false, first = false} = {}) {
    if (!ORDER.includes(id)) id = 'checker';
    if (id === T.tab && !first) return;
    const old = T.tab;
    if (old && T.tools[old] && T.tools[old].leave) T.tools[old].leave();
    T.tab = id;
    ORDER.forEach(k => {
      const b = $(TAB[k]), on = k === id;
      b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; b.classList.toggle('on', on);
      $(PANEL[k]).hidden = !on;
    });
    document.body.dataset.tool = id;
    $('sensBox').hidden = !listens(id);
    T.data().tab = id; T.save();
    if (focus) $(TAB[id]).focus();
    if (T.tools[id] && T.tools[id].enter) T.tools[id].enter();
    micFor(id);
    if (!first && !listens(id) && A.Sfx.event) A.Sfx.event('ui-toggle');   // (a sound on a listening tab would only mute the mic)
  };

  const tabs = $('tuTabs');
  tabs.addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) T.go(b.dataset.tool); });
  tabs.addEventListener('keydown', e => {
    const i = ORDER.indexOf(T.tab);
    const to = e.key === 'ArrowRight' ? ORDER[(i + 1) % 3] : e.key === 'ArrowLeft' ? ORDER[(i + 2) % 3]
      : e.key === 'Home' ? ORDER[0] : e.key === 'End' ? ORDER[2] : null;
    if (!to) return;
    e.preventDefault(); e.stopPropagation();
    T.go(to, {focus: true});
  });
  $('startBtn').addEventListener('click', () => micFor(T.tab));

  /* the mic sensitivity block (the Note Checker and the Tuner): the same setting as the shared Settings panel, + the
     Classroom mode chip and the ROOM CHECK button */
  $('sens').value = A.store.sens;
  $('sens').addEventListener('input', e => { A.store.setSens(+e.target.value); A.Pitch.setSensitivity(+e.target.value); });
  A.Pitch.onFrame((r, level) => {
    if ($('sensBox').hidden) return;
    const sl = $('sens'); if (document.activeElement !== sl && +sl.value !== A.store.sens) sl.value = A.store.sens;
    const fill = $('lvlFill');
    fill.style.width = A.Pitch.levelPct(level) + '%';
    fill.classList.toggle('over', level >= A.Pitch.gate);
    $('lvlGate').style.left = A.Pitch.levelPct(A.Pitch.gate) + '%';
    $('roomChip').hidden = !A.Pitch.classroom();
  });
  /* CLASSROOM MODE's chip (above) and THE ROOM CHECK (shared/room-check.js): the same as the Settings panel's */
  const roomLast = () => { $('roomLast').textContent = A.RoomCheck.summary(); };
  $('roomBtn').addEventListener('click', () => A.RoomCheck.open({onClose: roomLast}));
  document.addEventListener('DOMContentLoaded', roomLast);

  /* the first tab: ?tool=, else the one used last, else the Note Checker */
  document.addEventListener('DOMContentLoaded', () => {
    const want = (A.params && A.params.get('tool')) || '';
    const alias = {tuner: 'tuner', metronome: 'metronome', metro: 'metronome', checker: 'checker', 'note-checker': 'checker'};
    T.go(alias[want] || T.data().tab || 'checker', {first: true});
  });

  /** A NEW ITEM (the Golden Tuning Fork, the Ladder Climber plate: avatar-parts.js `unlock: {tool}`): a small panel with
      the UNLOCKED! card (Skins.announce). Called by the tools only between notes / after the click has stopped, never
      in the middle of a hold or on a beat. Nothing new = nothing shows. */
  T.reward = function (title, text) {
    if (!A.Skins || !A.Skins.announce) return [];
    const ov = document.createElement('div');
    ov.className = 'overlay tu-reward-ov';
    ov.innerHTML = `<div class="panel tu-reward" role="dialog" aria-modal="true" aria-labelledby="tuRwT"><h2 class="ui-title" id="tuRwT"></h2>` +
      `<p class="ui-howto"></p><div class="acts"><button type="button" class="btn btn-secondary" data-close>OK</button></div></div>`;
    ov.querySelector('h2').textContent = title; ov.querySelector('p').textContent = text;
    document.body.appendChild(ov);
    const got = A.Skins.announce(ov.querySelector('.panel'));
    if (!got.length) { ov.remove(); return got; }
    const close = () => { if (A.UI && A.UI.layer) A.UI.layer.close(ov); ov.remove(); };
    if (A.UI && A.UI.layer) A.UI.layer.open(ov, {trap: true, onEsc: close});
    ov.querySelector('[data-close]').addEventListener('click', close);
    ov.querySelector('.sk-u-equip, [data-close]').focus();
    return got;
  };

  /** tests */
  T.state = () => ({tab: T.tab, listening: A.Pitch.listening(), micActive: A.Pitch.active, paused: A.Pitch.paused, a4: A.Pitch.a4});
})(window.Arcade);
