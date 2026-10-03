/* THE LEADERBOARD SCREEN (the floor page; the top bar's trophy button). The data and every network call are in
   shared/leaderboard.js; this file only draws. A full screen in the arcade's look:
     - the first time: "What grade are you in?" 6 / 7 / 8 (remembered; changeable in MY SETTINGS below the board)
     - the grade switch (the student's own grade first; the other grades can be viewed too)
     - tabs ⭐ STARS THIS WEEK · 📈 MOST IMPROVED · 🔥 PRACTICE STREAK · ♾️ ENDLESS (+ a game picker)
     - the top 10: rank, the avatar name (from its word NUMBERS; unknown/retired words say "Mystery"), the value;
       #1–3 gold/silver/bronze; this device's own entry highlighted; when it isn't in the top 10, a friendly line with
       this device's own numbers ("You: 12 stars this week. Keep going!")
     - "Resets every Monday · Updated a minute ago" (boards are cached 60 s)
     - MY SETTINGS: the grade and "Show me on the leaderboard" (ON by default; OFF = nothing is ever sent)
     - while a board loads (a cold scoreboard can take 20 s+): "Loading the leaderboard…" with the UI kit's spinner
       (.ui-msg.loading), never an empty screen or the break message
     - the read failed but this device has that grade's last good board: that board + "Couldn't refresh — showing the
       board from 2 hours ago"; nothing saved (or switched off): "Leaderboard is taking a break. Your progress is still
       saved!"
   LAST WEEK'S CHAMPIONS (the board read's `champions`; shared/leaderboard.js WEEKLY CHAMPIONS): a strip of plaques above
   the tabs (board, avatar name, value; this device's one highlighted YOU; none = no strip) and a 🏆 next to anyone on
   this week's boards who was a champion last week (this grade).
   ?teacher: every entry shows its 6-character id (Mat hides a player by pasting it in the Blocked tab of his Sheet),
   and under the board how the last request went (Leaderboard.lastRequest(): "timeout after 25 s", "offline",
   "HTTP 500", "not JSON", "network error (CORS or blocked)", how long it took, tried twice), and under MY SETTINGS this
   device's champion awards, the last weekly check and CHECK CHAMPIONS NOW.
     Arcade.LeaderboardScreen.open() / close() / state() */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const L = () => A.Leaderboard;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const TEACHER = !!(A.params && A.params.has('teacher'));
  const TABS = [
    {id: 'stars', icon: '⭐', name: 'Stars this week', unit: v => `${v} ★`},
    {id: 'improved', icon: '📈', name: 'Most improved', unit: v => `+${v} ★`},
    {id: 'streak', icon: '🔥', name: 'Practice streak', unit: v => `${v} ${+v === 1 ? 'day' : 'days'}`},
    {id: 'endless', icon: '♾️', name: 'Endless', unit: v => `${Number(v).toLocaleString()}`},
  ];
  const gameName = id => ((A.ALL_GAMES || A.GAMES || []).find(g => g.id === id) || {name: id}).name;
  const S = {el: null, grade: null, tab: 'stars', game: null, res: null, loading: false, asking: false, checking: false, sending: false, sendRes: ''};
  const sfx = n => { if (A.Sfx) A.Sfx.event(n); };

  function ago(t) {
    const ms = Date.now() - t;
    if (!(ms >= 0) || ms < 45000) return 'Updated just now';
    const m = Math.round(ms / 60000);
    if (m < 2) return 'Updated a minute ago';
    if (m < 60) return `Updated ${m} minutes ago`;
    const h = Math.round(m / 60);
    return h < 2 ? 'Updated an hour ago' : h < 48 ? `Updated ${h} hours ago` : 'Updated a while ago';
  }
  /** '2 hours ago' (the stale board's line) */
  function agoPlain(t) {
    const ms = Date.now() - t;
    if (!(ms >= 0) || ms < 45000) return 'just now';
    const m = Math.round(ms / 60000);
    if (m < 2) return 'a minute ago';
    if (m < 60) return `${m} minutes ago`;
    const h = Math.round(m / 60);
    if (h < 2) return 'an hour ago';
    if (h < 36) return `${h} hours ago`;
    const d = Math.round(h / 24);
    return d < 2 ? 'yesterday' : `${d} days ago`;
  }
  /** ?teacher: how the last request went */
  function diagLine() {
    const r = L().lastRequest && L().lastRequest();
    if (!r) return 'Last request: none yet.';
    const secs = `${(r.ms / 1000).toFixed(1)} s`, twice = r.tries > 1 ? ', tried twice' : '';
    return r.ok ? `Last request: OK in ${secs}${twice}.` : `Last request failed: ${r.why} (took ${secs}${twice}).`;
  }
  const updatedAt = res => { const u = res && res.data && res.data.updated; const t = typeof u === 'number' ? u : Date.parse(u); return isFinite(t) && t > 0 ? t : res && res.at; };

  function open() {
    if (!L() || !L().available()) return;
    if (!S.el) build();
    const st = L().settings();
    S.grade = S.grade || st.grade;
    S.asking = !st.grade;
    S.el.hidden = false; document.body.classList.add('lb-open');
    if (A.lockScroll) A.lockScroll(true);
    document.addEventListener('keydown', onKey);
    sfx('all-games-open');
    draw();
    if (!S.asking) load();
    const f = S.el.querySelector(S.asking ? '.lb-g' : '.lb-tab[aria-selected="true"]'); if (f) f.focus();
  }
  function close() {
    if (!S.el || S.el.hidden) return;
    S.el.hidden = true; document.body.classList.remove('lb-open');
    if (A.ChampionLobby) A.ChampionLobby.show();              // a CHAMPION card that waited for this screen
    if (A.lockScroll) A.lockScroll(false);
    document.removeEventListener('keydown', onKey);
    sfx('ui-back');
    const b = document.getElementById('lbBtn'); if (b) b.focus();
  }
  const onKey = e => { if (e.key === 'Escape') close(); };
  async function load(fresh) {
    S.loading = true; draw();
    const g = S.grade;
    const res = await L().board(g, {fresh});
    if (g !== S.grade) return;                               // switched while it loaded
    res.grade = g;
    S.res = res; S.loading = false;
    if (res.ok && S.tab === 'endless' && !S.game) S.game = endlessGames(res)[0] || null;
    draw();
  }
  function endlessGames(res) {
    const on = res && res.ok && res.data.boards && res.data.boards.endless ? Object.keys(res.data.boards.endless) : [];
    return L().ENDLESS_GAMES.concat(on.filter(g => !L().ENDLESS_GAMES.includes(g)));
  }

  function build() {
    S.el = document.createElement('section');
    S.el.className = 'lb-view'; S.el.id = 'lbView'; S.el.hidden = true;
    S.el.setAttribute('role', 'dialog'); S.el.setAttribute('aria-modal', 'true'); S.el.setAttribute('aria-labelledby', 'lbTitle');
    document.body.appendChild(S.el);
    S.el.addEventListener('click', e => {
      const t = e.target.closest('[data-act]'); if (!t) return;
      const act = t.dataset.act;
      if (act === 'close') return close();
      if (act === 'pick-grade') { L().setGrade(+t.dataset.g); S.grade = +t.dataset.g; S.asking = false; sfx('player-ready'); draw(); load(); return; }
      if (act === 'grade') { S.grade = +t.dataset.g; sfx('ui-toggle'); load(); return; }
      if (act === 'tab') { S.tab = t.dataset.tab; if (S.tab === 'endless' && !S.game) S.game = endlessGames(S.res)[0]; sfx('ui-toggle'); draw(); return; }
      if (act === 'game') { S.game = t.dataset.game; sfx('ui-toggle'); draw(); return; }
      if (act === 'refresh') { sfx('ui-toggle'); load(true); return; }
      if (act === 'send-now') {                               // ?teacher: flush() now, and say how it went
        S.sending = true; S.sendRes = ''; draw();
        L().flush().then(r => {
          S.sending = false;
          const why = r && r.why ? ` (${r.why})` : '';
          S.sendRes = !r ? 'Done.' : r.sent ? `Sent ${r.sent}. ${r.left} still waiting${why}.` : r.left ? `Nothing sent: ${r.left} still waiting${why}.` : `Nothing was waiting${why}.`;
          draw();
        }, () => { S.sending = false; S.sendRes = 'Something went wrong.'; draw(); });
        return;
      }
      if (act === 'champ-now') {                              // ?teacher: the weekly check now (the card shows when this screen closes)
        S.checking = true; draw();
        L().checkChampion({force: true}).then(() => { S.checking = false; draw(); }, () => { S.checking = false; draw(); });
        return;
      }
      if (act === 'my-grade') { L().setGrade(+t.dataset.g); S.grade = +t.dataset.g; sfx('ui-toggle'); load(); return; }
    });
    S.el.addEventListener('change', e => {
      if (e.target.matches('.lb-on')) { L().setOn(e.target.checked); sfx('ui-toggle'); draw(); }
    });
  }

  function rowsFor() {
    const b = S.res && S.res.ok && S.res.data.boards || {};
    if (S.tab === 'endless') return ((b.endless || {})[S.game] || []);
    return b[S.tab] || [];
  }
  function ownLine(rows) {
    const st = L().settings(), me = L().mine(), tab = TABS.find(t => t.id === S.tab);
    if (!st.on) return `You're not shown on the leaderboard. Turn it on in My settings below.`;
    if (S.grade !== st.grade || rows.slice(0, 10).some(e => L().isMe(e))) return '';
    if (S.tab === 'stars') return me.stars ? `You: ${me.stars} ${me.stars === 1 ? 'star' : 'stars'} this week. Keep going!` : 'Earn a new star this week to get on this board!';
    if (S.tab === 'improved') return 'Earn more stars than last week to climb this board!';
    if (S.tab === 'streak') return me.streak ? `You: ${me.streak} school ${me.streak === 1 ? 'day' : 'days'} in a row. Keep going!` : 'Play on school days in a row to build a streak!';
    const best = me.endless[S.game];
    return best ? `You: best ${tab.unit(best)} this week in ${gameName(S.game)}. Keep going!` : `Play ${gameName(S.game)}'s Endless mode to get on this board!`;
  }
  /* LAST WEEK'S CHAMPIONS (the board read carries `champions`, shared/leaderboard.js WEEKLY CHAMPIONS): one plaque per
     board with a champion (everyone tied for 1st), endless ones under their game's name; this device's plaque gets the
     YOU highlight; no champions at all = no strip */
  const champsOf = res => (res && res.ok && res.data && res.data.champions) || null;
  function champStrip(res) {
    const ch = champsOf(res);
    if (!ch) return '';
    const plaques = [];
    TABS.filter(t => t.id !== 'endless').forEach(t => (ch[t.id] || []).forEach(e => plaques.push({t, e, label: L().boardName(t.id)})));
    Object.keys(ch.endless || {}).forEach(g => (ch.endless[g] || []).forEach(e => plaques.push({t: TABS[3], e, label: L().boardName('endless:' + g)})));
    if (!plaques.length) return '';
    return `<section class="lb-champs" aria-labelledby="lbChampsT"><h3 class="lb-champs-t" id="lbChampsT"><span aria-hidden="true">🏆</span> Last week's champions</h3><ul class="lb-plaques">` +
      plaques.map(({t, e, label}) => {
        const me = L().isMe(e), name = A.Avatar && A.Avatar.nameFromNumbers ? A.Avatar.nameFromNumbers(e.name) : 'Mystery Player';
        return `<li class="lb-plaque${me ? ' me' : ''}"><span class="lb-pl-board"><span aria-hidden="true">${t.icon}</span> ${esc(label)}</span>` +
          `<span class="lb-pl-name">${esc(name)}${me ? ' <b class="lb-you">YOU</b>' : ''}${TEACHER ? ` <code class="lb-id">${esc(e.id || '')}</code>` : ''}</span>` +
          `<span class="lb-pl-val">${esc(t.unit(e.value))}</span></li>`;
      }).join('') + `</ul></section>`;
  }
  /** the ids that were a champion last week (this grade): a 🏆 on this week's boards, so the class sees who's defending */
  function defending(res) {
    const ch = champsOf(res), ids = new Set();
    if (!ch) return ids;
    ['stars', 'improved', 'streak'].forEach(b => (ch[b] || []).forEach(e => e && e.id && ids.add(e.id)));
    Object.values(ch.endless || {}).forEach(l => (l || []).forEach(e => e && e.id && ids.add(e.id)));
    return ids;
  }
  /** ?teacher: this device's awards and how the last weekly check went, + CHECK CHAMPIONS NOW */
  function champTeacher() {
    const c = L().champState ? L().champState() : null;
    if (!c) return '';
    const list = Object.keys(c.awards).sort().reverse().flatMap(w => Object.keys(c.awards[w]).map(b =>
      `<li>Week of ${esc(L().weekName(w))}: ${esc(L().boardName(b))} (${esc(L().boardValue(b, c.awards[w][b].value))})${c.awards[w][b].claimed ? ' · claimed' : ' · waiting'}</li>`));
    const lastLine = !c.last ? 'none yet' : c.last.ok ? `OK${c.last.found ? `, ${c.last.found} found` : ', nothing found'}` : `failed: ${c.last.why}`;
    return `<section class="lb-champ-teach" aria-label="Weekly champions (teacher)"><h3>Weekly champions (teacher)</h3>` +
      `<p class="lb-note">This device: ID <code>${esc(c.id || 'none yet')}</code> · checked week: ${esc(c.checkedWeek || 'not yet')} (last week = ${esc(c.lastWeek)}) · last check: ${esc(lastLine)}</p>` +
      (list.length ? `<ul class="lb-note lb-awards">${list.join('')}</ul>` : `<p class="lb-note">No awards on this device.</p>`) +
      `<button type="button" class="btn btn-secondary btn-small lb-champ-now" data-act="champ-now"${S.checking ? ' disabled' : ''}>${S.checking ? 'Checking…' : 'Check champions now'}</button></section>`;
  }
  /** this device has stars this week but isn't on its grade's stars board (where those stars would put it), and the
      board isn't stale: a calm line, never an error ("Still sending…" while events wait, else ask Mr. Graham) */
  function missingLine(shown) {
    const st = L().settings();
    if (!shown || !shown.ok || shown.stale || !st.on || !st.grade || S.grade !== st.grade) return '';
    const n = L().mine().stars, rows = ((shown.data && shown.data.boards) || {}).stars || [];
    if (!(n > 0) || rows.some(e => L().isMe(e))) return '';
    const lastVal = rows.length ? +rows[rows.length - 1].value || 0 : 0;
    if (rows.length >= 10 && n < lastVal) return '';            // below a full top 10: that's the "Keep going!" line's job
    const waiting = L().queue().length + (L().heldCount ? L().heldCount() : 0);
    return waiting ? `Your stars this week: ${n}. Still sending…` : 'Not showing up? Ask Mr. Graham to check.';
  }
  /** ?teacher: this device's ROOM CHECK and Classroom mode setting (shared/room-check.js, shared/pitch.js ROOM; the
      floor page has no microphone, so "on right now" shows in a game's Settings with ?teacher) */
  function micLine() {
    const m = (A.store.peekGameData && A.store.peekGameData('mic')) || {}, c = m.room, t = A.TEACHER && A.TEACHER.CLASSROOM_MODE;
    const mode = t === 'on' || t === 'off' ? `${t} (teacher setting)` : `${m.classroom || 'auto'} (this device)`;
    return `<li>Room check: <b>${c ? `${esc(c.ratio)}× louder than the room` : 'none'}</b>${c ? ` · ${esc(c.at)} · ${esc(c.member || '')}` : ''} · Classroom mode: ${esc(mode)}</li>`;
  }
  /** ?teacher: this device's leaderboard state + SEND NOW */
  function deviceDiag() {
    const d = L().diag ? L().diag() : null;
    if (!d) return '';
    const when = t => t ? `${agoPlain(t)} (${new Date(t).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})})` : 'never';
    const lr = d.last ? (d.last.ok ? `OK in ${(d.last.ms / 1000).toFixed(1)} s, ${agoPlain(d.last.at)}` : `failed: ${d.last.why}, ${agoPlain(d.last.at)}`) : 'none yet';
    return `<section class="lb-dev" aria-label="This device (teacher)"><h3>This device (teacher)</h3><ul class="lb-note lb-dev-list">` +
      `<li>Grade: <b>${d.grade ? esc(d.grade) : 'not chosen'}</b></li>` +
      `<li>Show me on the leaderboard: <b>${d.on ? 'on' : 'off'}</b>${!d.available ? ' (no scoreboard address)' : ''}${d.demo ? ' (?demo: nothing is sent)' : ''}</li>` +
      `<li>ID: <code>${esc(d.id || 'none yet')}</code></li>` +
      `<li>Waiting: <b>${d.queue}</b> in the queue, <b>${d.held}</b> held (no grade yet)</li>` +
      `<li>Stars this week on this device: <b>${d.weekStars}</b></li>` +
      `<li>Last request: ${esc(lr)}</li>` +
      `<li>Last event accepted: ${esc(when(d.lastOk))}${d.lastRefused ? ` · last refused: ${esc(d.lastRefused.why)}, ${esc(agoPlain(d.lastRefused.at))}` : ''}</li>` +
      (d.regrade ? `<li>Grade changed ${esc(d.regrade.from)} → ${esc(d.regrade.to)} on ${esc(d.regrade.day)}</li>` : '') +
      `<li>Sent in the last hour: ${d.sentLastHour} (at most ${L().PER_HOUR})</li>` + micLine() + `</ul>` +
      `<button type="button" class="btn btn-secondary btn-small lb-send-now" data-act="send-now"${S.sending ? ' disabled' : ''}>${S.sending ? 'Sending…' : 'Send now'}</button>` +
      (S.sendRes ? `<p class="lb-note lb-send-res" role="status">${esc(S.sendRes)}</p>` : '') + `</section>`;
  }
  function draw() {
    if (!S.el) return;
    const st = L().settings();
    // 🏆 LEADERBOARD 🏆, centered on the whole panel (a 3-column header: an empty column as wide as ✕ on the left);
    // the trophies are aria-hidden, so the heading still reads "Leaderboard"
    const head = `<header class="lb-head"><span class="lb-head-pad" aria-hidden="true"></span><h2 id="lbTitle" class="lb-title">` +
      `<span class="lb-trophy" aria-hidden="true">🏆</span><span class="lb-t-word">Leaderboard</span><span class="lb-trophy lb-trophy-r" aria-hidden="true">🏆</span></h2>` +
      `<button type="button" class="lb-x" data-act="close" aria-label="Close the leaderboard">✕</button></header>`;
    if (S.asking) {
      S.el.innerHTML = `<div class="lb-in">${head}<div class="lb-ask"><h3>What grade are you in?</h3><div class="lb-grades">` +
        L().GRADES.map(g => `<button type="button" class="lb-g" data-act="pick-grade" data-g="${g}">${g}</button>`).join('') + `</div>` +
        `<label class="lb-mrow lb-tog"><input type="checkbox" class="lb-on"${st.on ? ' checked' : ''}> <span>Show me on the leaderboard</span></label>` +
        `<p class="lb-note">Only your avatar name and scores are shared. Never your real name.</p></div></div>`;
      return;
    }
    const rows = rowsFor(), tab = TABS.find(t => t.id === S.tab);
    const gradeSw = `<div class="lb-gradesw" role="group" aria-label="Grade">` + L().GRADES.map(g =>
      `<button type="button" class="lb-gs${g === S.grade ? ' on' : ''}" data-act="grade" data-g="${g}" aria-pressed="${g === S.grade}">Grade ${g}${g === st.grade ? '<small> · you</small>' : ''}</button>`).join('') + `</div>`;
    const tabs = `<div class="lb-tabs" role="tablist">` + TABS.map(t =>
      `<button type="button" role="tab" class="lb-tab" data-act="tab" data-tab="${t.id}" aria-selected="${t.id === S.tab}"><span aria-hidden="true">${t.icon}</span> ${esc(t.name)}</button>`).join('') + `</div>`;
    const games = S.tab === 'endless' ? `<div class="lb-games" role="group" aria-label="Game">` + endlessGames(S.res).map(g =>
      `<button type="button" class="lb-gm${g === S.game ? ' on' : ''}" data-act="game" data-game="${esc(g)}" aria-pressed="${g === S.game}">${esc(gameName(g))}</button>`).join('') + `</div>` : '';
    let body;
    const shown = S.res && S.res.grade === S.grade ? S.res : null;       // (another grade's board never shows under this one)
    const champIds = defending(shown);
    if (S.loading && !(shown && shown.ok)) body = `<p class="ui-msg loading lb-msg lb-loading" role="status">Loading the leaderboard…</p>`;
    else if (!S.res || !S.res.ok) body = `<p class="ui-msg lb-msg lb-break">Leaderboard is taking a break. Your progress is still saved!</p>`;
    else if (!rows.length) body = `<p class="ui-msg lb-msg">Nobody is on this board yet this week. Be the first!</p>`;
    else body = `<ol class="lb-list">` + rows.slice(0, 10).map((e, i) => {
      const me = L().isMe(e), medal = ['gold', 'silver', 'bronze'][i] || '', cup = champIds.has(e.id);
      const name = A.Avatar && A.Avatar.nameFromNumbers ? A.Avatar.nameFromNumbers(e.name) : 'Mystery Player';
      return `<li class="lb-row${medal ? ' m-' + medal : ''}${me ? ' me' : ''}"><span class="lb-rank">${i + 1}</span>` +
        `<span class="lb-name">${esc(name)}${cup ? ' <span class="lb-cup" title="Last week\'s champion" aria-label="last week\'s champion">🏆</span>' : ''}${me ? ' <b class="lb-you">YOU</b>' : ''}${TEACHER ? ` <code class="lb-id">${esc(e.id || '')}</code>` : ''}</span>` +
        `<span class="lb-val">${esc(tab.unit(e.value))}</span></li>`;
    }).join('') + `</ol>`;
    if (shown && shown.ok && shown.stale) body = `<p class="lb-stale" role="status">Couldn't refresh — showing the board from ${esc(agoPlain(S.res.at))}</p>` + body;
    if (TEACHER) body += `<p class="lb-note lb-diag">${esc(diagLine())}</p>`;
    const miss = missingLine(shown);
    const own = miss ? '' : S.res && S.res.ok ? ownLine(rows) : '';
    const foot = `<p class="lb-foot">Resets every Monday${S.res && S.res.ok ? ` · ${esc(ago(updatedAt(S.res)))}` : ''}` +
      ` <button type="button" class="lb-ref" data-act="refresh"${S.loading ? ' disabled' : ''}>${S.loading ? 'Loading…' : 'Refresh'}</button></p>`;
    const mine = `<section class="lb-mine" aria-label="My settings"><h3>My settings</h3>` +
      `<div class="lb-mrow"><span>My grade:</span>` + L().GRADES.map(g => `<button type="button" class="lb-mg${g === st.grade ? ' on' : ''}" data-act="my-grade" data-g="${g}" aria-pressed="${g === st.grade}">${g}</button>`).join('') + `</div>` +
      `<label class="lb-mrow lb-tog"><input type="checkbox" class="lb-on"${st.on ? ' checked' : ''}> <span>Show me on the leaderboard</span></label>` +
      `<p class="lb-note">Only your avatar name and scores are shared. Never your real name.</p>` +
      (TEACHER ? `<p class="lb-note lb-teach">Teacher view: the codes are each player's id. Paste one into the Blocked tab of the scoreboard Sheet to hide that player.</p>` + deviceDiag() + champTeacher() : '') + `</section>`;
    S.el.innerHTML = `<div class="lb-in">${head}${gradeSw}${champStrip(shown)}${tabs}${games}<div class="lb-board" aria-live="polite">${body}</div>` +
      (miss ? `<p class="lb-own lb-missing">${esc(miss)}</p>` : '') + (own ? `<p class="lb-own">${esc(own)}</p>` : '') + foot + mine + `</div>`;
  }
  function state() {
    return {open: !!S.el && !S.el.hidden, asking: S.asking, grade: S.grade, tab: S.tab, game: S.game, ok: !!(S.res && S.res.ok), why: S.res && S.res.why,
      loading: S.loading, stale: !!(S.res && S.res.stale), missing: S.el && S.el.querySelector('.lb-missing') ? S.el.querySelector('.lb-missing').textContent : '',
      teacher: S.el && S.el.querySelector('.lb-dev') ? S.el.querySelector('.lb-dev').textContent : '',
      rows: S.el ? [...S.el.querySelectorAll('.lb-row')].map(r => r.textContent.trim()) : [],
      plaques: S.el ? [...S.el.querySelectorAll('.lb-plaque')].map(r => ({text: r.textContent.trim(), me: r.classList.contains('me')})) : [],
      cups: S.el ? [...S.el.querySelectorAll('.lb-row')].filter(r => r.querySelector('.lb-cup')).map(r => r.querySelector('.lb-name').textContent.trim()) : [], own: S.el && S.el.querySelector('.lb-own') ? S.el.querySelector('.lb-own').textContent : ''};
  }
  /* ---------- THE GRADE QUESTION in the lobby (#gradeAsk, under the lobby cards and SAVE YOUR PROGRESS; styles .gq-* in arcade.css) ----------
     Nothing reaches a board until a grade is chosen (what's earned before waits HELD: shared/leaderboard.js), and the
     LEADERBOARD screen was the only place that asked, so a class that never opened the trophy never showed up. Once
     this device has a star this week, no grade, the switch on and an address set: "Show up on the leaderboard? What
     grade are you in?" 6 / 7 / 8 + Not now (waits ASK_SNOOZE days: gameData('leaderboard').askAfter). It's a banner of
     THE LOBBY QUEUE (shared/lobby-queue.js, id 'grade'): asked here, shown when the queue says so. A tap shows "7th grade ✓. You can change it
     on the Leaderboard." with UNDO for UNDO_MS: the grade is set only when that time is up (or the page goes away), so
     UNDO really sends nothing. */
  const ASK_SNOOZE = 3, UNDO_MS = 5000, ORD = {6: '6th', 7: '7th', 8: '8th'};
  let pending = null, askDone = null;
  const Q = () => A.Lobby && A.Lobby.queue;
  function askDue() {
    if (!L() || !L().canHold || !L().canHold() || !A.store.player) return false;
    const d = A.store.gameData('leaderboard');
    return L().mine().stars > 0 && !(d.askAfter && Date.now() < d.askAfter);
  }
  /** the question is due: ask the lobby queue for the banner (lobby.js calls this on every draw); not due: take it back */
  function askGrade() {
    const box = document.getElementById('gradeAsk');
    if (!box || !Q()) return;
    if (pending) return;                                       // the UNDO line is showing
    if (!askDue()) { Q().cancel('grade'); box.innerHTML = ''; return; }
    if (Q().isShowing('grade')) return;
    Q().request({id: 'grade', kind: 'banner', when: askDue, show: d => { askDone = d; drawAsk(); return () => { if (pending) commit(); else box.innerHTML = ''; }; }});
  }
  const askFinished = () => { const d = askDone; askDone = null; if (d) d(); };
  function drawAsk() {
    const box = document.getElementById('gradeAsk');
    if (!box || box.querySelector('.gq-card:not(.gq-done)')) return;
    box.innerHTML = `<div class="gq-card bn-card bn-in"><span class="gq-icon" aria-hidden="true">🏆</span>` +
      `<p class="gq-msg bn-msg"><b>Show up on the leaderboard?</b> What grade are you in?</p>` +
      `<div class="gq-acts bn-acts">` + L().GRADES.map(g => `<button type="button" class="btn btn-secondary gq-g" data-g="${g}">${g}</button>`).join('') +
      `<button type="button" class="btn btn-secondary gq-later">Not now</button></div></div>`;
    box.querySelectorAll('.gq-g').forEach(b => b.addEventListener('click', () => pickGrade(+b.dataset.g)));
    box.querySelector('.gq-later').addEventListener('click', () => {
      sfx('ui-toggle');
      const d = A.store.gameData('leaderboard'); d.askAfter = Date.now() + ASK_SNOOZE * 86400000; A.store.saveGameData('leaderboard');
      box.innerHTML = '';
      const z = document.querySelector('#zones .zsign'); if (z) z.focus({preventScroll: true});
      askFinished();
    });
  }
  function pickGrade(g) {
    const box = document.getElementById('gradeAsk');
    sfx('player-ready');
    pending = {g, t: setTimeout(commit, UNDO_MS)};
    box.innerHTML = `<div class="gq-card gq-done bn-card"><span class="gq-icon" aria-hidden="true">🏆</span>` +
      `<p class="gq-msg bn-msg" role="status"><b>${ORD[g]} grade ✓.</b> You can change it on the Leaderboard.</p>` +
      `<div class="gq-acts bn-acts"><button type="button" class="btn btn-secondary gq-undo">Undo</button></div></div>`;
    const u = box.querySelector('.gq-undo');
    u.addEventListener('click', undo); u.focus({preventScroll: true});
  }
  /** the 5 seconds are up (or the page is going away): now the grade is set, and what was held goes out */
  function commit() {
    if (!pending) return;
    const g = pending.g; clearTimeout(pending.t); pending = null;
    L().setGrade(g);
    const box = document.getElementById('gradeAsk'); if (box) box.innerHTML = '';
    if (S.el && !S.el.hidden) draw();
    askFinished();
  }
  function undo() {
    if (!pending) return;
    clearTimeout(pending.t); pending = null;
    sfx('ui-back');
    const box = document.getElementById('gradeAsk'); if (box) box.innerHTML = '';
    if (askDone) drawAsk(); else askGrade();                   // the question again (still the queue's banner): nothing was set or sent
    const f = box && box.querySelector('.gq-g'); if (f) f.focus({preventScroll: true});
  }
  addEventListener('pagehide', commit);
  document.addEventListener('visibilitychange', () => { if (document.hidden) commit(); });

  // the top bar's trophy button (index.html #lbBtn): only when a scoreboard address is set
  const btn = document.getElementById('lbBtn');
  if (btn && L() && L().available()) { btn.hidden = false; btn.addEventListener('click', open); }
  A.LeaderboardScreen = {open, close, state, askGrade, askState: () => ({shown: !!document.querySelector('#gradeAsk .gq-card'), pending: pending && pending.g})};
})(window.Arcade);
