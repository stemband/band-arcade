/* Band Arcade: TODAY'S PRACTICE, the card at the top of the lobby (lobby.js draws it, arcade.css styles it): a short
   3-step routine for the student's instrument, WARM UP → SKILL → PLAY, about 15 minutes. Each step opens a game (or a
   Tune Up tool) and checks itself off when the student FINISHES something there today. All 3 done = a small token
   bonus (once a day) and a stamp on this week's row. Loaded by the floor page only, after games.js and storage.js.

   HOW TO CHANGE TODAY'S PRACTICE (Mr. Graham: edit the PRACTICE block just below, nothing else)
     - Change a weekday's skill: `days`, e.g. 3: 'ear' makes every Wednesday an ear-training day. The skills are the
       names in `skills` (scales, rhythm, reading, ear, technique), or 'choice' (the student's weakest game).
     - One-day override: `today: {skill: 'rhythm', until: '2026-10-09'}`. `skill` is a skill name OR a game id
       ('lost-signal'); `until` is the LAST day it counts (that whole day), then the normal days come back by themselves.
       Without `until` it stays until you put `today: null` again.
     - Change the bonus: `bonus` (tokens for finishing all 3 steps, once a day; 5 tokens = 1 star).
     - The games for a skill: `skills.<skill>.games` = the games that really practice it. They TAKE TURNS WEEK BY WEEK
       (only the ones that suit the student's instrument: a snare drummer skips the games that need pitches).
       `fallback` is ONLY for an instrument that can't play ANY of `games` (the first one that suits). Unknown ids are
       skipped. (An old-style plain list, reading: ['note-storm', …], still works: it counts as `games`.)
     - The PLAY step: `play` = the games that take turns DAY BY DAY when nothing is ASSIGNED (shared/featured.js);
       an assigned game always replaces it.
     - Restart the cycle (a new semester): `rotationStart`, a Monday ('2026-08-03'). Weeks and days are counted from
       it, so every device shows the same games on the same day.

   THE 3 STEPS (plan(date, member)):
     1. WARM UP  winds & brass: TUNE UP → TUNER, fill one HOLD IT ring today (gameData('tuneup').holds[day] ≥ 1);
                 bells: the day's scale in Scale Trainer (a finished round); snare: TUNE UP → METRONOME, 2 minutes today
                 (gameData('tuneup').metroS[day] ≥ metroS) or a Tempo Ladder climbed to its goal (ladderTop[day]).
     2. SKILL    the day's skill (`days`, or the `today` override). THE WEEKLY ROTATION: w = whole weeks from
                 `rotationStart` to the date's Monday (0 before it); the step = suitable[w % suitable.length], where
                 suitable = the skill's `games` that suit the member (gameFit); none suits = the first suitable
                 `fallback`. 'choice' (weekends) = the WEAKEST suitable game (the fewest stars as a share of its
                 maxStars; ties: games.js order; no tools, no games.js players: 2 games, no games without stars).
     3. PLAY     the ASSIGNED game (shared/featured.js, on that date); else THE DAILY ROTATION: d = days from
                 `rotationStart` (0 before it), the suitable `play` games [d % length]; else the CONTINUE game.
     A step never repeats an earlier step's game: it moves on to the next one in its list (the bells' scales day: Scale
     Trainer is already the warm-up, so step 2 takes the fallback).
   A GAME STEP IS DONE when today's activity log has `f[game]` (store.noteFinished: a results screen shown, a battle won
   or lost, a night survived…; just opening a game never counts). The plan is worked out from the date and the
   instrument (never at random, no saved rotation state: every device agrees) and KEPT for the day the first time the
   card draws it (gameData('practice').plans[day] = {member, steps}, 14 days kept), so stars earned in the afternoon,
   or a new version of this file mid-day, never change the morning's plan or un-check a finished step. (A day saved by
   the first version, `plan` {date, …}, is read once and moved into `plans`.)
   SAVED (gameData('practice'), in the Arcade Backup Code): plans {day: {member, steps}}, paid {day: true} (the bonus:
   recorded BEFORE the tokens are added, so a reload or a second tab can never pay twice), days {day: true} (all 3
   done: the week's stamps), stamped {day: true} (the gold stamp's one animation), pro (the day PRACTICE PRO was earned).
     Arcade.Practice.plan(date, memberId)    → [{step, word, game, tool?, title, task, why, done}]
     Arcade.Practice.today()                 → today's kept plan with live checks (null: no instrument saved)
     Arcade.Practice.settle()                → the lobby's check: pays the bonus once, records the day, PRACTICE PRO
     Arcade.Practice.week(date)              → {days: [{key, letter, name, on, today}], count, goal}
     Arcade.Practice.open(step, onGame)      → what a tap on a step does
     Arcade.Practice.state()                 → tests */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";

  /* ================= THE SETTINGS (Mr. Graham edits these) ================= */
  const PRACTICE = {
    bonus: 10,              // tokens for finishing all 3 steps (once a day). 5 tokens = 1 star.
    weekGoal: 4,            // practice days in a week (Mon–Sun) that earn the weekly plate
    // THE DAY'S SKILL, by weekday (0 = Sunday). Every device shows the same skill on the same day.
    days: {1: 'scales', 2: 'rhythm', 3: 'reading', 4: 'ear', 5: 'technique', 6: 'choice', 0: 'choice'},
    // Mr. Graham's override: a skill name, a game id, or null. Example: today: {skill: 'rhythm', until: '2026-10-09'}
    today: null,
    // Each skill: `games` = the games that really practice it. They TAKE TURNS week by week (only the ones that suit
    // the student's instrument, Arcade.gameFit). `fallback` = used only when NONE of `games` suits the instrument
    // (the first that suits). Edit freely; unknown ids are skipped.
    skills: {
      scales:    {games: ['scale-trainer'],                           fallback: ['chime-heist', 'rhythm-dojo']},
      rhythm:    {games: ['rhythm-dojo', 'showtime-malfunction']},
      reading:   {games: ['note-storm', 'ghost-notes', 'note-ninja'], fallback: ['ancient-ninja-scrolls']},
      ear:       {games: ['lost-signal', 'vanishing-ink'],            fallback: ['showtime-malfunction']},
      technique: {games: ['button-masher', 'sustain-speedway'],       fallback: ['chime-heist', 'showtime-malfunction']},
    },
    // Step 3 (PLAY) when nothing is ASSIGNED: these take turns DAY by day (school days and weekends alike).
    play: ['music-highway', 'blocktave', 'arcade-quest', 'keys-to-the-city', 'chime-heist'],
    // The rotation counts weeks (and days) from this Monday, so every device agrees. Change it to restart the cycle.
    rotationStart: '2026-08-03',
  };
  /* ========================================================================= */

  const SKILL_NAMES = {scales: 'Scales', rhythm: 'Rhythm', reading: 'Note reading', ear: 'Ear training', technique: 'Technique', choice: 'Level up'};
  const WORDS = ['Warm up', 'Skill', 'Play'];
  const METRO_S = 120;                  // the snare's warm-up: 2 minutes of metronome
  const HOLD_S = 4;                     // the Tuner's HOLD IT ring (note-checker/tuner.js TUNER.holdS)
  const KEEP = 60;                      // days kept in paid / days / stamped
  const KEEP_PLANS = 14;                // days kept in plans
  const PICK = 'bandarcade.practice-pick';
  const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const st = () => A.store;
  const gd = () => st().gameData('practice');
  const save = () => st().saveGameData('practice');
  const keyOf = d => st().dayKey(d);
  const dateOf = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const anyGame = id => (A.GAMES || []).find(g => g.id === id) || null;             // tools too (the Note Checker)
  const floorGame = id => A.floorGames().find(g => g.id === id) || null;
  const keep = o => { Object.keys(o).sort().slice(0, -KEEP).forEach(k => delete o[k]); };

  /** which warm-up: 'winds' (pitched winds & brass), 'bells' (pitched percussion) or 'snare' (unpitched) */
  function kindOf(memberId) {
    const m = A.memberById(memberId);
    if (!m) return 'winds';
    if (m.pitched === false) return 'snare';
    return m.family === 'percussion' ? 'bells' : 'winds';
  }
  const suits = (g, memberId) => !!g && !g.tool && A.gameFit(g, memberId).ok;
  const starsFor = (g, memberId) => g.player ? st().allStars(g.player, g.id) : st().allStars(memberId, g.id);

  /** the student's weakest suitable game: the fewest stars as a share of its maxStars (ties: games.js order) */
  function weakest(memberId, used) {
    let best = null, low = Infinity;
    A.floorGames().forEach(g => {
      if (!g.maxStars || g.players === 2 || used.includes(g.id) || !suits(g, memberId)) return;
      const share = starsFor(g, memberId) / g.maxStars;
      if (share < low) { low = share; best = g; }
    });
    return best;
  }
  /** the skill for a date: Mr. Graham's override (until its last day), else the weekday's */
  function skillOn(date) {
    const o = PRACTICE.today, k = keyOf(date);
    if (o && o.skill && (!o.until || k <= o.until) && (!o.from || k >= o.from)) return o.skill;
    return PRACTICE.days[date.getDay()] || 'choice';
  }
  /* ---------- THE ROTATION: counted from rotationStart, from the calendar date only (every device agrees) ---------- */
  const dayNo = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  const mondayNo = d => dayNo(d) - (d.getDay() + 6) % 7;
  const startDate = () => { const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(PRACTICE.rotationStart || '')); return m ? new Date(+m[1], m[2] - 1, +m[3], 12) : new Date(2026, 7, 3, 12); };
  /** whole weeks from rotationStart's Monday to the date's Monday (0 before it) */
  const weekNo = date => Math.max(0, Math.floor((mondayNo(date) - mondayNo(startDate())) / 7));
  /** days from rotationStart (0 before it) */
  const dayIndex = date => Math.max(0, dayNo(date) - dayNo(startDate()));
  /** a skill's settings as {games, fallback}; an old-style plain list = {games: list} (one console warning) */
  let warnedOld = false;
  function skillDef(skill) {
    const v = PRACTICE.skills[skill];
    if (Array.isArray(v)) {
      if (!warnedOld && window.console) { warnedOld = true; console.warn(`practice.js: skills.${skill} is an old-style list; write it as {games: [...], fallback: [...]}. It still works (as games).`); }
      return {games: v, fallback: []};
    }
    if (v && typeof v === 'object') return {games: Array.isArray(v.games) ? v.games : [], fallback: Array.isArray(v.fallback) ? v.fallback : []};
    return null;
  }
  /** the skill's game for a date and member, before any no-repeat rule: its suitable `games` taking turns by week, else
      the first suitable `fallback` (null: none suits, or not a skill name) */
  function rotationPick(skill, memberId, date) {
    const def = skillDef(skill);
    if (!def) return null;
    const ok = def.games.map(floorGame).filter(g => suits(g, memberId));
    if (ok.length) return ok[weekNo(date) % ok.length];
    return def.fallback.map(floorGame).find(g => suits(g, memberId)) || null;
  }
  /** the skill's game, never one already in the plan: the week's turn, else the next in turn, else the fallback
      (a game id works as a skill too; 'choice' = the weakest) */
  function skillGame(skill, memberId, used, date) {
    if (skill === 'choice') return weakest(memberId, used);
    const def = skillDef(skill);
    if (!def) { const g = floorGame(skill); return g && suits(g, memberId) && !used.includes(g.id) ? g : null; }
    const ok = def.games.map(floorGame).filter(g => suits(g, memberId));
    if (ok.length) {
      const w = weekNo(date) % ok.length;
      for (let i = 0; i < ok.length; i++) { const g = ok[(w + i) % ok.length]; if (!used.includes(g.id)) return g; }
    }
    return def.fallback.map(floorGame).find(g => suits(g, memberId) && !used.includes(g.id)) || null;
  }
  /** the PLAY rotation's game for a date: the suitable `play` games taking turns by day, never one already used */
  function playGame(memberId, used, date) {
    const ok = (PRACTICE.play || []).map(floorGame).filter(g => suits(g, memberId));
    const d = dayIndex(date);
    for (let i = 0; i < ok.length; i++) { const g = ok[(d + i) % ok.length]; if (!used.includes(g.id)) return g; }
    return null;
  }
  /** the ASSIGNED game on a date (shared/featured.js; its `until` is the last day) */
  function assignedOn(key) {
    const F = A.FEATURED;
    if (!F || !F.game || (F.until && key > String(F.until))) return null;
    return floorGame(F.game);
  }
  /** the bells' scale of the day: the Middle School audition scales in turn (shared/scales.js AUDITION_ORDER) */
  function dayScale(date) {
    const S = A.Scales, list = (S && S.AUDITION_ORDER && S.AUDITION_ORDER.ms) || ['F', 'Bb', 'Eb', 'Ab'];
    const n = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
    const id = list[((n % list.length) + list.length) % list.length];
    return (S && S.CONCERT && S.CONCERT[id] && S.CONCERT[id][0]) || id.replace('b', '♭');
  }

  /** THE PLAN for a date and an instrument member (the same every time for the same day, member and saved progress) */
  function plan(date, memberId) {
    date = date || st().today(); memberId = memberId || st().player;
    if (!memberId || !A.memberById(memberId)) return [];
    const key = keyOf(date), kind = kindOf(memberId), steps = [], used = [];
    // 1. WARM UP
    if (kind === 'winds') steps.push({tool: 'tuner', game: 'note-checker', task: `Hold a note in tune for ${HOLD_S} seconds`,
      title: `Warm up: hold a note in tune for ${HOLD_S} seconds`, why: 'Tune Up → Tuner: fill one HOLD IT ring'});
    else if (kind === 'snare') steps.push({tool: 'metronome', game: 'note-checker', task: `Play along with the metronome for ${METRO_S / 60} minutes`,
      title: `Warm up: play along with the metronome for ${METRO_S / 60} minutes`, why: 'Tune Up → Metronome (or climb a Tempo Ladder)'});
    else {
      const sc = dayScale(date), g = floorGame('scale-trainer');
      if (g && suits(g, memberId)) steps.push({game: g.id, task: `Play the concert ${sc} scale`, title: `Warm up: the concert ${sc} scale — ${g.name}`, why: 'Any finished round counts'});
      else { const w = weakest(memberId, used); steps.push({game: w.id, task: `Play a round of ${w.name}`, title: `Warm up: ${w.name}`, why: 'Any finished round counts'}); }
    }
    if (!steps[0].tool) used.push(steps[0].game);
    // 2. SKILL
    let skill = skillOn(date), g2 = skillGame(skill, memberId, used, date);
    if (!g2 && skill !== PRACTICE.days[date.getDay()]) { skill = PRACTICE.days[date.getDay()] || 'choice'; g2 = skillGame(skill, memberId, used, date); }
    if (!g2) { skill = 'choice'; g2 = weakest(memberId, used); }
    if (!g2) g2 = A.floorGames().find(g => suits(g, memberId) && !used.includes(g.id));
    const sName = SKILL_NAMES[skill] || (floorGame(skill) ? 'Mr. Graham\'s pick' : skill);
    steps.push({game: g2.id, skill, task: skill === 'choice' ? `Level up your ${g2.name} stars` : `${sName}: ${g2.name}`,
      title: `Skill of the day: ${sName} — ${g2.name}`, why: skill === 'choice' ? 'Your game with the most stars still to win' : `Today's skill: ${sName}`});
    used.push(g2.id);
    // 3. PLAY: the assigned game, else the day's turn in `play`, else the CONTINUE game (never one already in the plan)
    const lastId = (st().gameData('floor') || {}).last;
    const choices = [[assignedOn(key), 'assigned'], [playGame(memberId, used, date), 'play'], [floorGame(lastId), 'continue']];
    let pick = choices.find(([g]) => suits(g, memberId) && !used.includes(g.id));
    if (!pick) { const w = weakest(memberId, used) || A.floorGames().find(g => suits(g, memberId) && !used.includes(g.id)); pick = [w, 'choice']; }
    const [g3, why3] = pick;
    steps.push({game: g3.id, task: why3 === 'assigned' ? `${g3.name} (assigned!)` : `Play ${g3.name}`,
      title: `Play: ${g3.name}${why3 === 'assigned' ? ' (assigned!)' : ''}`,
      why: why3 === 'assigned' ? 'Assigned by Mr. Graham' : why3 === 'play' ? 'Game of the day' : why3 === 'continue' ? 'Keep going where you left off' : 'Play a song or a round'});
    return steps.map((s, i) => Object.assign({step: i + 1, word: WORDS[i]}, s, {done: doneOn(s, key)}));
  }

  /** is a step done on that day? a game: a round FINISHED there (the log's f); Tune Up: its own daily logs */
  function doneOn(s, key) {
    if (s.tool) {
      const t = st().gameData('tuneup') || {};
      if (s.tool === 'tuner') return ((t.holds || {})[key] || 0) >= 1;
      if (s.tool === 'metronome') return ((t.metroS || {})[key] || 0) >= METRO_S || ((t.ladderTop || {})[key] || 0) >= 1;
      return false;
    }
    return !!((st().activityOn(key).f || {})[s.game]);
  }

  /** TODAY's plan, kept for the whole day (the first time the lobby works it out), with live checks */
  function today() {
    const m = st().player;
    if (!m) return null;
    const date = st().today(), key = keyOf(date), d = gd(), plans = d.plans || (d.plans = {});
    // a day saved by the first version of Today's Practice (one `plan`): moved into `plans`, checks and all
    if (d.plan && typeof d.plan === 'object') {
      if (d.plan.date && !plans[d.plan.date]) plans[d.plan.date] = {member: d.plan.member, steps: d.plan.steps};
      delete d.plan; save();
    }
    const kept = plans[key];
    let steps;
    if (kept && kept.member === m && Array.isArray(kept.steps) && kept.steps.length === 3 &&
      kept.steps.every(s => s && anyGame(s.game))) steps = kept.steps.map(s => Object.assign({}, s, {done: doneOn(s, key)}));
    else {
      steps = plan(date, m);
      if (steps.length !== 3) return null;
      plans[key] = {member: m, steps: steps.map(s => { const c = Object.assign({}, s); delete c.done; return c; })};
      Object.keys(plans).sort().slice(0, -KEEP_PLANS).forEach(k => delete plans[k]);
      save();
    }
    const next = steps.findIndex(s => !s.done);
    steps.forEach((s, i) => { s.next = i === next; });
    return steps;
  }

  /** THIS WEEK (Monday to Sunday): the stamps (all 3 steps done that day) */
  function week(date) {
    date = date || st().today();
    const k = keyOf(date), mon = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7, 12), on = gd().days || {};
    const days = DAY_NAMES.map((name, i) => {
      const key = keyOf(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i, 12));
      return {key, name, letter: name[0], on: !!on[key], today: key === k};
    });
    return {days, count: days.filter(x => x.on).length, goal: PRACTICE.weekGoal};
  }

  /** the lobby's check, every time the card is drawn: all 3 done today → the bonus ONCE (another tab or a reload never
      pays again: the saved record is read fresh and written BEFORE the tokens), the day's stamp, PRACTICE PRO.
      → {steps, all, paidNow, stampNow, proNow, paid} */
  function settle() {
    const steps = today();
    if (!steps) return null;
    const all = steps.every(s => s.done), key = keyOf(st().today());
    let paidNow = false, proNow = false;
    if (all) {
      st().reload();                                         // fresh from the device: another tab may have paid already
      const d = gd(), paid = d.paid || (d.paid = {}), days = d.days || (d.days = {});
      if (!paid[key]) {
        paid[key] = true; days[key] = true; keep(paid); keep(days);
        save();                                              // the record FIRST…
        if (A.Tokens) A.Tokens.add(PRACTICE.bonus);          // …then the tokens (arcade:tokens: the Prize Counter's sign)
        paidNow = true;
      } else if (!days[key]) { days[key] = true; keep(days); save(); }
      if (!d.pro && week().count >= PRACTICE.weekGoal) { d.pro = key; save(); proNow = true; }
    }
    const d = gd();
    return {steps, all, paidNow, proNow, paid: !!(d.paid || {})[key], stampNow: all && !(d.stamped || {})[key]};
  }
  /** the gold stamp has played its one animation today */
  function stamped() { const d = gd(), s = d.stamped || (d.stamped = {}); s[keyOf(st().today())] = true; keep(s); save(); }

  /** a tap on a step: a game opens exactly like the CONTINUE card (onGame = arcade.js openGame: the fit panel, Select
      Player, Back), starting on its first open level short of 3 ★ (level-select.js reads PICK once); Tune Up opens its tab */
  function open(s, onGame) {
    if (!s) return;
    if (s.tool) {
      try { sessionStorage.setItem('bandarcade.from', JSON.stringify({view: 'lobby'})); } catch (e) { /* private mode */ }
      const href = A.linkTo('note-checker/index.html', {tool: s.tool});
      if (A.Sfx && A.Sfx.playThenGo) A.Sfx.playThenGo('select-note-checker', href); else location.href = href;
      return;
    }
    const g = floorGame(s.game);
    if (!g) return;
    try { if (A.gameFit(g, st().player).ok) sessionStorage.setItem(PICK, g.id); } catch (e) { /* private mode */ }
    onGame(g, 'lobby');
  }

  /** the PRACTICE PRO plate's line in the Locker: "2 of 4 practice days this week" */
  function proProgress() { const w = week(); return `${Math.min(w.count, w.goal)} of ${w.goal} practice days this week`; }
  // the plate's requirement names the real goal (avatar-parts.js says 4 until it knows)
  const plate = ((window.AVATAR_PARTS || {}).PLATES || []).find(p => p.id === 'practice');
  if (plate && plate.unlock) plate.unlock.text = `Today's Practice: practice ${PRACTICE.weekGoal} days in one week (all 3 steps each day)`;

  /* fresh saved data when this page comes back (another tab saved, or the Back button restored it from memory). These run
     before arcade.js's own pageshow (this file loads first), so the lobby redraws from what is really saved. */
  addEventListener('storage', e => { if (!e.key || e.key === 'bandarcade.v1') st().reload(); });
  addEventListener('pageshow', e => { if (e.persisted) st().reload(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) st().reload(); });

  A.Practice = {PRACTICE, SKILL_NAMES, METRO_S, PICK, plan, today, week, settle, stamped, open, proProgress, kindOf, weakest, dayScale,
    rotationPick, weekNo, dayIndex,
    get bonus() { return PRACTICE.bonus; },
    state: () => ({plan: today(), week: week(), paid: !!(gd().paid || {})[keyOf(st().today())], pro: gd().pro || null})};
})(window.Arcade);
