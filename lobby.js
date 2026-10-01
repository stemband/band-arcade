/* The arcade LOBBY and ALL GAMES: flat HTML and CSS only (no three.js), drawn here; arcade.js decides when they show.
   THE ZONE LOBBY: a dark arcade wall with one neon sign per zone (+ the PRIZE COUNTER's sign last: prizeSign()) (games.js ZONES: its color, name, tagline, small
   silhouettes of its cabinets and the student's stars there for the current instrument), and on top TODAY'S PRACTICE
   (shared/practice.js: 3 steps, the whole row), a CONTINUE card (the last game opened on this device) and the ASSIGNED
   card (shared/featured.js); under them, now and then, the SAVE YOUR PROGRESS banner (shared/backup-nudge.js).
   ALL GAMES: every game once (even one in two zones), as a card: its marquee, name, zone tags, stars, 2P / ASSIGNED,
   and "No instrument needed" (games.js noInstrument). THE FILTER above the cards: the chip "No instrument needed"
   (aria-pressed) shows only those games; remembered for this browser session (sessionStorage bandarcade.noinst).
   The marquee pictures are still frames from shared/marquees.js (Arcade.Marquee.thumb: drawn once, then kept).
   A game that doesn't suit the instrument (games.js fit) stays, dimmed, with its short tag.
     Arcade.Lobby.render({onZone(zone), onGame(game, from)})
     Arcade.Lobby.renderAll({onGame(game, from), focus: gameId})
     Arcade.Lobby.lastGame() / remember(game)   the CONTINUE game (store.gameData('floor').last) */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const {$} = A;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const reduced = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));
  const thumb = g => A.Marquee
    ? `<img class="mq-thumb" data-mq-thumb="${esc(A.Marquee.thumbKey(g))}" src="${A.Marquee.thumb(g)}" alt="" draggable="false">`
    : `<span class="mq-thumb mq-none">${esc(g.name)}</span>`;
  const zoneStyle = z => z ? `--z:var(--${z.color});--z-hi:var(--${z.color}-hi);--z-ink:var(--${z.color}-ink)` : '';
  const starsHTML = n => `<span class="star" aria-hidden="true">★</span> <b>${n}</b><span class="sr"> stars</span>`;
  const fitOf = g => A.gameFit(g, A.store.player);
  const twoP = g => g.players === 2;

  /* the CONTINUE game: the last one opened from this page (a game's own record; nothing inside the games changes) */
  const lastGame = () => { const id = (A.store.gameData('floor') || {}).last; return A.floorGames().find(g => g.id === id) || null; };
  function remember(g) {
    const d = A.store.gameData('floor');
    d.last = g.id; d.lastAt = Date.now();
    A.store.saveGameData('floor');
  }

  /* ---------- the lobby ---------- */
  let lit = false;                                          // the signs flicker on once per page load
  function lobbyCard(kind, g, label, note) {
    const f = fitOf(g), z = A.zonesOf(g)[0];
    return `<button type="button" class="lcard lc-${kind}${f.ok ? '' : ' nofit'}" data-game="${esc(g.id)}" style="${zoneStyle(z)}">` +
      `<span class="lc-pic">${thumb(g)}</span>` +
      `<span class="lc-text"><span class="lc-label">${label}</span><span class="lc-name">${esc(g.name)}</span>` +
      (note ? `<span class="lc-note">${esc(note)}</span>` : '') +
      (f.ok ? '' : `<span class="fit-tag">${esc(f.tag)}</span>`) + `</span></button>`;
  }
  function render({onZone, onGame}) {
    const cards = [], F = A.featuredGame(), last = lastGame();
    lastOnGame = onGame;
    const pr = practiceCard();
    if (pr) cards.push(pr.html);
    if (last) cards.push(lobbyCard('continue', last, 'Continue', ''));
    if (F) cards.push(lobbyCard('assigned', F, 'Assigned', (A.FEATURED && A.FEATURED.note) || ''));
    $('lobbyCards').innerHTML = cards.join('');
    $('lobbyCards').hidden = !cards.length;
    if (pr) wirePractice(pr);
    const zones = A.zoneList(), flicker = !lit && !reduced.matches;
    $('zones').innerHTML = zones.map((z, i) => {
      const games = A.zoneGames(z.id), stars = games.reduce((n, g) => n + A.gameStars(g), 0);
      const assigned = F && games.includes(F);
      return `<button type="button" class="zsign${flicker ? ' flick' : ''}" data-zone="${esc(z.id)}" style="${zoneStyle(z)};--i:${i}" ` +
        `aria-label="${esc(z.name)}: ${games.map(g => esc(g.name)).join(', ')}. ${stars} stars.">` +
        `<span class="zs-name">${esc(z.name)}</span>` +
        `<span class="zs-tag">${esc(z.tagline || '')}</span>` +
        `<span class="zs-cabs" aria-hidden="true">${games.map(g => A.cabSilhouetteSVG(g)).join('')}</span>` +
        `<span class="zs-foot"><span class="zs-stars">${starsHTML(stars)}</span><span class="zs-count">${games.length} ${games.length === 1 ? 'game' : 'games'}</span>` +
        (assigned ? `<span class="badge b-assigned">Assigned</span>` : '') + `</span></button>`;
    }).join('') + prizeSign(zones.length, flicker);
    lit = true;
    $('zones').querySelectorAll('.zsign[data-zone]').forEach(b => b.addEventListener('click', () => onZone(A.zoneById(b.dataset.zone))));
    wirePrize();
    $('lobbyCards').querySelectorAll('.lcard').forEach(b => b.addEventListener('click', () =>
      onGame(A.floorGames().find(g => g.id === b.dataset.game), 'lobby')));
    if (A.SeasonLobby) A.SeasonLobby.render($('lobby'));       // a seasonal event: its banner + decorations (season-lobby.js)
    if (A.ChampionLobby) A.ChampionLobby.render();             // WEEKLY CHAMPIONS: the weekly check, the CHAMPION card (champion-lobby.js)
    if (A.LeaderboardScreen) A.LeaderboardScreen.askGrade();   // "What grade are you in?" once there's a star and no grade (leaderboard-screen.js)
    if (A.BackupNudge) A.BackupNudge.refresh();                // now and then: "Save your progress!" (shared/backup-nudge.js)
  }

  /* ---------- TODAY'S PRACTICE (shared/practice.js): the first card, the whole row. A neon header + "About 15
     minutes", three step buttons (WARM UP · SKILL · PLAY: the game's marquee, the step, its one-line task, a big check
     circle; done = a green ✓ + "Done", slightly dimmed but still tappable; the next one to do glows gently), and THIS
     WEEK (7 stamps, Monday to Sunday). All 3 done: the card turns gold, "PRACTICE DONE! +10 tokens", a stamp (once),
     the practice-done sound (only here, never while a page listens). Hidden with no instrument saved. ---------- */
  let lastOnGame = null, rendering = false;
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  function practiceCard() {
    if (!A.Practice || !A.store.player) return null;
    rendering = true;
    let s;
    try { s = A.Practice.settle(); } finally { rendering = false; }
    if (!s) return null;
    const W = A.Practice.week(), bonus = A.Practice.bonus, gold = s.all;
    const steps = s.steps.map((p, i) => {
      const g = (A.GAMES || []).find(x => x.id === p.game);
      const where = p.tool ? `Tune Up ${p.tool === 'tuner' ? 'Tuner' : 'Metronome'}` : g ? g.name : '';
      const label = `Step ${p.step}, ${p.word}: ${where}. ${p.task}. ${p.done ? 'Done.' : 'Not done yet.'}`;
      return `<li><button type="button" class="pr-step${p.done ? ' done' : ''}${p.next ? ' next' : ''}" data-i="${i}" aria-label="${esc(label)}">` +
        `<span class="pr-pic">${g ? thumb(g) : ''}</span>` +
        `<span class="pr-txt"><span class="pr-word"><b class="pr-n">${p.step}</b> ${esc(p.word)}</span>` +
        `<span class="pr-task">${esc(p.task)}</span><span class="pr-why">${esc(p.why || '')}</span></span>` +
        `<span class="pr-mark" aria-hidden="true"><span class="pr-check">${p.done ? CHECK : ''}</span>` +
        (p.done ? `<span class="pr-done">Done</span>` : '') + `</span></button></li>`;
    }).join('');
    const weekSay = `This week: ${W.count} practice ${W.count === 1 ? 'day' : 'days'}. ` +
      W.days.map(d => `${d.name}${d.today ? ' (today)' : ''}: ${d.on ? 'practiced' : 'not yet'}`).join(', ') + '.';
    const weekHTML = `<div class="pr-week" role="img" aria-label="${esc(weekSay)}"><p class="pr-week-h" aria-hidden="true">This week</p>` +
      `<ol class="pr-stamps" aria-hidden="true">${W.days.map(d => `<li class="pr-stamp${d.on ? ' on' : ''}${d.today ? ' today' : ''}" title="${d.name}">` +
        `<span class="pr-day">${d.letter}</span><span class="pr-dot">${d.on ? CHECK : ''}</span></li>`).join('')}</ol>` +
      `<p class="pr-week-n" aria-hidden="true">${W.count} practice ${W.count === 1 ? 'day' : 'days'} this week</p></div>`;
    const html = `<section class="pr-card${gold ? ' gold' : ''}" id="practiceCard" aria-labelledby="prTitle">` +
      `<div class="pr-main"><header class="pr-head"><h2 class="pr-title" id="prTitle">${gold ? `Practice done! <span class="pr-plus">+${bonus} tokens</span>` : 'Today\'s Practice'}</h2>` +
      `<p class="pr-sub">${gold ? 'Come back tomorrow for a new skill!' : 'About 15 minutes'}</p>` +
      (gold ? `<span class="pr-seal" aria-hidden="true">${CHECK}<b>Done</b></span>` : '') + `</header>` +
      `<ol class="pr-steps">${steps}</ol></div>${weekHTML}</section>`;
    return {html, s};
  }
  /** where the stamp may animate and the sound may play: the lobby on screen, no PRESS START, no Choose Your Instrument */
  const lobbyShown = () => { const l = $('lobby'), ps = $('pressStart'); return !!l && !l.hidden && !(ps && !ps.hidden) && !document.body.classList.contains('in-select'); };
  function wirePractice(pr) {
    const card = $('practiceCard');
    if (!card) return;
    card.querySelectorAll('.pr-step').forEach(b => b.addEventListener('click', () => A.Practice.open(pr.s.steps[+b.dataset.i], lastOnGame || (() => {}))));
    if (!pr.s.stampNow || !lobbyShown()) return;              // the celebration waits until the lobby is really shown
    A.Practice.stamped();
    if (!reduced.matches) card.classList.add('stamp-go'); else card.classList.add('stamp-fade');
    if (A.Sfx && !(A.Pitch && A.Pitch.listening && A.Pitch.listening())) A.Sfx.event('practice-done');
    if (pr.s.proNow && A.Skins && A.Skins.catchUp) setTimeout(() => A.Skins.catchUp(A.store.player, {foot: `${A.Practice.PRACTICE.weekGoal} practice days this week. Find it in the <b>LOCKER</b> on the player card.`}), 1600);
  }
  /** redraw just the practice card (coming back from a game, the tokens changed, a new day) */
  function redrawPractice() {
    if (rendering || !lobbyShown()) return;
    const box = $('lobbyCards'), old = $('practiceCard');
    if (!box) return;
    const f = old && old.contains(document.activeElement) ? +(document.activeElement.dataset.i || -1) : null;
    const pr = practiceCard();
    if (!pr) { if (old) old.remove(); box.hidden = !box.children.length; return; }
    const w = document.createElement('div'); w.innerHTML = pr.html;
    if (old) old.replaceWith(w.firstChild); else { box.insertBefore(w.firstChild, box.firstChild); box.hidden = false; }
    wirePractice(pr);
    if (f !== null) { const b = $('practiceCard').querySelector(`.pr-step[data-i="${f}"]`); if (b) b.focus({preventScroll: true}); }
  }
  addEventListener('pageshow', e => { if (e.persisted) redrawPractice(); });        // (arcade.js redraws the whole view too)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) redrawPractice(); });
  addEventListener('storage', e => { if (!e.key || e.key === 'bandarcade.v1') redrawPractice(); });
  addEventListener('arcade:tokens', () => redrawPractice());
  // a new day while the lobby stays open: a new plan at midnight
  (function midnight() {
    const n = new Date(), next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 2);
    setTimeout(() => { redrawPractice(); midnight(); }, Math.min(next - n, 2147483000));
  })();

  /* ---------- THE PRIZE COUNTER's sign (shared/prizes.js; the wallet: shared/tokens.js): the last sign, the same size
     and style as the zones' (it flickers on with them), with the token balance and the WISH bar: "Wish: Jetpack ·
     180 / 300", a lighter part for the stars not turned in yet ("+60 waiting at the counter"), and "You can get your
     wish!" + the token icon (a gentle pulse; none with reduced motion) once it's affordable. ---------- */
  function prizeSign(i, flicker) {
    if (!A.Tokens || !A.Prizes || !A.store) return '';
    const T = A.Tokens, bal = T.balance(), fresh = T.freshStars(), w = T.wishProgress();
    let wish = '', say = '';
    if (w && w.owned) { wish = `<span class="zs-wish"><span class="zs-wish-t">Wish: ${esc(w.name)} · yours!</span></span>`; say = ` Your wish, the ${w.name}, is yours.`; }
    else if (w) {
      const ready = w.affordable;
      wish = `<span class="zs-wish${ready ? ' ready' : ''}"><span class="zs-wish-t">Wish: ${esc(w.name)} · ${Math.min(w.have, w.price)} / ${w.price}</span>` +
        `<span class="zs-bar" aria-hidden="true"><i class="zs-have" style="width:${w.pct.toFixed(1)}%"></i><i class="zs-wait" style="width:${w.pctWaiting.toFixed(1)}%"></i></span>` +
        (w.season && w.left ? `<span class="zs-wish-left">${esc(w.left)}</span>` : '') +
        (ready ? `<span class="zs-wish-go">${w.questOnly ? 'Get it at the Token Booth in Arcade Quest!' : `You can get your wish! ${A.Tokens.iconHTML()}`}</span>` : w.waiting ? `<span class="zs-wish-w">+${w.waiting} waiting at the counter</span>` : '') + `</span>`;
      say = (ready ? ` You can get your wish, the ${w.name}!` : ` Wish: ${w.name}, ${Math.min(w.have, w.price)} of ${w.price} tokens${w.waiting ? `, plus ${w.waiting} waiting at the counter` : ''}.`) + (w.season && w.left ? ` ${w.name}: ${w.left}` : '');
    }
    if (!w) { const g = T.wishGone(); if (g) { wish = `<span class="zs-wish"><span class="zs-wish-t">${esc(g.text)}</span></span>`; say = ' ' + g.text; } }
    return `<button type="button" class="zsign zs-prize${flicker ? ' flick' : ''}" id="prizeSign" style="--z:var(--amber);--z-hi:var(--amber-hi);--z-ink:var(--amber-ink);--i:${i}" ` +
      `aria-label="Prize Counter: ${bal} tokens${fresh ? `, ${fresh} new stars to turn in` : ''}.${esc(say)}">` +
      `<span class="zs-name">Prize Counter</span><span class="zs-tag">Turn your stars into prizes</span>` +
      `<span class="zs-bal">${T.iconHTML()}<b>${bal}</b> tokens${fresh ? ` <small>· ${fresh} new ★ to turn in</small>` : ''}</span>${wish}</button>`;
  }
  function wirePrize() {
    const b = $('prizeSign');
    if (b) b.addEventListener('click', () => { if (A.Prizes) A.Prizes.open({onClose: () => { const s = $('prizeSign'); if (s) s.focus({preventScroll: true}); }}); });
  }
  // the wallet or the wish changed: redraw the sign (no flicker)
  addEventListener('arcade:tokens', () => {
    const b = $('prizeSign'); if (!b) return;
    const f = document.activeElement === b, w = document.createElement('div');
    w.innerHTML = prizeSign(+b.style.getPropertyValue('--i') || 0, false);
    if (!w.firstChild) return;
    b.replaceWith(w.firstChild); wirePrize();
    if (f) $('prizeSign').focus({preventScroll: true});
  });

  /* ---------- ALL GAMES ---------- */
  const NI_KEY = 'bandarcade.noinst';
  const niOn = () => { try { return sessionStorage.getItem(NI_KEY) === '1'; } catch (e) { return false; } };
  function renderAll({onGame, focus}) {
    const F = A.featuredGame(), only = niOn();
    const chip = $('niFilter');
    if (chip) {
      chip.setAttribute('aria-pressed', String(only));
      chip.onclick = () => {
        try { sessionStorage.setItem(NI_KEY, niOn() ? '0' : '1'); } catch (e) { /* private mode: still toggles below */ }
        if (A.Sfx) A.Sfx.event('ui-toggle');
        renderAll({onGame, focus: null});
        chip.focus({preventScroll: true});
      };
    }
    const games = A.floorGames().filter(g => !only || g.noInstrument);
    const count = $('allCount');
    if (count) count.textContent = only ? `${games.length} game${games.length === 1 ? '' : 's'} you can play without your instrument` : '';
    $('allGrid').innerHTML = games.map(g => {
      const f = fitOf(g), zones = A.zonesOf(g);
      const foot = g.maxStars ? `<span class="gc-stars">${starsHTML(A.gameStars(g))}</span>`
        : `<span class="gc-sum">${esc((g.summary && g.summary(A.store)) || 'No stars: just play!')}</span>`;
      return `<button type="button" class="gcard${f.ok ? '' : ' nofit'}" data-game="${esc(g.id)}" style="${zoneStyle(zones[0])}" ` +
        `aria-label="${esc(g.name)}${twoP(g) ? ', 2 players' : ''}${F === g ? ', assigned' : ''}${g.noInstrument ? ', no instrument needed' : ''}${f.ok ? '' : ', ' + esc(f.tag)}">` +
        `<span class="gc-pic">${thumb(g)}</span>` +               // the marquee alone: badges never cover its title
        `<span class="gc-body"><span class="gc-head"><span class="gc-name">${esc(g.name)}</span><span class="gc-badges">` +
        (F === g ? `<span class="badge b-assigned">Assigned</span>` : '') + (twoP(g) ? `<span class="badge b-2p">2P</span>` : '') + `</span></span><span class="gc-skill">${esc(g.skill || '')}</span>` +
        `<span class="gc-zones">${zones.map(z => `<span class="ztag" style="${zoneStyle(z)}">${esc(z.name)}</span>`).join('')}` +
        (g.noInstrument ? `<span class="ni-tag">No instrument needed</span>` : '') + `</span>` +
        `<span class="gc-foot">${foot}${f.ok ? '' : `<span class="fit-tag">${esc(f.tag)}</span>`}</span></span></button>`;
    }).join('');
    $('allGrid').querySelectorAll('.gcard').forEach(b => b.addEventListener('click', () =>
      onGame(A.floorGames().find(g => g.id === b.dataset.game), 'all')));
    const f = focus && $('allGrid').querySelector(`.gcard[data-game="${focus}"]`);
    if (f) { f.scrollIntoView({block: 'center'}); f.focus({preventScroll: true}); }
  }

  /** the lobby is on screen with NOTHING over it: no PRESS START, pick mode, panel, overlay, UNLOCKED! card or the
      leaderboard (a lobby card that asks something, or a celebration, waits for this: champion-lobby.js, the grade card) */
  function free() {
    const l = $('lobby'), ps = $('pressStart');
    if (!l || l.hidden || document.hidden || (ps && !ps.hidden)) return false;
    if (document.body.classList.contains('in-select') || document.body.classList.contains('lb-open')) return false;
    if (A.UI && ((A.UI.isOpen && A.UI.isOpen()) || (A.UI.layer && A.UI.layer.top()))) return false;
    return ![...document.querySelectorAll('body > .overlay, .sk-catchup')].some(e => !e.hidden && e.getClientRects().length);
  }

  A.Lobby = {render, renderAll, lastGame, remember, thumb, zoneStyle, redrawPractice, free};
})(window.Arcade);
