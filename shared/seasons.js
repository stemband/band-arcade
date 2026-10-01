/* Band Arcade: SEASONAL EVENTS. Limited-time windows when special avatar items can be earned. Items earned during
   an event are the student's FOREVER (wearable all year); the event comes back every year for anyone who missed them.

   ======================== THE EVENT CALENDAR (Mat: edit this list) ========================
   Each event:
     id        never rename it (saved progress and the items' unlock rules use it)
     name      what students see ("Spooky Season")
     emoji     on the lobby banner
     start/end 'MM-DD' = every year, or 'YYYY-MM-DD' = one time only (a custom event like Concert Week).
               Both days count (inclusive), in the device's own date and time. An event may cross New Year
               ('12-01' → '01-07': it starts in December and ends in January).
     colors    theme tokens (shared/theme.css) for the banner and the panel: [main, accent]
     look      THE SEASONAL LOOK of the arcade's menus while it runs (season-look.js draws it): 'spooky' | 'winter' |
               'friendship' | 'miosm' | 'spring' | 'summer' | 'concert' | 'school' | 'harvest' | 'frost'
     deco      the touch on the lobby's signs while it runs (snow on top, a flower…): 'spooky' | 'winter' | 'hearts' |
               'music' | 'flowers' | 'summer' | null
     countdown true = the banner counts down to the event's LAST day ("🎻 Concert in 5 days!", "Concert tonight!"):
               for a concert, make `end` the concert day and `start` the day the countdown should begin
     jingle    the sound for the banner and the CLAIM moment (shared/sounds.js; it falls back to a built-in jingle)
     gift      the FREE GIFT: '<field>:<item id>', claimed with one tap in the event panel during the event
     ladder    the CHALLENGE LADDER, 3–5 steps, each {do, n, item}:
                 do: 'stars'   earn n stars (every star earned in a level during the event counts, replays too)
                     'levels'  clear n levels (a level finished with at least 1 star)
                     'games'   play n different games
                     'endless' score n in any Endless mode (one run)
                     'days'    play on n different days
                 item: '<field>:<item id>' that the step unlocks
               Only what a student does DURING the event counts (by date).
     bonus     OPTIONAL: a BONUS LADDER, the same step format as `ladder`, harder (for a long event). It opens once every
               step of the main ladder is done; its progress counts the WHOLE event (the same activity log, from the
               event's first day), so a student who already did a lot isn't sent back to zero. Any event can have one.
     bonusEmoji  optional: after the panel's "BONUS CHALLENGES" heading ('👻')
   THE ITEMS themselves live in shared/avatar-parts.js (the SEASONAL ITEMS section at its end) with
   unlock: {event: '<event id>'}. A new item also goes at the END of its list in shared/avatar-code.js TABLE.
   Identity items (head coverings, glasses, hearing aids, the wheelchair) are never event items.
   EVENT ITEMS ARE EARNED, SEASONAL SHOP ITEMS ARE BOUGHT: NEVER MIX THEM. The items here (gift + ladder, unlock
   {event}) are never sold. The Prize Counter's SEASONAL SHELF sells OTHER, new items during each event (avatar-parts.js
   SEASON_SHOP, unlock {shop, season}; shared/tokens.js); never put one of those in a gift or a ladder.
   An event's look always wins over a BACKGROUND-ONLY SEASON (below) on the same days.
   ========================================================================================== */
