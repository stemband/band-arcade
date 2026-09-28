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
     deco      the lobby's decoration while it runs: 'spooky' | 'winter' | 'hearts' | 'music' | 'flowers' | 'summer' | null
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
   THE ITEMS themselves live in shared/avatar-parts.js (the SEASONAL ITEMS section at its end) with
   unlock: {event: '<event id>'}. A new item also goes at the END of its list in shared/avatar-code.js TABLE.
   Identity items (head coverings, glasses, hearing aids, the wheelchair) are never event items.
   ========================================================================================== */
window.Arcade = window.Arcade || {};
window.Arcade.SEASONS = [
  {id: 'spooky', name: 'Spooky Season', emoji: '🎃', start: '10-01', end: '11-01', colors: ['purple', 'amber'], deco: 'spooky', jingle: 'event-spooky-jingle',
   gift: 'head:pumpkin',
   ladder: [
     {do: 'games', n: 3, item: 'head:witchhat'},
     {do: 'stars', n: 10, item: 'pet:boo'},
     {do: 'levels', n: 5, item: 'back:batwings'},
     {do: 'endless', n: 500, item: 'effect:spookyglow'},
     {do: 'days', n: 3, item: 'bg:hauntedhallway'},
   ]},
  {id: 'winter', name: 'Winter Fest', emoji: '❄️', start: '12-01', end: '01-07', colors: ['cyan', 'blue'], deco: 'winter', jingle: 'event-winter-jingle',
   gift: 'top:scarf',
   ladder: [
     {do: 'levels', n: 3, item: 'head:earmuffs'},
     {do: 'games', n: 3, item: 'shoes:iceskates'},
     {do: 'stars', n: 15, item: 'pet:snowman'},
     {do: 'days', n: 4, item: 'effect:snowfall'},
     {do: 'endless', n: 750, item: 'bg:twinklelights'},
   ]},
  {id: 'friendship', name: 'Friendship Week', emoji: '💖', start: '02-07', end: '02-14', colors: ['pink', 'red'], deco: 'hearts', jingle: 'event-friendship-jingle',
   gift: 'head:heartglasses',
   ladder: [
     {do: 'games', n: 2, item: 'hand:rose'},
     {do: 'stars', n: 8, item: 'effect:hearts'},
     {do: 'days', n: 3, item: 'plate:hearts'},
   ]},
  {id: 'miosm', name: 'Music In Our Schools Month', emoji: '🎺', start: '03-01', end: '03-31', colors: ['yellow', 'red'], deco: 'music', jingle: 'event-miosm-jingle',
   gift: 'top:miosmsash',
   ladder: [
     {do: 'levels', n: 5, item: 'hand:goldbaton'},
     {do: 'games', n: 4, item: 'head:miosmplume'},
     {do: 'stars', n: 20, item: 'bg:concerthall'},
   ]},
  {id: 'spring', name: 'Spring Bloom', emoji: '🌸', start: '04-01', end: '04-30', colors: ['pink', 'green'], deco: 'flowers', jingle: 'event-spring-jingle',
   gift: 'head:flowercrown',
   ladder: [
     {do: 'stars', n: 10, item: 'pet:butterfly'},
     {do: 'levels', n: 5, item: 'effect:blossoms'},
     {do: 'days', n: 3, item: 'plate:blossom'},
   ]},
  {id: 'summer', name: 'Summer Send-Off', emoji: '☀️', start: '05-01', end: '05-22', colors: ['amber', 'cyan'], deco: 'summer', jingle: 'event-summer-jingle',
   gift: 'head:sunnies',
   ladder: [
     {do: 'games', n: 3, item: 'hand:beachball'},
     {do: 'endless', n: 500, item: 'bg:sunsetbeach'},
     {do: 'levels', n: 8, item: 'plate:sunset'},
   ]},
  // A ONE-TIME CUSTOM EVENT (full dates: it happens once). Remove the // to turn it on, and give it items: add them to
  // shared/avatar-parts.js with unlock {event: 'concert-week'} (and to avatar-code.js TABLE), or leave `gift`/`item`
  // out of a step to have a challenge with no item.
  // {id: 'concert-week', name: 'Concert Week', emoji: '🎻', start: '2027-05-03', end: '2027-05-07', colors: ['yellow', 'purple'], deco: 'music', jingle: 'event-miosm-jingle',
  //  gift: 'plate:concertweek',
  //  ladder: [
  //    {do: 'days', n: 2},
  //    {do: 'stars', n: 10},
  //    {do: 'levels', n: 5},
  //  ]},
];

/* ======================== the engine (no need to edit below) ========================
     Arcade.Seasons.active()          the event running today: {ev, from, to, key, daysLeft, preview} or null
     Arcade.Seasons.steps(occ)        the ladder with progress: [{i, do, n, have, done, owned, item, label}]
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
   PREVIEW (testing): ?season=<id> shows that event today (banner, panel, decorations, items) whatever the date. Its
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
  /** every item an event gives: [{key, field, id, part, gift, step}] */
  function itemsOf(ev) {
    const out = [];
    const add = (key, gift, step) => { if (!key) return; const [field, id] = key.split(':'); out.push({key, field, id, part: partOf(key), gift, step}); };
    add(ev.gift, true, -1);
    (ev.ladder || []).forEach((s, i) => add(s.item, false, i));
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
  const LABEL = {stars: n => `Earn ${n} ★`, levels: n => `Clear ${n} level${n === 1 ? '' : 's'}`, games: n => `Play ${n} different games`,
    endless: n => `Score ${n} in any Endless mode`, days: n => `Play on ${n} different days`};
  const label = s => (LABEL[s.do] || (() => 'Keep playing'))(s.n);
  function steps(o) {
    const p = progress(o);
    return (o.ev.ladder || []).map((s, i) => {
      const have = Math.min(s.n, p[s.do] || 0);
      return {i, do: s.do, n: s.n, have, done: have >= s.n, owned: s.item ? owned(s.item) : have >= s.n, item: s.item || null, part: s.item ? partOf(s.item) : null, label: label(s)};
    });
  }
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
      steps(o).forEach(s => { if (s.done && s.item && giveItem(s.item)) out.push(s.item); });
    });
    return out;
  }
  /** a locked event item's words */
  function requirement(key) {
    const ev = eventOf(key);
    if (!ev) return 'A seasonal event item';
    const o = active(), it = itemsOf(ev).find(x => x.key === key);
    if (o && o.ev === ev) return it.gift ? `${ev.name} free gift: claim it in the lobby!` : `${ev.name}: ${label(ev.ladder[it.step])}`;
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

  A.Seasons = {list: LIST, today, dateKey, occurrence, occurrences, active, nextStart, itemsOf, eventOf, partOf, progress, steps, label, claimed, claim, check,
    requirement, owned, when, get preview() { return !!previewId(); },
    /** a preview's UNLOCKED! cards are remembered in this tab only */
    previewSeen: key => !!(previewId() && (pmem().seen || {})[key]),
    markPreviewSeen(keys) { if (!previewId() || !keys.length) return; const m = pmem(); m.seen = m.seen || {}; keys.forEach(k => { m.seen[k] = true; }); psave(m); },
    /** tests: forget this tab's preview claims */
    _resetPreview() { try { sessionStorage.removeItem(PKEY); } catch (e) { /* fine */ } }};
})(window.Arcade);
