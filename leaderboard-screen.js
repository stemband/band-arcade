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
     - can't reach the scoreboard / switched off: "Leaderboard is taking a break. Your progress is still saved!"
   ?teacher: every entry shows its 6-character id (Mat hides a player by pasting it in the Blocked tab of his Sheet).
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
  const S = {el: null, grade: null, tab: 'stars', game: null, res: null, loading: false, asking: false};
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
  function draw() {
    if (!S.el) return;
    const st = L().settings();
    const head = `<header class="lb-head"><h2 id="lbTitle" class="lb-title"><span aria-hidden="true">🏆</span> Leaderboard</h2>` +
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
      `<button type="button" class="lb-gs${g === S.grade ? ' on' : ''}" data-act="grade" data-g="${g}" aria-pressed="${g === S.grade}">Grade ${g}${g === st.grade ? '<small>you</small>' : ''}</button>`).join('') + `</div>`;
    const tabs = `<div class="lb-tabs" role="tablist">` + TABS.map(t =>
      `<button type="button" role="tab" class="lb-tab" data-act="tab" data-tab="${t.id}" aria-selected="${t.id === S.tab}"><span aria-hidden="true">${t.icon}</span> ${esc(t.name)}</button>`).join('') + `</div>`;
    const games = S.tab === 'endless' ? `<div class="lb-games" role="group" aria-label="Game">` + endlessGames(S.res).map(g =>
      `<button type="button" class="lb-gm${g === S.game ? ' on' : ''}" data-act="game" data-game="${esc(g)}" aria-pressed="${g === S.game}">${esc(gameName(g))}</button>`).join('') + `</div>` : '';
    let body;
    if (S.loading && !S.res) body = `<p class="lb-msg">Loading…</p>`;
    else if (!S.res || !S.res.ok) body = `<p class="lb-msg lb-break">Leaderboard is taking a break. Your progress is still saved!</p>`;
    else if (!rows.length) body = `<p class="lb-msg">Nobody is on this board yet this week. Be the first!</p>`;
    else body = `<ol class="lb-list">` + rows.slice(0, 10).map((e, i) => {
      const me = L().isMe(e), medal = ['gold', 'silver', 'bronze'][i] || '';
      const name = A.Avatar && A.Avatar.nameFromNumbers ? A.Avatar.nameFromNumbers(e.name) : 'Mystery Player';
      return `<li class="lb-row${medal ? ' m-' + medal : ''}${me ? ' me' : ''}"><span class="lb-rank">${i + 1}</span>` +
        `<span class="lb-name">${esc(name)}${me ? ' <b class="lb-you">YOU</b>' : ''}${TEACHER ? ` <code class="lb-id">${esc(e.id || '')}</code>` : ''}</span>` +
        `<span class="lb-val">${esc(tab.unit(e.value))}</span></li>`;
    }).join('') + `</ol>`;
    const own = S.res && S.res.ok ? ownLine(rows) : '';
    const foot = `<p class="lb-foot">Resets every Monday${S.res && S.res.ok ? ` · ${esc(ago(updatedAt(S.res)))}` : ''}` +
      ` <button type="button" class="lb-ref" data-act="refresh"${S.loading ? ' disabled' : ''}>${S.loading ? 'Loading…' : 'Refresh'}</button></p>`;
    const mine = `<section class="lb-mine" aria-label="My settings"><h3>My settings</h3>` +
      `<div class="lb-mrow"><span>My grade:</span>` + L().GRADES.map(g => `<button type="button" class="lb-mg${g === st.grade ? ' on' : ''}" data-act="my-grade" data-g="${g}" aria-pressed="${g === st.grade}">${g}</button>`).join('') + `</div>` +
      `<label class="lb-mrow lb-tog"><input type="checkbox" class="lb-on"${st.on ? ' checked' : ''}> <span>Show me on the leaderboard</span></label>` +
      `<p class="lb-note">Only your avatar name and scores are shared. Never your real name.</p>` +
      (TEACHER ? `<p class="lb-note lb-teach">Teacher view: the codes are each player's id. Paste one into the Blocked tab of the scoreboard Sheet to hide that player.</p>` : '') + `</section>`;
    S.el.innerHTML = `<div class="lb-in">${head}${gradeSw}${tabs}${games}<div class="lb-board" aria-live="polite">${body}</div>` +
      (own ? `<p class="lb-own">${esc(own)}</p>` : '') + foot + mine + `</div>`;
  }
  function state() {
    return {open: !!S.el && !S.el.hidden, asking: S.asking, grade: S.grade, tab: S.tab, game: S.game, ok: !!(S.res && S.res.ok), why: S.res && S.res.why,
      rows: S.el ? [...S.el.querySelectorAll('.lb-row')].map(r => r.textContent.trim()) : [], own: S.el && S.el.querySelector('.lb-own') ? S.el.querySelector('.lb-own').textContent : ''};
  }
  // the top bar's trophy button (index.html #lbBtn): only when a scoreboard address is set
  const btn = document.getElementById('lbBtn');
  if (btn && L() && L().available()) { btn.hidden = false; btn.addEventListener('click', open); }
  A.LeaderboardScreen = {open, close, state};
})(window.Arcade);