window.Arcade = window.Arcade || {};
window.Arcade.SEASONS = [
  {id: 'spooky', name: 'Spooky Season', emoji: '🎃', start: '10-01', end: '11-01', look: 'spooky', colors: ['purple', 'amber'], deco: 'spooky', jingle: 'event-spooky-jingle',
   gift: 'head:pumpkin',
   ladder: [
     {do: 'games', n: 3, item: 'head:witchhat'},
     {do: 'stars', n: 10, item: 'pet:boo'},
     {do: 'levels', n: 5, item: 'back:batwings'},
     {do: 'endless', n: 500, item: 'effect:spookyglow'},
     {do: 'days', n: 3, item: 'bg:hauntedhallway'},
   ],
   // the BONUS LADDER (opens when all 5 challenges above are done; counts everything since Oct 1)
   bonusEmoji: '👻',
   bonus: [
     {do: 'games', n: 8, item: 'hand:jacklantern'},
     {do: 'stars', n: 30, item: 'top:mummywraps'},
     {do: 'levels', n: 15, item: 'back:vampcape'},
     {do: 'days', n: 8, item: 'effect:floatbats'},
     {do: 'endless', n: 1500, item: 'plate:candycorn'},
     {do: 'stars', n: 50, item: 'pet:reaper'},
   ]},
  {id: 'winter', name: 'Winter Fest', emoji: '❄️', start: '12-01', end: '01-07', look: 'winter', colors: ['cyan', 'blue'], deco: 'winter', jingle: 'event-winter-jingle',
   gift: 'top:scarf',
   ladder: [
     {do: 'levels', n: 3, item: 'head:earmuffs'},
     {do: 'games', n: 3, item: 'shoes:iceskates'},
     {do: 'stars', n: 15, item: 'pet:snowman'},
     {do: 'days', n: 4, item: 'effect:snowfall'},
     {do: 'endless', n: 750, item: 'bg:twinklelights'},
   ]},
  {id: 'friendship', name: 'Friendship Week', emoji: '💖', start: '02-07', end: '02-14', look: 'friendship', colors: ['pink', 'red'], deco: 'hearts', jingle: 'event-friendship-jingle',
   gift: 'head:heartglasses',
   ladder: [
     {do: 'games', n: 2, item: 'hand:rose'},
     {do: 'stars', n: 8, item: 'effect:hearts'},
     {do: 'days', n: 3, item: 'plate:hearts'},
   ]},
  {id: 'miosm', name: 'Music In Our Schools Month', emoji: '🎺', start: '03-01', end: '03-31', look: 'miosm', colors: ['yellow', 'red'], deco: 'music', jingle: 'event-miosm-jingle',
   gift: 'top:miosmsash',
   ladder: [
     {do: 'levels', n: 5, item: 'hand:goldbaton'},
     {do: 'games', n: 4, item: 'head:miosmplume'},
     {do: 'stars', n: 20, item: 'bg:concerthall'},
   ]},
  {id: 'spring', name: 'Spring Bloom', emoji: '🌸', start: '04-01', end: '04-30', look: 'spring', colors: ['pink', 'green'], deco: 'flowers', jingle: 'event-spring-jingle',
   gift: 'head:flowercrown',
   ladder: [
     {do: 'stars', n: 10, item: 'pet:butterfly'},
     {do: 'levels', n: 5, item: 'effect:blossoms'},
     {do: 'days', n: 3, item: 'plate:blossom'},
   ]},
  {id: 'summer', name: 'Summer Send-Off', emoji: '☀️', start: '05-01', end: '05-22', look: 'summer', colors: ['amber', 'cyan'], deco: 'summer', jingle: 'event-summer-jingle',
   gift: 'head:sunnies',
   ladder: [
     {do: 'games', n: 3, item: 'hand:beachball'},
     {do: 'endless', n: 500, item: 'bg:sunsetbeach'},
     {do: 'levels', n: 8, item: 'plate:sunset'},
   ]},
  /* CONCERT SEASON: a template for YOUR concert (one time only: full 'YYYY-MM-DD' dates). To turn it on:
       1. remove the // in front of each line below,
       2. set `end` to the CONCERT DAY and `start` to the day the countdown should begin (a week or two before),
       3. keep a unique id for every concert ('concert-2027-spring', 'concert-2027-winter'…): never reuse one.
     The menus get the CONCERT look (stage curtains, spotlights, footlights) and the banner counts down:
     "🎻 Concert in 5 days!" … "Concert tonight!". Its challenges below have no items (a step without `item` is just a
     goal to beat); to give items, add them to shared/avatar-parts.js with unlock {event: '<this id>'} (and to the END
     of their list in shared/avatar-code.js TABLE), then put `gift: '<field>:<id>'` / `item: '<field>:<id>'` here.
     A concert wins over the yearly events and the background-only seasons on its days. */
  // {id: 'concert-2027-spring', name: 'Spring Concert', emoji: '🎻', start: '2027-04-20', end: '2027-05-04', look: 'concert', countdown: true,
  //  colors: ['yellow', 'red'], deco: 'music', jingle: 'event-miosm-jingle',
  //  ladder: [
  //    {do: 'days', n: 5},
  //    {do: 'stars', n: 15},
  //    {do: 'levels', n: 6},
  //  ]},
];

