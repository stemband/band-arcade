/* WEEKLY CHAMPIONS in the arcade LOBBY (shared/leaderboard.js has the check, the awards and the rewards; lobby.js
   calls render()). Finishing 1st on a leaderboard board for a week (your grade) earns a CHAMPION card here:
     WHEN: the lobby is on screen, idle: after first paint the weekly check runs (Leaderboard.checkChampion: once a week,
       a failed one again at a later showing, at most every 10 minutes); an unclaimed award shows THE CARD, but never
       over PRESS START, Choose Your Instrument (pick mode), another panel or overlay (a tour, the Prize Counter, the
       leaderboard…): it waits for them to close.
     THE CARD (a UI kit panel): your avatar in its VICTORY pose (AvatarFight.stillHTML, else the bust) holding a trophy
       in a spotlight; "🏆 CHAMPION!"; one line per award ("You finished 1st in 7th grade for MOST STARS: week of Oct 5");
       the avatar's name in words; "+100 tokens" counting up; small print "Show Mr. Graham this screen: ID ab12cd" (the
       device's 6-character id: Mat matches it to the Champions tab of his Sheet); CLAIM (yellow, focused; Esc too)
       pays (Leaderboard.claim: the record first, then the tokens) and closes; a new avatar item then gets the arcade's
       usual UNLOCKED! card (Skins.catchUp). A tied 1st is a full championship (no "tied" wording).
     SOUND: champion-fanfare (falls back to level-complete), here only, never while a page listens. Confetti once; none
       under reduced motion or Motion off (a simple fade instead).
     Arcade.ChampionLobby.render()   the lobby was drawn: check, then show the card when it can
     Arcade.ChampionLobby.state()    tests: {open, lines, tokens, id, waiting} */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const L = () => A.Leaderboard;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const still = () => !!(A.reducedMotion && A.reducedMotion.matches);         // the device or the Motion switch asks for less
  const ORD = {6: '6th', 7: '7th', 8: '8th'};
  let ov = null, waitT = 0, idleT = 0;

  const lobbyFree = () => A.Lobby.free();                   // the lobby on screen with nothing over it (lobby.js)
  /* ---------- after the lobby is drawn: the check when the page is idle, then the card ---------- */
  function render() {
    if (!L() || !L().checkChampion) return;
    clearTimeout(idleT);
    const go = () => { const l = $('lobby'); if (!l || l.hidden || document.hidden) return; L().checkChampion().then(waitToShow, () => {}); };
    idleT = setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(go, {timeout: 2000}) : go()), 600);   // first paint first
    waitToShow();
  }
  /** an unclaimed award waits until the lobby is free, then shows (checked every second while it waits) */
  function waitToShow() {
    clearTimeout(waitT);
    if (ov || !L() || !L().unclaimed().length) return;
    const l = $('lobby');
    if (!l || l.hidden) return;                                   // left the lobby: render() starts again on the way back
    if (lobbyFree()) show(); else waitT = setTimeout(waitToShow, 1000);
  }

  /* ---------- the card ---------- */
  function lineOf(a, grade) {
    const [k] = a.board.split(':');
    const what = k === 'endless' ? L().boardName(a.board) : L().boardName(a.board).toUpperCase();
    return `You finished 1st in ${grade ? ORD[grade] + ' grade' : 'your grade'} for ${what} (${L().boardValue(a.board, a.value)}) — week of ${L().weekName(a.week)}`;
  }
  function picHTML() {
    const m = A.store.player, F = A.AvatarFight;
    const fig = (m && F && F.ready && F.ready() && F.stillHTML(m, 'victory', {cls: 'ch-fig'})) ||
      (A.avatarHTML ? A.avatarHTML({size: 'big', cls: 'ch-bust', label: ''}) : '');
    return `<div class="ch-stage" aria-hidden="true"><span class="ch-spot"></span>${fig}<span class="ch-cup">🏆</span></div>`;
  }
  function show() {
    const list = L().unclaimed();
    if (!list.length || ov) return;
    const grade = L().settings().grade, tokens = list.reduce((n, a) => n + L().rewardFor(a.board), 0), id = L().myId() || '';
    const name = A.Avatar && A.Avatar.nameOf ? A.Avatar.nameOf(A.Avatar.get()) : '';
    ov = document.createElement('div');
    ov.className = 'overlay ch-ov' + (still() ? ' ch-still' : '');
    ov.innerHTML = `<div class="panel ch-pan" role="dialog" aria-modal="true" aria-labelledby="chTitle" aria-describedby="chLines">` +
      (still() ? '' : `<div class="ch-confetti" aria-hidden="true">${Array.from({length: 28}, (_, i) =>
        `<i style="left:${(i * 37) % 97 + 1}%;animation-delay:${(i * 113) % 900}ms;animation-duration:${1900 + (i * 71) % 900}ms"></i>`).join('')}</div>`) +
      picHTML() +
      `<h2 class="ui-title ch-title" id="chTitle"><span aria-hidden="true">🏆</span> CHAMPION!</h2>` +
      `<ul class="ch-lines" id="chLines">${list.map(a => `<li>${esc(lineOf(a, grade))}</li>`).join('')}</ul>` +
      (name ? `<p class="ch-name">${esc(name)}</p>` : '') +
      `<p class="ch-tokens"><i class="pz-coin" aria-hidden="true"></i> +<b class="ch-n">${still() ? tokens : 0}</b> tokens<span class="sr"> (${tokens})</span></p>` +
      `<p class="ch-small">Show Mr. Graham this screen: ID <code>${esc(id)}</code></p>` +
      `<div class="acts"><button type="button" class="btn btn-primary ch-claim">Claim</button></div></div>`;
    document.body.appendChild(ov);
    if (A.lockScroll) A.lockScroll(true);
    A.UI.layer.open(ov, {min: 70, trap: true, onEsc: claim, focus: '.ch-claim'});
    ov.querySelector('.ch-claim').addEventListener('click', claim);
    if (A.Sfx && !(A.Pitch && A.Pitch.listening && A.Pitch.listening())) A.Sfx.event('champion-fanfare');
    if (!still()) countUp(ov.querySelector('.ch-n'), tokens);
  }
  function countUp(el, n) {
    const t0 = performance.now(), ms = 900;
    const step = t => { if (!ov || !el.isConnected) return; const k = Math.min(1, (t - t0) / ms); el.textContent = String(Math.round(n * k)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function claim() {
    if (!ov) return;
    const res = L().claim();
    const el = ov; ov = null;
    A.UI.layer.close(el, {restore: false});
    el.remove();
    if (A.lockScroll) A.lockScroll(false);
    const s = document.querySelector('#zones .zsign'); if (s) s.focus({preventScroll: true});
    if (res.items.length && A.Skins && A.Skins.catchUp) {            // the arcade's usual UNLOCKED! card (WEAR IT)
      setTimeout(() => A.Skins.catchUp(A.store.player, {only: res.items,
        foot: 'You earned it as a weekly champion! Find it in the <b>LOCKER</b> on the player card.', onEquip: () => { if (A.Avatar) A.Avatar.redrawAll(); }}), 350);
    }
  }
  function state() {
    return {open: !!ov, lines: ov ? [...ov.querySelectorAll('.ch-lines li')].map(li => li.textContent) : [],
      tokens: ov ? +ov.querySelector('.ch-n').textContent : null, id: ov ? ov.querySelector('.ch-small code').textContent : null,
      confetti: !!(ov && ov.querySelector('.ch-confetti')), waiting: !ov && !!(L() && L().unclaimed().length)};
  }
  addEventListener('arcade:champion', waitToShow);
  document.addEventListener('visibilitychange', () => { const l = $('lobby'); if (!document.hidden && l && !l.hidden) render(); });
  A.ChampionLobby = {render, state, show: waitToShow};
})(window.Arcade);
