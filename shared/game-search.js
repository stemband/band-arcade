/* FIND A GAME: the arcade floor's search (index.html; docs/engine/page-flow.md, FIND A GAME). The top bar's SEARCH button
   (#searchBtn, on the lobby, in a zone and in ARCADE VIEW) or the "/" key opens a panel: a search field and the games
   that match, best first. Each result: the marquee still, the name, a NEW badge (Arcade.isNewGame), the skill and the
   zones; a tap opens the game the same way the lobby does (fit panel, Select Player, its START sound). TUNE UP's own
   parts (games.js `tools`) are results too.
   WHAT IS SEARCHED (shared/games.js): the name, `keywords`, `skill`, the zone names and `blurb`, in that order of
   weight. Every typed word must match something: the start of a word ("scal" → scales), a word run together
   ("sightreading" = "sight reading") or a near spelling (one letter wrong in 4–6 letters, two in 7 or more: "rudament",
   "timpany"). Nothing typed = a few starting words to tap and every game A–Z.
     Arcade.GameSearch.find(text)            → [{g, tool?, name, score}] (tests and the panel)
     Arcade.GameSearch.mount({button, onGame(g), onTool(g, tool)})   once, on the floor page (arcade.js)
     Arcade.GameSearch.open(text?) / close() / isOpen()
   Nothing typed here is saved or sent anywhere (THE PRIVACY RULE, CLAUDE.md). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  /* ---------- the words ---------- */
  /** lowercase letters and numbers only: accents off, ♭ = b, ♯ = sharp, & = and, everything else a space */
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/♭/g, 'b').replace(/♯/g, ' sharp').replace(/&/g, ' and ').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const words = s => norm(s).split(' ').filter(Boolean);
  /** the edit distance between a and b, stopping early once it passes max */
  function near(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({length: b.length + 1}, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let low = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (cur[j] < low) low = cur[j];
      }
      if (low > max) return max + 1;
      prev = cur;
    }
    return prev[b.length];
  }
  const slack = t => t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0;   // spelling mistakes forgiven

  /* the fields searched, heaviest first */
  const WEIGHT = {name: 100, keywords: 60, skill: 50, zones: 30, blurb: 12};
  /** everything there is to find: every floor game (no demo-only ones: Arcade.GAMES), and Tune Up with its tools */
  function entries() {
    const list = [];
    (A.GAMES || []).forEach(g => {
      const zones = (A.ZONES || []).filter(z => A.inZone && A.inZone(g, z)).map(z => z.name);   // + New Games, No Instrument Needed
      list.push({g, name: g.tool ? 'Tune Up' : g.name, fields: {
        name: (g.tool ? 'Tune Up ' : '') + g.name, keywords: (g.keywords || []).join(' , '), skill: g.skill || '', zones: zones.join(' , '), blurb: g.blurb || ''}});
      if (g.tool) (g.tools || []).forEach(t => list.push({g, tool: t.tool, name: 'Tune Up: ' + t.name, fields: {
        name: 'Tune Up ' + t.name, keywords: (t.keywords || []).join(' , '), skill: g.skill || '', zones: '', blurb: ''}}));
    });
    list.forEach(e => {
      e.idx = {};
      for (const k in e.fields) {
        const ws = words(e.fields[k]);
        // each comma-separated phrase run together too ("sight reading" → "sightreading"), and the whole field
        const joined = String(e.fields[k]).split(',').map(p => words(p).join('')).filter(Boolean);
        e.idx[k] = {ws, joined, all: ws.join('')};
      }
    });
    return list;
  }
  let cache = null, cacheFor = null;
  const index = () => { if (!cache || cacheFor !== A.GAMES) { cache = entries(); cacheFor = A.GAMES; } return cache; };

  /** how well one typed word t matches one field (0 = not at all) */
  function fieldScore(t, f, w) {
    let best = 0;
    for (const x of f.ws) {
      if (x === t) return w;                                              // the whole word
      if (x.startsWith(t) && (t.length >= 2 || w === WEIGHT.name)) best = Math.max(best, w * (0.75 + 0.2 * t.length / x.length));
      else if (x.length >= 4 && t.startsWith(x) && t.length - x.length <= 2) best = Math.max(best, w * 0.8);   // "scales" → Scale
    }
    if (best) return best;
    if (t.length >= 4 && f.joined.some(p => p.startsWith(t) || (p.length >= 4 && t.startsWith(p)))) return w * 0.75;   // run together
    if (t.length >= 5 && f.all.includes(t)) return w * 0.6;
    const s = slack(t);
    if (s) for (const x of f.ws) {
      if (x.length < 4) continue;
      const d = near(t, x.slice(0, Math.max(t.length, Math.min(x.length, t.length + s))), s);   // a near spelling (also of a word's start)
      if (d <= s) best = Math.max(best, w * (d === 1 ? 0.5 : 0.35));
    }
    return best;
  }
  /** the games that match text, best first: [{g, tool, name, score}] */
  function find(text) {
    const q = words(text);
    if (!q.length) return [];
    const phrase = q.join('');
    const out = [];
    for (const e of index()) {
      let total = 0, ok = true;
      for (const t of q) {
        let best = 0;
        for (const k in WEIGHT) best = Math.max(best, fieldScore(t, e.idx[k], WEIGHT[k]));
        if (!best) { ok = false; break; }
        total += best;
      }
      if (!ok) continue;
      if (e.idx.name.all.startsWith(phrase)) total += q.length > 1 ? 80 : 10;            // the start of the name (word for word)
      else if (q.length > 1 && (e.idx.keywords.joined.includes(phrase) || e.idx.skill.all === phrase)) total += 40;
      if (e.tool && !q.some(t => fieldScore(t, e.idx.name, 1) || fieldScore(t, e.idx.keywords, 1))) continue;   // a tool: only for its own words
      out.push({g: e.g, tool: e.tool, name: e.name, score: Math.round(total)});
    }
    return out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  /* ---------- the panel ---------- */
  const SUGGEST = ['Sight-reading', 'Scales', 'Rhythm', 'Tuning', 'Drums', 'Note names', 'By ear', '2 players'];
  const ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  let ov = null, input = null, list = null, count = null, tryRow = null, opts = {}, shown = false, lastText = '';
  const $ = id => document.getElementById(id);

  function build() {
    ov = document.createElement('div');
    ov.className = 'overlay gs-overlay';
    ov.id = 'gameSearch';
    ov.hidden = true;
    ov.innerHTML = `<div class="panel gs-panel" role="dialog" aria-modal="true" aria-labelledby="gsTitle">` +
      `<div class="gs-head"><h2 class="ui-title gs-title" id="gsTitle">Find a game</h2>` +
      `<button type="button" class="gs-close" id="gsClose" aria-label="Close">${CLOSE}</button></div>` +
      `<label class="gs-field"><span class="sr">Search the games</span>${ICON}` +
      `<input type="search" id="gsInput" placeholder="Game, skill or instrument" autocomplete="off" autocapitalize="off" ` +
      `autocorrect="off" spellcheck="false" enterkeyhint="go" aria-controls="gsList" aria-describedby="gsCount"></label>` +
      `<div class="gs-try" id="gsTry" role="group" aria-label="Try searching"><span class="ui-label">Try</span>` +
      SUGGEST.map(s => `<button type="button" class="gs-chip">${esc(s)}</button>`).join('') + `</div>` +
      `<p class="gs-count" id="gsCount" role="status"></p>` +
      `<ul class="gs-list" id="gsList" aria-label="Games"></ul></div>`;
    document.body.appendChild(ov);
    input = $('gsInput'); list = $('gsList'); count = $('gsCount'); tryRow = $('gsTry');
    input.addEventListener('input', () => draw(input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const b = list.querySelector('.gs-item'); if (b && input.value.trim()) b.click(); }
      else if (e.key === 'ArrowDown') { const b = list.querySelector('.gs-item'); if (b) { e.preventDefault(); b.focus(); } }
    });
    list.addEventListener('keydown', e => {                       // ↑/↓ between the results; ↑ from the first: the field
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const b = [...list.querySelectorAll('.gs-item')], i = b.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      if (e.key === 'ArrowUp' && i === 0) input.focus(); else b[Math.max(0, Math.min(b.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))].focus();
    });
    list.addEventListener('click', e => { const b = e.target.closest('.gs-item'); if (b) pick(b); });
    tryRow.addEventListener('click', e => {
      const b = e.target.closest('.gs-chip'); if (!b) return;
      input.value = b.textContent; draw(input.value); input.focus();
      if (A.Sfx) A.Sfx.event('ui-toggle');
    });
    $('gsClose').addEventListener('click', () => close());
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
  }

  function row(r) {
    const g = r.g, tags = [];
    if (!r.tool && A.isNewGame && A.isNewGame(g)) tags.push('<span class="badge b-new">New</span>');
    if (!r.tool && g.players === 2) tags.push('<span class="badge b-2p">2P</span>');
    const zones = r.tool ? [] : A.zonesOf(g);
    const f = r.tool || !A.gameFit ? {ok: true} : A.gameFit(g, A.store && A.store.player);
    const pic = A.Lobby && A.Lobby.thumb ? A.Lobby.thumb(g) : '';
    const say = `${r.name}${g.skill && !r.tool ? ', ' + g.skill : ''}${!r.tool && A.isNewGame && A.isNewGame(g) ? ', new' : ''}${!r.tool && g.players === 2 ? ', 2 players' : ''}${f.ok ? '' : ', ' + f.tag}`;
    return `<li><button type="button" class="gs-item${f.ok ? '' : ' nofit'}" data-game="${esc(g.id)}"${r.tool ? ` data-tool="${esc(r.tool)}"` : ''} ` +
      `style="${zones[0] && A.Lobby ? A.Lobby.zoneStyle(zones[0]) : ''}" aria-label="${esc(say)}">` +
      `<span class="gs-pic">${pic}</span>` +
      `<span class="gs-text"><span class="gs-name">${esc(r.name)}</span>${tags.join('')}` +
      `<span class="gs-skill">${esc(r.tool ? 'Tune Up' : g.skill || '')}</span>` +
      (zones.length ? `<span class="gs-zones">${zones.map(z => `<span class="ztag" style="${A.Lobby.zoneStyle(z)}">${esc(z.name)}</span>`).join('')}</span>` : '') +
      (f.ok ? '' : `<span class="fit-tag">${esc(f.tag)}</span>`) + `</span></button></li>`;
  }
  function draw(text) {
    lastText = text;
    const typed = !!words(text).length;
    tryRow.hidden = typed;
    let rows;
    if (typed) {
      rows = find(text);
      count.textContent = rows.length ? `${rows.length} ${rows.length === 1 ? 'match' : 'matches'}`
        : `No games match "${text.trim()}". Try a skill like rhythm, scales or tuning.`;
      count.classList.toggle('empty', !rows.length);
    } else {                                                           // nothing typed: every game A–Z (Tune Up too)
      rows = (A.GAMES || []).map(g => ({g, name: g.tool ? 'Tune Up' : g.name})).sort((a, b) => a.name.localeCompare(b.name));
      count.textContent = `All ${rows.length} games, A to Z`;
      count.classList.remove('empty');
    }
    list.innerHTML = rows.map(row).join('');
  }
  function pick(b) {
    const g = (A.ALL_GAMES || A.GAMES || []).find(x => x.id === b.dataset.game), tool = b.dataset.tool;
    if (!g) return;
    close({restore: false});
    if (g.tool) { if (opts.onTool) opts.onTool(g, tool); return; }
    if (opts.onGame) opts.onGame(g);
  }

  function open(text) {
    if (!ov) build();
    if (shown) { input.focus(); return; }
    shown = true;
    ov.hidden = false;
    if (opts.button) opts.button.setAttribute('aria-expanded', 'true');
    input.value = text != null ? text : '';
    draw(input.value);
    ov.scrollTop = 0;
    if (A.UI && A.UI.layer) A.UI.layer.open(ov, {min: 60, trap: true, onEsc: () => close(), focus: input});
    else input.focus();
    if (A.Sfx) A.Sfx.event('ui-toggle');
  }
  function close({restore = true} = {}) {
    if (!shown) return;
    shown = false;
    ov.hidden = true;
    if (opts.button) opts.button.setAttribute('aria-expanded', 'false');
    if (A.UI && A.UI.layer) A.UI.layer.close(ov, {restore});
    if (A.Lobby && A.Lobby.queue && A.Lobby.queue.kick) A.Lobby.queue.kick();   // anything the lobby held back meanwhile
  }
  function mount(o) {
    opts = o || {};
    if (opts.button) {
      opts.button.setAttribute('aria-haspopup', 'dialog');
      opts.button.setAttribute('aria-expanded', 'false');
      opts.button.addEventListener('click', () => (shown ? close() : open()));
    }
  }

  A.GameSearch = {find, mount, open, close, isOpen: () => shown, norm,
    state: () => ({open: shown, text: lastText, results: shown && list ? [...list.querySelectorAll('.gs-item')].map(b => b.dataset.tool ? b.dataset.game + ':' + b.dataset.tool : b.dataset.game) : []})};
})(window.Arcade);