/* ======================== BACKGROUND-ONLY SEASONS (Mat: edit this list) ========================
   A season with ONLY a look for the arcade's menus: no banner, no event panel, no items. They fill the gaps between
   the events. Each: {id (never rename), name, look (one of the looks above), dates: [['MM-DD', 'MM-DD'], …]} (every
   year, both days count, a window may cross New Year; several windows = several lines). An EVENT's look always wins
   when both match a date. ?season=<id> previews one. */
window.Arcade.SEASON_BACKDROPS = [
  {id: 'school',  name: 'Back to School', look: 'school',  dates: [['08-01', '09-30']]},
  {id: 'harvest', name: 'Fall Harvest',   look: 'harvest', dates: [['11-02', '11-30']]},
  {id: 'frost',   name: 'Frost',          look: 'frost',   dates: [['01-08', '02-06'], ['02-15', '02-28']]},
];

/* ======================== the engine (no need to edit below) ========================
     Arcade.Seasons.active()          the event running today: {ev, from, to, key, daysLeft, preview} or null
     Arcade.Seasons.steps(occ)        the ladder with progress: [{i, do, n, have, done, owned, item, label}]
     Arcade.Seasons.bonusOpen(occ)    the BONUS LADDER is open (the event has one and every main step is done)
     Arcade.Seasons.bonusSteps(occ)   the bonus ladder with progress (the same rows + bonus: true), open or not
     Arcade.Seasons.allSteps(occ)     the main ladder + the bonus ladder once it's open (what the banner counts)
     Arcade.Seasons.claim(occ)        the FREE GIFT (true if it was given now)
     Arcade.Seasons.check()           earn every finished step (the running event, and one that ended in the last
                                      14 days); returns the newly earned item keys. shared/skins.js calls it before
                                      every UNLOCKED! card (results screens, Select Player), so the card celebrates it
     Arcade.Seasons.requirement(key)  a locked event item's words: "Spooky Season: Play 3 different games" during the
                                      event, "Returns next Spooky Season!" otherwise
   ACTIVITY: shared/storage.js keeps a small DAILY LOG (store.activity: stars, levels cleared, games played, the best
   Endless score, per date; the last 400 days, in the Arcade Backup Code). An event's progress = the log's days inside
   the event's dates, so nothing done before or after an event counts, and every year starts fresh.
   EARNED ITEMS are owned (store.ownItem, like the Token Booth's), so they stay the student's after the event ends.
     Arcade.Seasons.look()            THE SEASONAL LOOK of the menus today (an event's, else a background-only season's)
     Arcade.Seasons.lookOn() / setLookOn(on)   the "Seasonal look" switch (this device; ON by default)
   PREVIEW (testing): ?season=<id> shows that event today (banner, panel, look, items) whatever the date, or a
   background-only season's look (?season=frost), or any look by its name (?season=concert). Its
   progress is TODAY's activity only, and its claims/earned items live in this tab only (sessionStorage): nothing is
   saved. ?demo&today=YYYY-MM-DD pretends it is that date (saved normally: for testing dates like New Year's Eve).
   ?demo&unlockall opens every item, as with other unlocks. */
