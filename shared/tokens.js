/* Band Arcade: ARCADE TOKENS, ONE WALLET, TWO COUNTERS.
   The tokens a student earns (5 a star) are spent at TWO counters that share this one wallet:
     THE PRIZE COUNTER  the arcade's own (the lobby's PRIZE COUNTER sign, the avatar badge's menu, the 3D floor's
                        counter; shared/prizes.js draws it)
     THE TOKEN BOOTH    inside Arcade Quest (Token Booth Terry, arcade-quest/engine/talk.js), which keeps its own
                        exclusives: the CHARMS (Arcade Quest only) and the MANOR COLLECTION (below)
   This module is the ONLY thing that reads or writes the wallet. Nothing can be counted twice: turning stars in at
   either counter uses the same `converted` record, and buying at either counter uses the same balance and the same
   Arcade.store.ownItem (an item bought at one shows OWNED at the other).

   WHERE IT'S SAVED: where it always was, in the Arcade Quest save (store.gameData('arcade-quest').save): `tokens`,
   `converted` ({'m:<member>' | 'g:<game>': stars already turned in}) and `convertedLeft` (a save code's turned-in
   stars, spread over this device's star sources the next time they're counted). So old balances, every QUEST CODE and
   every Arcade Backup Code keep working. A device that never opened Arcade Quest gets ONLY those wallet fields
   ({wallet: true, tokens, converted}: no game progress); Arcade Quest's save.js turns that into a full save the first
   time the game opens, keeping the tokens.

   STAR SOURCES (starSources()): the saved instrument's stars (store.allStars(member): every game, every mode), plus
   the games with a fixed player (Chime Heist, Ancient Ninja Scrolls…) that instrument's groups don't already cover.

   WHAT'S SOLD: every avatar item with unlock {shop: price} (shared/avatar-parts.js), at BOTH counters for the same
   price, EXCEPT the MANOR COLLECTION (unlock.booth === 'quest', the list MANOR_COLLECTION in avatar-parts.js): sold
   ONLY at Arcade Quest's Token Booth; the Prize Counter shows them behind glass ("Only at the Token Booth in Arcade
   Quest!"), try-on only. Never sold anywhere: seasonal event items and Band Ninja gear (they have no {shop}).

   THE PRIZE OF THE WEEK: one prize a week (weeks start on Monday, like the leaderboard), the SAME on every device:
   picked by the week's number from the items sold at BOTH counters, going through all of them (a shuffled order, one
   shuffle per round) before any comes back. It costs featuredDiscount less (rounded to the nearest 5) at both counters.

   THE WISH LIST (the Prize Counter's ☆): one wished prize, gameData('prizes').wish; the lobby shows how close it is,
   counting the stars not turned in yet as "waiting at the counter".

     Arcade.Tokens.balance()                 the tokens in the wallet
     Arcade.Tokens.add(n) / spend(n)         (battle rewards, Rusty's shop, charms); spend -> false when short
     Arcade.Tokens.starSources()             [{key, label, stars, done, fresh}]
     Arcade.Tokens.freshStars()              stars not turned in yet;  waiting() = freshStars() × RATE
     Arcade.Tokens.turnIn()                  -> {stars, tokens} (0 when there's nothing new)
     Arcade.Tokens.catalog()                 every item for tokens: {key, field, id, name, full, questOnly}
     Arcade.Tokens.price(key)                -> {price, full, weekly} (the Prize of the Week's discount included)
     Arcade.Tokens.canBuy(key, {counter})    -> {ok, why, text, need, price}; counter 'prize' (default) | 'quest'
     Arcade.Tokens.buy(key, {counter})       -> the same + the item is owned (the caller decides whether to wear it)
     Arcade.Tokens.owned(key)                bought, or open anyway (?unlockall)
     Arcade.Tokens.weekly(date)              -> {itemId, key, item, price, full, endsAt, daysLeft} (null: nothing to sell)
     Arcade.Tokens.wish() / setWish(key)     the wished prize's key (null = none)
     Arcade.Tokens.wishProgress()            -> {key, name, price, have, waiting, owned, affordable, pct, pctWaiting}
     Arcade.Tokens.resultLine()              "+3 ★ = 15 tokens at the Prize Counter" when stars were earned since the
                                             last check (every results screen: shared/ui-kit.js), else ''
   Every change fires window 'arcade:tokens' (the lobby's sign, the badges and the counters redraw on it).
   Loaded on EVERY page (shared/version.js writes its tag with the UI kit's), before storage.js: it reads nothing until
   it's called. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";

  /* ================= THE SETTINGS (Mat edits these) ================= */
  const SETTINGS = {
    RATE: 5,                  // Arcade Tokens for each star turned in
    featuredDiscount: 0.2,    // the Prize of the Week: 0.2 = 20 % off (the price is rounded to the nearest 5)
  };
  /* ================================================================== */

  const GAME = 'arcade-quest';
  const DAY = 864e5;
  const st = () => A.store;
  const round5 = n => Math.round(n / 5) * 5;
  const changed = () => { try { dispatchEvent(new CustomEvent('arcade:tokens')); } catch (e) { /* old browsers */ } };

  /* ---------- the wallet itself ---------- */
  function wallet() {
    const d = st().gameData(GAME);
    if (!d.save || typeof d.save !== 'object') d.save = {wallet: true, tokens: 0, converted: {}};
    const s = d.save;
    if (!(typeof s.tokens === 'number' && s.tokens >= 0)) s.tokens = Math.max(0, Math.round(+s.tokens || 0));
    if (!s.converted || typeof s.converted !== 'object') s.converted = {};
    return s;
  }
  const write = () => { st().saveGameData(GAME); changed(); };
  const balance = () => (A.store ? wallet().tokens : 0);
  function add(n) {
    n = Math.max(0, Math.round(+n || 0));
    if (!n) return balance();
    wallet().tokens += n; write();
    return balance();
  }
  function spend(n) {
    n = Math.max(0, Math.round(+n || 0));
    const s = wallet();
    if (s.tokens < n) return false;
    s.tokens -= n; write();
    return true;
  }

  /** a save code loaded (Arcade Quest's ENTER SAVE CODE): its balance, and its turned-in stars to spread over this
      device's sources (convertedLeft) */
  function restore({tokens = 0, convertedLeft = 0} = {}) {
    const s = wallet();
    s.tokens = Math.max(0, Math.round(+tokens || 0)); s.converted = {};
    if (convertedLeft > 0) s.convertedLeft = Math.round(convertedLeft); else delete s.convertedLeft;
    write();
  }

  /* ---------- turning stars in ---------- */
  function starSources() {
    if (!A.store) return [];
    const m = A.currentMember ? A.currentMember() : null, list = [];
    const groups = m && A.groupsOf ? A.groupsOf(m.id).map(g => g.id) : [];
    if (m) list.push({key: 'm:' + m.id, label: `${m.name} stars`, stars: st().allStars(m.id)});
    (A.ALL_GAMES || A.GAMES || []).forEach(g => {
      if (!g.player || !g.maxStars || groups.includes(g.player)) return;           // bells already count Chime Heist
      list.push({key: 'g:' + g.id, label: g.name, stars: st().allStars(g.player, g.id)});
    });
    const s = wallet(), conv = s.converted;
    if (s.convertedLeft > 0) {                     // a save code's turned-in stars: spread over this device's sources
      list.forEach(x => { const n = Math.min(s.convertedLeft, Math.max(0, x.stars - (conv[x.key] || 0))); conv[x.key] = (conv[x.key] || 0) + n; s.convertedLeft -= n; });
      st().saveGameData(GAME);
    }
    list.forEach(x => { x.done = Math.min(x.stars, conv[x.key] || 0); x.fresh = Math.max(0, x.stars - (conv[x.key] || 0)); });
    return list;
  }
  const freshStars = () => starSources().reduce((n, x) => n + x.fresh, 0);
  const waiting = () => freshStars() * SETTINGS.RATE;
  function turnIn() {
    const src = starSources(), stars = src.reduce((n, x) => n + x.fresh, 0);
    if (!stars) return {stars: 0, tokens: 0};
    const s = wallet();
    src.forEach(x => { s.converted[x.key] = Math.max(s.converted[x.key] || 0, x.stars); });
    s.tokens += stars * SETTINGS.RATE;
    write(); seen = freshStars();
    return {stars, tokens: stars * SETTINGS.RATE};
  }

  /* ---------- what's for sale ---------- */
  function catalog() {
    const AV = A.Avatar;
    if (!AV || !AV.items) return [];
    return AV.items().filter(it => it.shop && !it.event && !it.official)
      .map(it => ({key: it.key, field: it.field, id: it.id, name: it.name, full: it.shop, questOnly: it.unlock.booth === 'quest'}));
  }
  const item = key => catalog().find(it => it.key === key) || null;
  function owned(key) {
    const it = item(key);
    if (!it || !A.store) return false;
    return !!st().ownedItems[key] || !!(A.Avatar && A.Avatar.isUnlocked(it.field, it.id));
  }

  /* ---------- THE PRIZE OF THE WEEK ---------- */
  const today = () => (A.store && A.store.today ? A.store.today() : new Date());
  const mondayOf = d => { const m = new Date(d.getFullYear(), d.getMonth(), d.getDate()); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
  // weeks since Monday 1 January 2024, counted by calendar date (the same week number in every time zone)
  const weekNo = d => { const m = mondayOf(d); return Math.round((Date.UTC(m.getFullYear(), m.getMonth(), m.getDate()) - Date.UTC(2024, 0, 1)) / (7 * DAY)); };
  function rng(seed) {                               // mulberry32: the same shuffle on every device
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffled(list, round) {
    const out = list.slice(), r = rng(0x9E3779B1 ^ Math.imul(round + 7, 2654435761));
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  /** one shuffle per round through the list; a round never starts with the prize that ended the round before */
  function orderFor(list, round) {
    const o = shuffled(list, round);
    if (list.length > 2 && o[0] === shuffled(list, round - 1)[list.length - 1]) [o[0], o[1]] = [o[1], o[0]];
    return o;
  }
  function weekly(date = today()) {
    const pool = catalog().filter(it => !it.questOnly).map(it => it.key);
    if (!pool.length) return null;
    const w = weekNo(date), N = pool.length, round = Math.floor(w / N), pos = ((w % N) + N) % N;
    const key = orderFor(pool, round)[pos], it = item(key), mon = mondayOf(date);
    const end = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 7);
    const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return {itemId: it.id, key, item: it, full: it.full, price: round5(it.full * (1 - SETTINGS.featuredDiscount)), endsAt: end.getTime(),
      daysLeft: Math.max(1, Math.round((end - d0) / DAY)), week: w};
  }
  function price(key) {
    const it = item(key);
    if (!it) return null;
    const w = weekly();
    return w && w.key === key ? {price: w.price, full: it.full, weekly: true} : {price: it.full, full: it.full, weekly: false};
  }

  /* ---------- buying ---------- */
  const QUEST_ONLY_TEXT = 'Only at the Token Booth in Arcade Quest!';
  function canBuy(key, {counter = 'prize'} = {}) {
    const it = item(key);
    if (!it) return {ok: false, why: 'unknown', text: "That isn't sold for tokens."};
    const p = price(key).price;
    if (it.questOnly && counter !== 'quest') return {ok: false, why: 'questOnly', text: QUEST_ONLY_TEXT, price: p};
    if (owned(key)) return {ok: false, why: 'owned', text: `You already own the ${it.name}.`, price: p};
    const have = balance();
    if (have < p) return {ok: false, why: 'short', need: p - have, text: `Need ${p - have} more tokens`, price: p};
    return {ok: true, why: '', text: '', price: p};
  }
  function buy(key, opts = {}) {
    const c = canBuy(key, opts);
    if (!c.ok) return c;
    if (!spend(c.price)) return {ok: false, why: 'short', need: c.price - balance(), text: `Need ${c.price - balance()} more tokens`, price: c.price};
    st().ownItem(key);
    if (wish() === key) setWish(null);            // a wish come true
    changed();
    return {ok: true, price: c.price, item: item(key)};
  }

  /* ---------- the wish list ---------- */
  const PRIZES = 'prizes';
  function wish() {
    if (!A.store) return null;
    const k = st().gameData(PRIZES).wish || null;
    return k && item(k) ? k : null;
  }
  function setWish(key) {
    const d = st().gameData(PRIZES);
    if (key && item(key)) d.wish = key; else delete d.wish;
    st().saveGameData(PRIZES); changed();
    return wish();
  }
  function wishProgress() {
    const key = wish();
    if (!key) return null;
    const it = item(key), p = price(key).price, have = balance(), wait = waiting();
    return {key, name: it.name, price: p, have, waiting: wait, owned: owned(key), questOnly: it.questOnly, affordable: have >= p,
      pct: Math.min(100, have / p * 100), pctWaiting: Math.min(100 - Math.min(100, have / p * 100), wait / p * 100)};
  }

  /* ---------- the results screens' line ---------- */
  let seen = null;
  function resultLine() {
    if (!A.store || !A.Avatar) return '';
    const now = freshStars(), was = seen;
    seen = now;
    const n = was == null ? 0 : now - was;
    return n > 0 ? `+${n} ★ = ${n * SETTINGS.RATE} tokens at the Prize Counter` : '';
  }
  // the stars not turned in yet when the page opened (a results screen then shows only what this page earned)
  document.addEventListener('DOMContentLoaded', () => { try { if (A.store && A.Avatar) seen = freshStars(); } catch (e) { /* a page without games.js */ } });

  A.Tokens = {SETTINGS, get RATE() { return SETTINGS.RATE; }, QUEST_ONLY_TEXT, balance, add, spend, restore, starSources, freshStars, waiting, turnIn,
    catalog, item, owned, price, canBuy, buy, weekly, weekNo, round5, wish, setWish, wishProgress, resultLine, wallet};
})(window.Arcade);
