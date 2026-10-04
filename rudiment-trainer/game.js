/* THE RUDIMENT TRAINER: the 40 PAS International Drum Rudiments for snare and bells players. A PRACTICE TOOL: no
   stars, no microphone, no judging. Full doc: docs/games/rudiment-trainer.md.
     THE PICKER (#hub, the level-select pattern: shared/level-select.js with heading "Select your rudiment"): family
       tabs (All · Roll · Diddle · Flam · Drag, each "3 / 15 Diamond"), the 40 rudiments as cards in PAS order (number,
       name, a small staff with its sticking, five tier pips + the Open–Close–Open mark, a DIAMOND badge when all five
       tempos are checked off). Remembers the tab and the last rudiment. ?r=<id> opens a rudiment's page directly.
     A RUDIMENT (#page): the staff large with its sticking (shared/rhythm-staff.js; rows at phone width), COUNTING
       off/on, SLASHES ⇄ WRITTEN OUT (only with / rolls), CLICK off/on, the five tempos (rudiments.js TIERS + its
       tempo set) + OPEN–CLOSE–OPEN, ▶ PLAY / ■ STOP (shared/rudiment-player.js: a count-off, then it loops; the
       strokes light as they sound; a new tempo lands on the next repetition; Open–Close–Open ends by itself).
     THE CHECK-OFF: "✓ I can play this at Gold" appears for the selected tempo only after RULES.checkReps full
       repetitions at it in this visit (Open–Close–Open: one whole run). Saved as gameData(GAME_ID).done[id][tier] =
       'YYYY-MM-DD'; a checked tempo offers UNCHECK. Never stars, tokens or the leaderboard.
     TODAY'S PRACTICE: gameData(GAME_ID).playS['YYYY-MM-DD'] = seconds really played (the player running, the page
       visible, the audio running), saved every RULES.saveEveryS and at stop, 30 days kept; store.noteFinished(GAME_ID)
       once a day at Rudiments.PRACTICE_S seconds or a check-off.
   Arcade.RudimentTrainer.state() / open(id) / play() / stop() / tier(i) for tests. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const GAME_ID = 'rudiment-trainer';
  const $ = id => document.getElementById(id), R = A.Rudiments, C = A.Counting, RS = A.RhythmStaff, RP = A.RudimentPlayer;
  const inst = A.requireInstrument(GAME_ID);
  if (!inst) return;
  A.mountTopbar(inst, '', GAME_ID);

  /* ===== THE RULES (Mr. Graham edits these) ===== */
  const RULES = {
    checkReps: 4,           // full repetitions at a tempo, in this visit, before its check-off button appears
    saveEveryS: 5,          // the practice-time log is saved this often while playing (and at every stop)
    keepDays: 30,           // days kept in the practice-time log
    musicFadeMs: 500,       // PLAY waits for the menu music's fade-out (Sfx.gameMenuMusic: 0.5 s) before the count-off, when it was playing
  };
  /* ============================================== */

  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const gd = () => A.store.gameData(GAME_ID);
  const save = () => A.store.saveGameData(GAME_ID);
  const day = () => A.store.dayKey();
  const doneOf = id => ((gd().done || {})[id]) || {};
  const tierIds = () => R.TIERS.map(t => t.id);
  const isDiamond = id => tierIds().every(t => doneOf(id)[t]);
  const params = new URLSearchParams(location.search);
  const S = {tab: gd().tab || 'all', cur: null, tier: 0, view: gd().view === 'written' ? 'written' : 'slash', counting: !!gd().counting,
    click: !!gd().click, player: null, playing: false, reps: {}, ocoRuns: {}, lastRep: -1, lastBpm: null, lit: null, acc: 0, lastNow: null, unsaved: 0};
  $('credit').textContent = R.CREDIT;

  /* ================= THE PICKER ================= */
  const TABS = [{id: 'all', short: 'All'}].concat(R.FAMILIES);
  function tabCount(t) {
    const list = R.LIST.filter(r => t.id === 'all' || r.fam === t.id);
    return `${list.filter(r => isDiamond(r.id)).length} / ${list.length} Diamond`;
  }
  function drawTabs() {
    $('tabs').innerHTML = TABS.map(t => `<button type="button" role="tab" class="rt-tab" data-tab="${t.id}" aria-selected="${S.tab === t.id}"` +
      ` tabindex="${S.tab === t.id ? 0 : -1}"><b>${esc(t.short)}</b><small>${tabCount(t)}</small></button>`).join('');
  }
  $('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab, true); });
  $('tabs').addEventListener('keydown', e => {
    const k = TABS.findIndex(t => t.id === S.tab), d = {ArrowRight: 1, ArrowLeft: -1, Home: -k, End: TABS.length - 1 - k}[e.key];
    if (d == null) return;
    e.preventDefault(); const n = TABS[(k + d + TABS.length) % TABS.length]; setTab(n.id, true);
    $('tabs').querySelector(`[data-tab="${n.id}"]`).focus();
  });
  function setTab(id, byStudent) {
    if (!TABS.some(t => t.id === id)) id = 'all';
    S.tab = id;
    if (byStudent) { gd().tab = id; save(); if (A.Sfx) A.Sfx.event('ui-toggle'); }
    drawTabs();
    $('grid').querySelectorAll('.rt-card').forEach(c => { c.hidden = !(id === 'all' || c.dataset.fam === id); });
  }
  const pips = id => {
    const d = doneOf(id);
    return R.TIERS.map(t => `<i class="rt-pip${d[t.id] ? ' on' : ''}" style="--tier:var(--${t.color})" title="${t.name}${d[t.id] ? ': checked' : ''}"></i>`).join('') +
      `<i class="rt-pip rt-oco${d[R.OCO.id] ? ' on' : ''}" title="${R.OCO.name}${d[R.OCO.id] ? ': checked' : ''}"></i>`;
  };
  const cardSay = r => { const d = doneOf(r.id), n = R.TIERS.filter(t => d[t.id]).length;
    return `Number ${r.n}, ${r.name}. ${n} of 5 tempos checked${isDiamond(r.id) ? ', Diamond' : ''}.`; };
  function thumb(r) {
    return RS.engrave(C.parse(r.text, r.time), {sticking: true, counting: false, rolls: S.view, showTime: true, id: 'th' + r.n, label: r.name + ': sticking'}).svg;
  }
  function drawGrid() {
    $('grid').innerHTML = R.LIST.map((r, i) => `<button type="button" class="rt-card" data-i="${i}" data-id="${r.id}" data-fam="${r.fam}" aria-label="${esc(cardSay(r))}">` +
      `<span class="rt-num n">#${r.n}</span><b class="rt-name">${esc(r.name)}</b>` +
      `<span class="rt-thumb" aria-hidden="true">${thumb(r)}</span>` +
      `<span class="rt-pips" aria-hidden="true">${pips(r.id)}</span>` +
      (isDiamond(r.id) ? `<span class="rt-diamond" aria-hidden="true">◆ Diamond</span>` : '') + `</button>`).join('');
    $('grid').querySelectorAll('.rt-card').forEach(c => c.addEventListener('click', () => open(c.dataset.id)));
    setTab(S.tab);
  }
  function refreshCards() {
    $('grid').querySelectorAll('.rt-card').forEach(c => {
      const r = R.byId(c.dataset.id);
      c.querySelector('.rt-pips').innerHTML = pips(r.id);
      c.setAttribute('aria-label', cardSay(r));
      const dia = c.querySelector('.rt-diamond');
      if (isDiamond(r.id) && !dia) c.insertAdjacentHTML('beforeend', '<span class="rt-diamond" aria-hidden="true">◆ Diamond</span>');
      if (!isDiamond(r.id) && dia) dia.remove();
    });
    drawTabs();
  }
  function showHub() {
    stop();
    $('page').hidden = true; $('hub').hidden = false;
    pause.setActive(false);
    S.cur = null;
    refreshCards();
    // no stars here: the lobby's practice card must not pre-select the first card (level-select.js reads this flag)
    try { sessionStorage.removeItem('bandarcade.practice-pick'); } catch (e) { /* private mode */ }
    A.LevelSelect.show({screen: $('hub'), grid: $('grid'), cards: $('grid').querySelectorAll('.rt-card'), gameId: GAME_ID, voice: false,
      heading: 'Select your rudiment', need: 'Tap a rudiment below', label: i => `#${R.LIST[i].n} ${R.LIST[i].name}`});
    A.Sfx.gameMenuMusic(GAME_ID);
  }

  /* ================= ONE RUDIMENT ================= */
  const bpmsOf = r => R.bpms(r);
  const tierName = i => i === 'oco' ? R.OCO.name : R.TIERS[i].name;
  const tierId = i => i === 'oco' ? R.OCO.id : R.TIERS[i].id;
  function open(id) {
    const r = R.byId(id);
    if (!r) return;
    stop();
    const i = R.LIST.indexOf(r);
    A.LevelSelect.played(i);                                       // remembered on the picker + the daily 'play'
    S.cur = r; S.lastRep = -1; S.lastBpm = null;
    const g = gd(); g.last = r.id;
    const tiers = g.tierOf || {}, t = tiers[r.id];
    S.tier = t === 'oco' ? 'oco' : Number.isInteger(t) && t >= 0 && t < 5 ? t : 0;
    save();
    $('hub').hidden = true; $('page').hidden = false;
    $('pgTitle').textContent = `#${r.n} ${r.name}`;
    $('pgFam').textContent = (R.FAMILIES.find(f => f.id === r.fam) || {}).name || '';
    $('viewOpt').hidden = !R.hasRolls(r);
    segs();
    drawStaff(); drawTiers(); drawCheck(); showBpm();
    pause.setActive(true);
    A.Sfx.gameMenuMusic(GAME_ID);
    scrollTo(0, 0);
    $('playBtn').focus({preventScroll: true});
  }
  /** the staff, as large as fits: one row, or a row per measure (phones), each scaled to the stage's width */
  function drawStaff() {
    const r = S.cur, p = C.parse(r.text, r.time), box = $('staff');
    const avail = Math.max(240, box.clientWidth - 16);
    const o = {sticking: true, counting: S.counting, rolls: S.view, label: `${r.name}: notes and sticking`};
    let rows = [[0, p.measures]];
    const whole = RS.engrave(p, Object.assign({id: 'pg0'}, o));
    if (whole.w > avail * 1.25 && p.measures > 1) rows = RS.rows(p, 1);
    const E = rows.map(([from, to], k) => RS.engrave(p, Object.assign({}, o, {from, to, id: 'pg' + k, showTime: from === 0})));
    box.innerHTML = E.map(e => `<div class="rt-row">${e.svg}</div>`).join('');
    RS.refine(box);
    S.lit = RP.light(box, {strokes: [].concat(...E.map(e => e.strokes))});
  }
  function segs() {
    const set = (id, attr, val) => $(id).querySelectorAll(`[data-${attr}]`).forEach(b => b.setAttribute('aria-pressed', String(b.dataset[attr] === val)));
    set('viewSeg', 'view', S.view); set('countSeg', 'count', S.counting ? 'on' : 'off'); set('clickSeg', 'click', S.click ? 'on' : 'off');
  }
  $('viewSeg').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (!b) return; S.view = b.dataset.view; gd().view = S.view; save(); segs(); drawStaff(); drawGrid(); });
  $('countSeg').addEventListener('click', e => { const b = e.target.closest('[data-count]'); if (!b) return; S.counting = b.dataset.count === 'on'; gd().counting = S.counting; save(); segs(); drawStaff(); });
  $('clickSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-click]'); if (!b) return;
    S.click = b.dataset.click === 'on'; gd().click = S.click; save(); segs();
    if (S.player) S.player.setClick(S.click);                      // from the next repetition
  });

  function drawTiers() {
    const b = bpmsOf(S.cur), d = doneOf(S.cur.id);
    $('tiers').innerHTML = R.TIERS.map((t, i) => `<button type="button" class="rt-tier" data-tier="${i}" aria-pressed="${S.tier === i}" style="--tier:var(--${t.color})">` +
      `<b>${t.name}</b><small>${b[i]} BPM</small>${d[t.id] ? '<span class="rt-tick" aria-label="checked off">✓</span>' : ''}</button>`).join('') +
      `<button type="button" class="rt-tier rt-tier-oco" data-tier="oco" aria-pressed="${S.tier === 'oco'}"><b>${R.OCO.name}</b>` +
      `<small>${b[0]} → ${b[4]} → ${b[0]}</small>${d[R.OCO.id] ? '<span class="rt-tick" aria-label="checked off">✓</span>' : ''}</button>`;
  }
  $('tiers').addEventListener('click', e => {
    const b = e.target.closest('[data-tier]'); if (!b) return;
    setTier(b.dataset.tier === 'oco' ? 'oco' : +b.dataset.tier, true);
  });
  function setTier(t, byStudent) {
    const was = S.tier;
    S.tier = t;
    const g = gd(); (g.tierOf || (g.tierOf = {}))[S.cur.id] = t; save();
    if (byStudent && A.Sfx) A.Sfx.event('ui-toggle');
    drawTiers(); drawCheck(); showBpm();
    if (S.playing) {
      if (t === 'oco' || was === 'oco') { stop(); play(); }        // Open–Close–Open is its own run
      else S.player.setBpm(bpmsOf(S.cur)[t]);                      // the player: from the next repetition
    }
  }
  function showBpm(now) {
    const b = bpmsOf(S.cur), q = S.cur.time === '6/8' ? ' (dotted quarters)' : '';
    $('bpmNow').textContent = (now != null ? `${now} BPM` : S.tier === 'oco' ? `${b[0]} → ${b[4]} → ${b[0]} BPM` : `${b[S.tier]} BPM`) + q;
  }

  /* ---------- play along ---------- */
  function play() {
    if (S.playing || !S.cur) return;
    const r = S.cur, b = bpmsOf(r), oco = S.tier === 'oco';
    S.lastRep = -1; S.lastBpm = null;
    const pl = RP.create({parsed: C.parse(r.text, r.time), bpm: oco ? b[0] : b[S.tier], reps: oco ? undefined : Infinity, click: S.click,
      ramp: oco ? {from: b[0], to: b[4], upS: R.OCO.upS, holdS: R.OCO.holdS, downS: R.OCO.downS} : null,
      onStroke: e => { if (S.lit) S.lit(e); heard(e); },
      onBeat: e => heard(e),
      onEnd: ({stopped}) => ended(pl, stopped)});
    S.player = pl; S.playing = true; S.lastNow = null;
    drawPlay();
    // the player and the menu music never overlap: the music fades out first, then the count-off starts
    const ms = A.Sfx.musicState ? A.Sfx.musicState().music || {} : {};
    const fading = !!ms.playing;
    A.Sfx.gameMenuMusic(GAME_ID, false);
    const go = () => { if (S.player === pl) pl.start().then(ok => { if (!ok && S.player === pl) ended(pl, true); }); };
    if (fading) setTimeout(go, RULES.musicFadeMs); else go();
    tick();
  }
  /** a repetition is complete when the next one's first beat (or stroke) sounds: counted at the tempo it played */
  function heard(e) {
    if (S.tier !== 'oco' && e.rep != null && e.rep >= 0 && e.rep !== S.lastRep) {
      if (S.lastRep >= 0 && S.lastBpm != null) countRep(S.lastBpm);
      S.lastRep = e.rep; S.lastBpm = e.bpm;
    }
    if (S.tier === 'oco' && S.player) showBpm(S.player.state().bpmNow);
  }
  function countRep(bpm) {
    const t = bpmsOf(S.cur).indexOf(bpm);
    if (t < 0) return;
    const k = S.cur.id + '|' + R.TIERS[t].id;
    S.reps[k] = (S.reps[k] || 0) + 1;
    if (t === S.tier) drawCheck();
  }
  function ended(pl, stopped) {
    if (S.player !== pl) return;
    if (!stopped && S.tier === 'oco' && S.cur) { S.ocoRuns[S.cur.id] = (S.ocoRuns[S.cur.id] || 0) + 1; }
    S.player = null; S.playing = false;
    flush();
    if (S.lit) S.lit.clear();
    drawPlay(); drawCheck(); if (S.cur) showBpm();
    if (S.cur || !$('hub').hidden) A.Sfx.gameMenuMusic(GAME_ID);
  }
  function stop() { if (S.player) S.player.stop(); }
  function drawPlay() {
    const b = $('playBtn');
    b.setAttribute('aria-pressed', String(S.playing));
    b.textContent = S.playing ? '■ Stop' : '▶ Play';
    $('page').classList.toggle('rt-playing', S.playing);
  }
  $('playBtn').addEventListener('click', () => (S.playing ? stop() : play()));
  $('backBtn').addEventListener('click', () => { A.Sfx.event('ui-back'); showHub(); });

  /* ---------- the check-off ---------- */
  const repsAt = t => S.reps[S.cur.id + '|' + R.TIERS[t].id] || 0;
  const canCheck = () => S.tier === 'oco' ? (S.ocoRuns[S.cur.id] || 0) >= 1 : repsAt(S.tier) >= RULES.checkReps;
  function drawCheck() {
    if (!S.cur) return;
    const name = tierName(S.tier), when = doneOf(S.cur.id)[tierId(S.tier)], el = $('check');
    if (when) {
      el.innerHTML = `<p class="rt-done">✓ You can play this at ${esc(name)}! <small>Checked ${esc(when)}</small></p>` +
        `<button type="button" class="btn btn-secondary btn-small" id="uncheckBtn">Uncheck</button>`;
      $('uncheckBtn').addEventListener('click', uncheck);
    } else if (canCheck()) {
      el.innerHTML = `<button type="button" class="btn btn-secondary rt-checkbtn" id="checkBtn" style="--tier:var(--${S.tier === 'oco' ? 'cyan' : R.TIERS[S.tier].color})">✓ I can play this at ${esc(name)}</button>`;
      $('checkBtn').addEventListener('click', check);
    } else {
      const left = S.tier === 'oco' ? 'Play along all the way through Open–Close–Open to check it off.'
        : `Play along ${RULES.checkReps} times at ${name} to check it off (${Math.min(repsAt(S.tier), RULES.checkReps)} of ${RULES.checkReps}).`;
      el.innerHTML = `<p class="rt-hint">${esc(left)}</p>`;
    }
  }
  function check() {
    const g = gd(), d = (g.done || (g.done = {}));
    (d[S.cur.id] || (d[S.cur.id] = {}))[tierId(S.tier)] = day();
    save();
    A.store.noteFinished(GAME_ID);                                 // Today's Practice: a tempo checked off today
    if (A.Sfx && !(A.Pitch && A.Pitch.listening && A.Pitch.listening())) A.Sfx.event('star-earned');
    drawTiers(); drawCheck(); refreshCards();
    const b = $('uncheckBtn'); if (b) b.focus({preventScroll: true});
  }
  function uncheck() {
    const d = (gd().done || {})[S.cur.id];
    if (d) { delete d[tierId(S.tier)]; if (!Object.keys(d).length) delete gd().done[S.cur.id]; save(); }
    drawTiers(); drawCheck(); refreshCards();
  }

  /* ---------- TODAY'S PRACTICE: the seconds really played today (the player's own clock) ---------- */
  let tickT = 0;
  function tick() {
    clearTimeout(tickT);
    if (!S.player) return;
    const st = S.player.state(), now = st.now;
    if (st.audio && !document.hidden && now != null && S.lastNow != null) {
      const dt = now - S.lastNow;
      if (dt > 0 && dt <= 1) { S.unsaved += dt; if (S.unsaved >= RULES.saveEveryS) flush(); }
    }
    S.lastNow = now;
    tickT = setTimeout(tick, 250);
  }
  function flush() {
    if (!(S.unsaved > 0)) return;
    const g = gd(), log = g.playS || (g.playS = {}), k = day();
    log[k] = Math.round(((log[k] || 0) + S.unsaved) * 10) / 10; S.unsaved = 0;
    Object.keys(log).sort().slice(0, -RULES.keepDays).forEach(x => delete log[x]);
    save();
    if (log[k] >= R.PRACTICE_S) A.store.noteFinished(GAME_ID);    // Today's Practice: 2 minutes today (once a day)
  }

  /* ---------- pause (the kit's): the player stops; back to the rudiments ---------- */
  const pause = A.UI.pause.mount({
    onPause: () => stop(),
    onResume: () => {},
    onLevels: () => showHub(),
    levelsLabel: 'Back to rudiments',
    confirmLeave: () => false,
    info: () => S.cur ? [['Rudiment', `#${S.cur.n} ${S.cur.name}`], ['Tempo', tierName(S.tier)]] : [],
  });
  addEventListener('pagehide', () => { stop(); flush(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  /* ---------- start ---------- */
  drawGrid();
  const deep = R.byId(params.get('r') || '');
  if (deep) { showHub(); open(deep.id); } else showHub();

  A.RudimentTrainer = {RULES,
    state: () => ({screen: $('page').hidden ? 'hub' : 'page', tab: S.tab, cur: S.cur && S.cur.id, tier: S.tier, view: S.view, counting: S.counting, click: S.click,
      playing: S.playing, reps: Object.assign({}, S.reps), ocoRuns: Object.assign({}, S.ocoRuns), canCheck: !!S.cur && canCheck(),
      player: S.player ? S.player.state() : null, done: JSON.parse(JSON.stringify(gd().done || {})), playS: Object.assign({}, gd().playS || {}), unsaved: S.unsaved}),
    open, play, stop, tier: t => setTier(t, false), hub: showHub, flush};
})(window.Arcade);