(function (A) {
  'use strict';
  const LIST = () => A.SEASONS || [];
  const pad = n => String(n).padStart(2, '0');
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s, year) => { const p = s.split('-').map(Number); return p.length === 3 ? new Date(p[0], p[1] - 1, p[2]) : new Date(year, p[0] - 1, p[1]); };
  const oneOff = ev => ev.start.split('-').length === 3;
  const endOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const DAY = 864e5;
  const params = () => A.params || new URLSearchParams(location.search);
  const previewId = () => { const p = params().get('season'); return p && LIST().some(e => e.id === p) ? p : null; };
  const BACKDROPS = () => A.SEASON_BACKDROPS || [];
  /** ?season=<a background-only season's id>: its look today (never an event, nothing saved) */
  // every look season-look.js can draw (so ?season=concert previews the Concert Season look with no concert set up)
  const LOOK_IDS = ['spooky', 'winter', 'friendship', 'miosm', 'spring', 'summer', 'concert', 'school', 'harvest', 'frost'];
  const previewBackdrop = () => {
    const p = params().get('season');
    if (!p || previewId()) return null;
    return BACKDROPS().find(b => b.id === p) || (LOOK_IDS.includes(p) ? {id: p, name: p, look: p} : null);
  };

  /** today (the device's date; ?demo&today=YYYY-MM-DD for testing) */
  function today() {
    if (A.store && A.store.today) return A.store.today();
    return new Date();
  }
  /** the occurrence of `ev` whose window holds `date`, else null */
  function occurrence(ev, date = today()) {
    for (const o of occurrences(ev, date)) if (date >= o.from && date <= o.to) return o;
    return null;
  }
  /** the event's windows around `date` (last year's, this year's, next year's; one for a one-off event) */
  function occurrences(ev, date = today()) {
    const mk = (from, to) => ({ev, from, to: endOfDay(to), key: ev.id + '@' + dateKey(from)});
    if (oneOff(ev)) return [mk(parse(ev.start), parse(ev.end))];
    return [-1, 0, 1].map(dy => {
      const y = date.getFullYear() + dy, from = parse(ev.start, y);
      let to = parse(ev.end, y); if (to < from) to = parse(ev.end, y + 1);      // crosses New Year
      return mk(from, to);
    });
  }
  const daysLeft = o => Math.max(0, Math.round((new Date(o.to.getFullYear(), o.to.getMonth(), o.to.getDate()) - new Date(today().getFullYear(), today().getMonth(), today().getDate())) / DAY));
  /** the event running now, or the one ?season= previews */
  function active(date = today()) {
    const pid = previewId();
    if (pid) {
      const ev = LIST().find(e => e.id === pid), real = occurrence(ev, date);
      const o = real || occurrences(ev, date).find(x => x.from > date) || occurrences(ev, date).pop();
      return Object.assign({}, o, {preview: true, daysLeft: real ? daysLeft(real) : Math.round((o.to - o.from) / DAY)});
    }
    // a one-time event (Concert Week) wins over a yearly one on the same days; otherwise the first in the list
    const list = LIST().filter(oneOff).concat(LIST().filter(ev => !oneOff(ev)));
    for (const ev of list) { const o = occurrence(ev, date); if (o) return Object.assign(o, {daysLeft: daysLeft(o)}); }
    return null;
  }
  /** the background-only season on `date` (the first in the list whose window holds it), or null */
  function backdrop(date = today()) {
    const pb = previewBackdrop();
    if (pb) return pb;
    for (const b of BACKDROPS()) for (const [start, end] of b.dates || []) if (occurrence({id: b.id, start, end}, date)) return b;
    return null;
  }
  /** THE SEASONAL LOOK of the menus on `date`: {look, id, name, kind: 'event'|'backdrop', preview} or null.
      An event (or ?season=<event>) always wins over a background-only season. Ignores the Seasonal look switch:
      Arcade.SeasonLook asks lookOn() before drawing. */
  function look(date = today()) {
    const pb = previewBackdrop();
    if (pb) return {look: pb.look, id: pb.id, name: pb.name, kind: 'backdrop', preview: true};
    const o = active(date);
    if (o && o.ev.look) return {look: o.ev.look, id: o.ev.id, name: o.ev.name, kind: 'event', preview: !!o.preview};
    if (o && previewId()) return null;                        // previewing an event with no look: the normal arcade
    const b = backdrop(date);
    return b ? {look: b.look, id: b.id, name: b.name, kind: 'backdrop', preview: !!previewBackdrop()} : null;
  }
  /* THE SWITCH "Seasonal look: On / Off" (the Settings panel + the event panel), saved on this device in
     gameData('seasons').look; ON by default. It replaced the event panel's DECORATIONS switch (gameData('seasons').deco):
     a device that had turned the decorations off keeps its seasonal look off. */
  function lookOn() {
    const d = A.store ? A.store.gameData('seasons') : {};
    return d.look !== undefined ? d.look !== false : d.deco !== false;
  }
  function setLookOn(on) {
    const d = A.store.gameData('seasons');
    d.look = !!on; delete d.deco;
    A.store.saveGameData('seasons');
    try { dispatchEvent(new CustomEvent('arcade:seasonlook', {detail: {on: !!on}})); } catch (e) { /* old browsers: the next page shows it */ }
  }
  /** the banner's words: "6 days left!", or for a `countdown` event "Concert in 5 days!" / "Concert tomorrow!" / "Concert tonight!" */
  function leftText(o) {
    const n = o.daysLeft, what = o.ev.countdownWord || 'Concert';
    if (o.ev.countdown) return n <= 0 ? `${what} tonight!` : n === 1 ? `${what} tomorrow!` : `${what} in ${n} days!`;
    return n <= 0 ? 'last day!' : n === 1 ? '1 day left!' : `${n} days left!`;
  }
  /** when an event starts next (null for a one-off event that has begun) */
  function nextStart(ev, date = today()) {
    const o = occurrences(ev, date).find(x => x.from > date);
    return o ? o.from : null;
  }

  /* ---------- items ---------- */
  const partOf = key => {
    const [field, id] = key.split(':'), P = window.AVATAR_PARTS || {};
    const list = {head: P.HEADS, top: P.TOPS, shoes: P.SHOES, pet: P.PETS, back: P.BACKS, hand: P.HANDS, effect: P.EFFECTS, bg: P.BGS, plate: P.PLATES, eyes: P.EYES, mouth: P.MOUTHS, hairColor: P.HAIR_COLORS}[field] || [];
    return list.find(x => x.id === id) || null;
  };
  /** every item an event gives: [{key, field, id, part, gift, step, bonus}] (step = its place in its own ladder) */
  function itemsOf(ev) {
    const out = [];
    const add = (key, gift, step, bonus) => { if (!key) return; const [field, id] = key.split(':'); out.push({key, field, id, part: partOf(key), gift, step, bonus}); };
    add(ev.gift, true, -1, false);
    (ev.ladder || []).forEach((s, i) => add(s.item, false, i, false));
    (ev.bonus || []).forEach((s, i) => add(s.item, false, i, true));
    return out;
  }
  const eventOf = key => LIST().find(ev => itemsOf(ev).some(it => it.key === key)) || null;

  /* ---------- preview memory (this tab only) ---------- */
  const PKEY = 'bandarcade.season-preview';
  const pmem = () => { try { return JSON.parse(sessionStorage.getItem(PKEY)) || {owned: {}, claimed: {}}; } catch (e) { return {owned: {}, claimed: {}}; } };
  const psave = m => { try { sessionStorage.setItem(PKEY, JSON.stringify(m)); } catch (e) { /* private window: this page only */ } };
  const owned = key => !!((A.store.ownedItems || {})[key] || (previewId() && pmem().owned[key]));
  const giveItem = key => {
    if (!key || owned(key)) return false;
    if (previewId()) { const m = pmem(); m.owned[key] = true; psave(m); }
    else A.store.ownItem(key);
    return true;
  };

  /* ---------- progress ---------- */
  function progress(o) {
    const log = A.store.activity || {}, p = {stars: 0, levels: 0, games: 0, endless: 0, days: 0};
    const games = {};
    const from = o.preview ? dateKey(today()) : dateKey(o.from), to = o.preview ? dateKey(today()) : dateKey(o.to);
    Object.keys(log).forEach(d => {
      if (d < from || d > to) return;
      const a = log[d];
      p.stars += a.s || 0; p.levels += a.c || 0; p.endless = Math.max(p.endless, a.e || 0);
      Object.keys(a.g || {}).forEach(g => { games[g] = 1; });
      if (a.p || a.c || a.s || Object.keys(a.g || {}).length) p.days++;
    });
    p.games = Object.keys(games).length;
    return p;
  }
  const num = n => Number(n).toLocaleString('en-US');                  // 1,500
  const LABEL = {stars: n => `Earn ${num(n)} ★`, levels: n => `Clear ${num(n)} level${n === 1 ? '' : 's'}`, games: n => `Play ${n} different games`,
    endless: n => `Score ${num(n)} in any Endless mode`, days: n => `Play on ${n} different days`};
  const label = s => (LABEL[s.do] || (() => 'Keep playing'))(s.n);
  const rowsOf = (list, p, bonus) => (list || []).map((s, i) => {
    const have = Math.min(s.n, p[s.do] || 0);
    return {i, do: s.do, n: s.n, have, done: have >= s.n, owned: s.item ? owned(s.item) : have >= s.n, item: s.item || null, part: s.item ? partOf(s.item) : null, label: label(s), bonus};
  });
  function steps(o, p = progress(o)) { return rowsOf(o.ev.ladder, p, false); }
  /** THE BONUS LADDER: the same progress (the whole event), whether it's open yet or not */
  function bonusSteps(o, p = progress(o)) { return rowsOf(o.ev.bonus, p, true); }
  /** open = the event has a bonus ladder and every step of the main ladder is done */
  function bonusOpen(o, p = progress(o)) { return !!(o.ev.bonus && o.ev.bonus.length) && steps(o, p).every(s => s.done); }
  /** the main ladder, + the bonus ladder once it's open */
  function allSteps(o) { const p = progress(o); return steps(o, p).concat(bonusOpen(o, p) ? bonusSteps(o, p) : []); }
  const claimed = o => o.preview ? !!pmem().claimed[o.key] : !!((A.store.gameData('seasons').claimed || {})[o.key]);
  /** the FREE GIFT: only while the event runs */
  function claim(o = active()) {
    if (!o || !o.ev.gift || claimed(o)) return false;
    if (o.preview) { const m = pmem(); m.claimed[o.key] = true; psave(m); }
    else { const d = A.store.gameData('seasons'); (d.claimed || (d.claimed = {}))[o.key] = Date.now(); A.store.saveGameData('seasons'); }
    return giveItem(o.ev.gift) || true;
  }
  /** earn every finished step: the running event, and any that ended in the last 14 days (a step finished on its
      last day on a page without an UNLOCKED! card still pays out) */
  function check() {
    if (!A.store) return [];
    const now = today(), out = [], seen = {};
    const occs = [];
    const a = active(now); if (a) occs.push(a);
    if (!previewId()) LIST().forEach(ev => occurrences(ev, now).forEach(o => { if (o.to < now && now - o.to < 14 * DAY) occs.push(o); }));
    occs.forEach(o => {
      if (seen[o.key]) return; seen[o.key] = 1;
      allSteps(o).forEach(s => { if (s.done && s.item && giveItem(s.item)) out.push(s.item); });
    });
    return out;
  }
  /** a locked event item's words */
  function requirement(key) {
    const ev = eventOf(key);
    if (!ev) return 'A seasonal event item';
    const o = active(), it = itemsOf(ev).find(x => x.key === key);
    if (o && o.ev === ev) return it.gift ? `${ev.name} free gift: claim it in the lobby!` : it.bonus ? `${ev.name} bonus: ${label(ev.bonus[it.step])}` : `${ev.name}: ${label(ev.ladder[it.step])}`;
    if (oneOff(ev)) return nextStart(ev) ? `Only during ${ev.name}` : `${ev.name} has ended`;
    return `Returns next ${ev.name}!`;
  }
  /** "Oct 1 – Nov 1" */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const when = ev => { const o = occurrences(ev)[1] || occurrences(ev)[0], f = o.from, t = o.to; return `${MON[f.getMonth()]} ${f.getDate()} – ${MON[t.getMonth()]} ${t.getDate()}`; };

  // ?demo: every calendar item must exist in avatar-parts.js with unlock {event: <its event>}
  if (A.DEMO) setTimeout(() => LIST().forEach(ev => itemsOf(ev).forEach(it => {
    if (!window.AVATAR_PARTS) return;
    if (!it.part) console.warn(`[seasons] ${ev.id}: no avatar part ${it.key}`);
    else if (!it.part.unlock || it.part.unlock.event !== ev.id) console.warn(`[seasons] ${it.key} needs unlock: {event: '${ev.id}'}`);
  })), 0);

  A.Seasons = {list: LIST, backdrops: BACKDROPS, LOOK_IDS, backdrop, look, lookOn, setLookOn, leftText, today, dateKey, occurrence, occurrences, active, nextStart, itemsOf, eventOf, partOf, progress, steps, bonusSteps, bonusOpen, allSteps, label, claimed, claim, check,
    requirement, owned, when, get preview() { return !!previewId(); },
    /** a preview's UNLOCKED! cards are remembered in this tab only */
    previewSeen: key => !!(previewId() && (pmem().seen || {})[key]),
    markPreviewSeen(keys) { if (!previewId() || !keys.length) return; const m = pmem(); m.seen = m.seen || {}; keys.forEach(k => { m.seen[k] = true; }); psave(m); },
    /** tests: forget this tab's preview claims */
    _resetPreview() { try { sessionStorage.removeItem(PKEY); } catch (e) { /* fine */ } }};
})(window.Arcade);
