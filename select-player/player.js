/* Select Player: a fighting-game character select for one game. One tile per instrument (Arcade.PLAYERS), each with
   its neon portrait (shared/portraits.js). The highlighted tile has a pulsing neon outline and a 1P marker; the big
   preview and player card show it. Tap a tile to highlight it, tap it again (or SELECT) to choose; arrow keys move,
   Enter selects. Choosing saves the instrument MEMBER (Arcade.store.setPlayer); its player group follows
   (Arcade.groupFor), so every game's saved stars stay put.
   Two-player games (games.js `players: 2`, or &players=2): after Player 1 (cyan 1P marker), "PLAYER 2 — PRESS
   START": Player 2 picks with a magenta 2P marker, or CPU. That is saved as the last opponent
   (Arcade.store.setOpponent) and never replaces Player 1's instrument.
   IT IS A VIEW ON THE ARCADE FLOOR PAGE (index.html, #selectView), so the audio the student unlocked on the floor
   stays unlocked and the select music starts the moment it opens:
     Arcade.SelectView.open(game, {players, need})   build the screen for that game (arcade.js calls it)
     Arcade.SelectView.open(null, {forGame, onDone})  PICK MODE: choose the instrument for the whole arcade, before
                                                      the lobby (URL index.html?pick). No game: the arcade's own sign,
                                                      no Player 2; forGame (optional) dims the instruments that game
                                                      doesn't suit (games.js `fit`); onDone(memberId) instead of a game
     Arcade.SelectView.close()                        tear it down (every listener it added goes with it)
   The URL is index.html?game=<id>[&players=2][&need=pitched|noplay]; select-player/index.html?game=<id> redirects
   there. Links from here are relative to the site root. */
(function (A) {
  "use strict";
  const {$} = A;
  const ROOT = '';                                          // this view lives on the floor page, at the site root
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const {noteLabel} = A.music;
  const FAMILY = {woodwind: 'Woodwind', brass: 'Brass', percussion: 'Percussion'};
  const KEY = {0: 'Concert pitch', 2: 'B♭ instrument', 7: 'F instrument', 9: 'E♭ instrument'};
  const VOICE_KEY = 'bandarcade.choose-at', VOICE_GAP = 60000, VOICE_DELAY = 500;
  let live = null;                                          // the open view: {game, ac (AbortController)}

  /* THE ANNOUNCER: "Choose your instrument!" (sounds.js choose-instrument) as the screen opens: VOICE_DELAY ms in, or
     when the START sound (select-<id>, the coin) has finished, whichever is later; the heading pulses with it and the
     music dips (Sfx.duck). At most once a minute (this browser tab, so also after coming back from a game). Only when
     a tap on this page already started the audio: a page loaded straight onto this screen stays quiet (it would come
     late, on the first tap). A tap on an instrument (or the arrows, CONTINUE, SELECT) before it starts cancels it.
     A panel over the screen (the first visit's "Create your player?", an UNLOCKED! card) holds it until it closes. */
  function announce(me, view, on) {
    const h = A.Sfx.announce('choose-instrument', {key: VOICE_KEY, gap: VOICE_GAP, delay: VOICE_DELAY, alive: () => live === me,
      // a panel on top ("Create your player?", an UNLOCKED! card, the creator, the LOCKER): the line waits for it
      hold: () => document.body.classList.contains('avc-open') || !!document.querySelector('body>.overlay:not([hidden]), #locker:not([hidden])'),
      onPlay: () => { const t = $('spTitle'); t.classList.remove('say'); void t.offsetWidth; t.classList.add('say'); }});
    on(view, 'pointerdown', e => { if (e.target.closest('.tile, #continueBtn, #selectBtn')) h.cancel(); }, {capture: true});
    on(window, 'keydown', e => { if (/^(Arrow|Enter$| $)/.test(e.key)) h.cancel(); }, {capture: true});
  }

  function open(game, opts = {}) {
  close();
  const ac = new AbortController(), on = (el, type, fn, o) => el.addEventListener(type, fn, Object.assign({signal: ac.signal}, o || {}));
  const view = $('selectView');
  const me = live = {game, ac};
  const still = fn => () => { if (live === me) fn(); };    // a timer that does nothing once the view has closed
  const pick = !game, forGame = pick ? opts.forGame || null : null;   // PICK MODE: the lobby's instrument, no game
  const gameLink = pick ? '#' : A.linkTo(ROOT + game.id + '/index.html', {need: null});
  view.className = 'sp-view ' + (pick ? 'trim-cyan trim2-pink pick' : A.trimClasses(game));   // this game's neon colors for the whole screen
  view.hidden = false; view.scrollTop = 0;
  document.title = pick ? `Choose Your Instrument · ${A.ARCADE_NAME || 'Band Arcade'}` : `Choose Your Instrument · ${game.name}`;
  $('spMsg').hidden = true; $('spMsg').innerHTML = '';
  $('spTitle').textContent = 'Choose your instrument';
  $('ready').hidden = true; $('ready').classList.remove('go');
  $('marquee').innerHTML = pick ? `<p class="sp-arcade neon" aria-hidden="true">${(A.ARCADE_NAME || 'Band Arcade').replace(/ (\S+)$/, ' <span>$1</span>')}</p>` : A.marqueeHTML(game, 'p');
  if (A.Marquee && !pick) A.Marquee.animate($('marquee').querySelector('.mq-live'), 'select');   // this game's sign, moving
  A.Sfx.use('select');                                      // this screen's sounds load after the first tap
  // the music manager: the room ambience fades out, the character-select music fades in (this game's own
  // select-music-<id> if Mat uploaded one, else select-music, else the built-in chiptune). No extra tap needed.
  A.Sfx.setAmbience(null); A.Sfx.setMusic(pick ? ['select-music'] : ['select-music-' + game.id, 'select-music'], {builtIn: true});

  announce(me, view, on);

  const two = !pick && (game.players > 1 || String(opts.players) === '2');
  let phase = 1;                                                      // 1 = Player 1 picks, 2 = Player 2 picks
  const ids = two ? A.PLAYERS.concat('cpu') : A.PLAYERS, info = id => A.memberById(id);
  const hornOf = () => phase === 2 ? A.store.opponentHornStart : A.store.hornStart;
  const group = id => A.groupFor(id, {hornStart: hornOf()});

  /* ---------- the grid ---------- */
  $('grid').innerHTML = ids.map(id => {
    const m = info(id) || {short: 'CPU', family: 'cpu'};
    return `<button type="button" class="tile fam-${m.family}${id === 'cpu' ? ' cpu' : ''}" data-id="${id}" style="--pc:var(--pt-${id})" tabindex="-1" aria-pressed="false" aria-label="${m.short}${id === 'cpu' ? ', play against the computer' : ', ' + FAMILY[m.family]}">` +
      `<span class="p1" aria-hidden="true">1P</span><span class="p2" aria-hidden="true">2P</span>${A.portraitHTML(id, {size: 'tile', label: m.short})}<span class="t-name">${m.short}</span></button>`;
  }).join('');
  const tiles = [...$('grid').querySelectorAll('.tile')];

  /* an unpitched player (the Snare Drum) only plays games marked `unpitched: true` in games.js, and games.js
     `noPlay` with `block: true` rules out more (Sustain Speedway: bells and snare can't hold a long tone) */
  const blocked = id => !pick && A.blockedBy(game, id);
  // pick mode: every instrument, except the ones the game the student wants doesn't suit (games.js fit)
  const canPlay = id => pick ? !forGame || A.gameFit(forGame, id).ok : !blocked(id) && (game.unpitched || !(info(id) && info(id).pitched === false));
  const np = (!pick && game.noPlay) || {};
  tiles.forEach(t => { if (!canPlay(t.dataset.id)) { t.classList.add('no-play'); t.setAttribute('aria-label', t.getAttribute('aria-label') + '. Not for this game: ' + (pick ? A.gameFit(forGame, t.dataset.id).tag : blocked(t.dataset.id) ? np.label : 'try Showtime Malfunction')); } });
  const gameLinkHTML = id => { const g = A.GAMES.find(x => x.id === id); return g ? `<a href="${A.startLink(g, ROOT)}">${g.name}</a>` : ''; };
  const snareMsg = id => {
    $('spMsg').hidden = false;
    if (pick) { const f = A.gameFit(forGame, id); $('spMsg').innerHTML = `<b>${f.tag || ''}</b> ${f.why || ''}`; return; }
    if ((id && blocked(id)) || opts.need === 'noplay') {      // games.js noPlay.block: its own message, with links
      const links = (np.games || [np.game]).map(gameLinkHTML).filter(Boolean);
      $('spMsg').innerHTML = `<b>${np.label}</b> Pick an instrument that can hold a long note for this game.${links.length ? ` Or go to ${links.join(' or ')}.` : ''}`;
      return;
    }
    const sm = A.GAMES.find(g => g.id === 'showtime-malfunction');
    $('spMsg').innerHTML = `<b>Snare drummers:</b> try ${sm ? `<a href="${A.playerLink(sm.id, ROOT)}">Showtime Malfunction</a>` : 'Showtime Malfunction'}! Pick a pitched instrument for this game.`;
  };

  /* returning students: CONTINUE AS, or (after the members update) a group to pick an exact instrument from */
  const saved = A.store.player, pending = A.store.pending;
  let cur = Math.max(0, ids.indexOf(saved && canPlay(saved) ? saved : 'flute'));
  $('continue').hidden = true; $('continue').querySelector('.c-label').textContent = 'Continue as';
  if (/^(pitched|noplay)$/.test(opts.need || '') || (saved && !canPlay(saved))) snareMsg(saved);
  if (saved && canPlay(saved)) {
    $('continue').hidden = false;
    $('continueName').textContent = info(saved).short;
    $('continuePic').innerHTML = A.avatarHTML({size: 'tile', member: saved, label: ''});         // the student's avatar (shared/avatar.js)
    $('continueBtn').href = gameLink;
    $('continueBtn').onclick = e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault(); confirm(saved, true);
    };
  } else if (pending && pending.group) {
    const g = A.getInstrument(pending.group), mine = g ? g.members.map(m => m.id) : [];
    tiles.forEach(t => t.classList.toggle('suggest', mine.includes(t.dataset.id)));
    if (mine.length) cur = ids.indexOf(mine[0]);
    $('spMsg').hidden = false;
    $('spMsg').innerHTML = `<b>Pick your exact instrument!</b> Every instrument has its own player now. You played as ${g ? g.name : 'a group'}: choose the one that's yours.`;
  } else if (pending && pending.reason === 'tonebells') {
    $('spMsg').hidden = false;
    $('spMsg').innerHTML = `<b>Choose your player again!</b> Colored Tone Bells has left the arcade. Pick your instrument (percussion players: choose Bells).`;
  }

  /* ---------- highlight + player card ---------- */
  function keyText(id) {
    const m = info(id), g = group(id);
    if (m.pitched === false) return 'Unpitched · counts every hit';
    const key = m.sounds === -24 ? 'Sounds 2 octaves higher' : KEY[A.music.mod12(g.t)] || 'Transposing';
    return `${key} · ${g.clef === 'bass' ? 'Bass' : 'Treble'} clef`;
  }
  function card() {
    const id = ids[cur];
    if (id === 'cpu') return cpuCard();
    const m = info(id), g = group(id);
    $('preview').style.setProperty('--pc', `var(--pt-${id})`);
    // the player's AVATAR wearing this instrument's skins (Player 2: the guest), with the instrument as a badge
    const guest = phase === 2;
    $('pvPic').innerHTML = A.avatarHTML({size: 'big', member: guest ? null : id, guest, label: `${guest ? 'Guest' : 'You'}, ${m.short}`});
    $('pvInst').innerHTML = A.portraitHTML(id, {size: 'tile', label: m.short});
    $('pvInst').hidden = false;
    playerLine();
    $('cFam').textContent = FAMILY[m.family]; $('cFam').className = 'card-fam fam-' + m.family;
    $('cName').textContent = m.short;
    $('cKey').textContent = keyText(id);
    $('cFive').textContent = m.pitched === false ? 'Plays: Showtime Malfunction, the Note Checker\'s Articulation test' : 'First five: ' + g.notes.map(noteLabel).join(' ');
    const n = A.store.starsForPlayer(id);
    $('cStars').textContent = n; $('cStarsWord').textContent = n === 1 ? 'star on this device' : 'stars on this device';
    $('hornToggle').hidden = id !== 'horn';
    $('hornToggle').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.horn === hornOf()));
    $('selectBtn').textContent = `Select ${m.short}`;
    $('skinsBtn').hidden = false;
    const lc = lockerCount(id);
    $('skinsCount').textContent = `${lc.have} of ${lc.total}`;
  }
  function cpuCard() {
    const n = A.store.player && !pick ? A.store.allStars(A.store.player, game.id) : 0;
    $('preview').style.setProperty('--pc', 'var(--pt-cpu)');
    $('pvPic').innerHTML = A.portraitSVG('cpu', {size: 'big', label: 'CPU'});
    $('pvInst').hidden = true; $('pvInst').innerHTML = '';
    $('cpTag').textContent = '2P'; $('cPlayer').textContent = 'The computer'; $('cAvBtns').hidden = true;
    $('cFam').textContent = '1 player'; $('cFam').className = 'card-fam fam-cpu';
    $('cName').textContent = 'CPU';
    $('cKey').textContent = 'Play against the computer: 8 rivals on a ladder.';
    $('cFive').textContent = 'The CPU plays silently, so only your notes count.';
    $('cStars').textContent = n; $('cStarsWord').textContent = n === 1 ? 'star on the ladder' : 'stars on the ladder';
    $('hornToggle').hidden = true;
    $('selectBtn').textContent = 'Select CPU';
    $('skinsBtn').hidden = true;
  }
  /* the name line and the avatar buttons: EDIT PLAYER (Player 1), or SURPRISE ME / EDIT for Player 2's guest */
  function playerLine() {
    const guest = phase === 2;
    $('cpTag').textContent = guest ? '2P' : '1P';
    $('cPlayer').textContent = A.Avatar.nameOf(guest ? A.Avatar.guest() : A.Avatar.get());
    $('cPlayer').dataset.avName = guest ? 'guest' : 'me';
    $('cAvBtns').hidden = false;
    $('editBtn').textContent = guest ? 'Edit guest' : 'Edit player';
    $('guestRand').hidden = !guest;
  }
  on($('editBtn'), 'click', () => {
    const guest = phase === 2, id = ids[cur];
    A.AvatarCreator.open({guest, member: info(id) ? id : null, onClose: () => { card(); $('editBtn').focus({preventScroll: true}); }});
  });
  on($('guestRand'), 'click', () => { A.Avatar.setGuest(A.Avatar.random()); A.Sfx.event('avatar-randomize'); card(); });
  function highlight(i, {focus = true, sound = true} = {}) {
    if (i < 0 || i >= ids.length || (phase === 1 && ids[i] === 'cpu')) return;       // CPU is only for Player 2
    const moved = i !== cur;
    cur = i;
    tiles.forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-pressed', k === i); t.tabIndex = k === i ? 0 : -1; });
    if (focus) tiles[i].focus({preventScroll: false});
    card();
    if (moved && sound) A.Sfx.event('tile-move');
  }

  tiles.forEach((t, k) => on(t, 'click', () => {
    if (k === cur && t.classList.contains('on')) confirm(ids[k]); else highlight(k);
  }));
  on($('selectBtn'), 'click', () => confirm(ids[cur]));
  $('hornToggle').querySelectorAll('button').forEach(b => on(b, 'click', () => {
    (phase === 2 ? A.store.setOpponentHornStart(b.dataset.horn) : A.store.setHornStart(b.dataset.horn)); A.Sfx.event('ui-toggle'); card();
  }));

  /* Chromebooks: ←/→ move along the order, ↑/↓ to the nearest tile in the row above/below as laid out on screen
     (the landscape grid's last row is centered, so rows don't line up column by column), Enter selects */
  function vertical(dir) {
    // layout positions (offsetTop/Left), not the screen box: the highlighted tile is scaled up a little
    const box = t => ({top: t.offsetTop, left: t.offsetLeft, width: t.offsetWidth, height: t.offsetHeight}), here = box(tiles[cur]), cx = here.left + here.width / 2;
    let best = -1, bestRow = Infinity, bestDx = Infinity;
    tiles.forEach((t, k) => {
      if (k === cur || !t.offsetParent || (phase === 1 && ids[k] === 'cpu')) return;
      const b = box(t), dy = (b.top - here.top) * dir;
      if (dy < here.height / 2) return;                                    // not in a row in that direction
      const dx = Math.abs(b.left + b.width / 2 - cx);
      if (dy < bestRow - here.height / 2 || (Math.abs(dy - bestRow) < here.height / 2 && dx < bestDx)) { best = k; bestRow = dy; bestDx = dx; }
    });
    return best < 0 ? cur : best;
  }
  on(window, 'keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || leaving || document.querySelector('.overlay:not([hidden]), .av-creator') || !$('pressStart').hidden) return;   // the locker, an UNLOCKED! card or Create Your Player is open
    const onButton = e.target.closest && e.target.closest('button, a');
    if (onButton && !onButton.classList.contains('tile') && (e.key === 'Enter' || e.key === ' ')) return;   // SELECT, horn toggle, sound…
    const side = {ArrowLeft: -1, ArrowRight: 1}[e.key], up = {ArrowUp: -1, ArrowDown: 1}[e.key];
    if (side) { e.preventDefault(); highlight(Math.min(ids.length - 1, Math.max(0, cur + side))); }
    else if (up) { e.preventDefault(); highlight(vertical(up)); }
    else if (e.key === 'Enter') { e.preventDefault(); confirm(ids[cur]); }
  });

  /* ---------- confirm: a flash, PLAYER n READY, then the game (or Player 2's turn to pick) ---------- */
  let leaving = false;
  function confirm(id, viaContinue) {
    if (!canPlay(id)) { snareMsg(id); A.Sfx.event('note-wrong'); $('spMsg').scrollIntoView({block: 'nearest'}); return; }
    if (leaving || (phase === 1 && id === 'cpu')) return;
    leaving = true;
    if (phase === 1) A.store.setPlayer(id); else A.store.setOpponent(id);
    tiles.forEach(t => t.classList.toggle('chosen', t.dataset.id === id));
    A.Sfx.event(viaContinue ? 'player-continue' : 'player-select');
    const r = $('ready');
    r.querySelector('span').textContent = `Player ${phase}`;
    r.classList.toggle('p2', phase === 2);
    r.hidden = false; r.classList.remove('go'); void r.offsetWidth; r.classList.add('go');
    setTimeout(still(() => A.Sfx.event('player-ready')), 260);
    const wait = reduced.matches ? 700 : 1100;
    if (two && phase === 1) setTimeout(still(() => { r.hidden = true; startPlayer2(id); leaving = false; }), wait);
    else if (pick) setTimeout(still(() => { leaving = false; if (opts.onDone) opts.onDone(id); }), wait);   // back to the lobby
    else {
      setTimeout(still(() => A.Sfx.setMusic(null, {fade: .8})), Math.max(0, wait - 800));   // the music fades out (0.8 s) as the game opens
      setTimeout(still(() => { location.href = gameLink; }), wait);
    }
  }
  /* Player 2: the 1P tile stays marked, the highlight becomes magenta 2P, and CPU joins the grid */
  function startPlayer2(p1) {
    phase = 2;
    A.Sfx.event('player2-join');
    view.classList.add('phase2');
    $('spTitle').textContent = 'Player 2 — Press Start';
    tiles.forEach(t => { t.classList.toggle('p1-lock', t.dataset.id === p1); t.classList.remove('chosen', 'suggest'); });
    $('spMsg').hidden = true;
    const opp = A.store.opponent && canPlay(A.store.opponent) ? A.store.opponent : null;
    $('continue').hidden = !opp;
    if (opp) {
      $('continue').querySelector('.c-label').textContent = 'Same opponent';
      $('continueName').textContent = opp === 'cpu' ? 'CPU' : info(opp).short;
      $('continuePic').innerHTML = opp === 'cpu' ? A.portraitHTML(opp, {size: 'tile', label: 'CPU'}) : A.avatarHTML({size: 'tile', guest: true, member: null, label: ''});
      $('continueBtn').onclick = e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return; e.preventDefault(); confirm(opp, true); };
    }
    highlight(Math.max(0, ids.indexOf(opp || (p1 === 'flute' ? 'oboe' : 'flute'))), {sound: false});
    (opp ? $('continueBtn') : tiles[cur]).focus({preventScroll: true});
    view.scrollTop = 0;
  }
  on(window, 'pageshow', e => { if (e.persisted) { leaving = false; $('ready').hidden = true; $('ready').classList.remove('go'); } });   // back button

  /* ---------- THE LOCKER: avatar items (unlock rules in shared/avatar-parts.js; worn everywhere) and the instrument's
     skins (shared/skins.js; per instrument). Tabs OUTFIT · HATS · EXTRAS · PETS · EFFECTS; locked = a dark silhouette
     + what earns it. Live preview on the big avatar. Player 2's turn dresses the GUEST avatar. ---------- */
  const P = window.AVATAR_PARTS, AV = A.Avatar;
  const LK_TABS = {
    outfit: [{field: 'top', label: 'Tops', list: () => P.TOPS}, {field: 'hairColor', label: 'Hair colors', list: () => P.HAIR_COLORS}],
    hats: [{field: 'head', label: 'Hats and head coverings', list: () => P.HEADS}],
    extras: [{skin: 'acc', label: 'Accessory', note: 'worn with this instrument'}, {field: 'back', label: 'On your back', list: () => P.BACKS},
             {field: 'eyes', label: 'Expressions: eyes', list: () => P.EYES}, {field: 'mouth', label: 'Expressions: mouth', list: () => P.MOUTHS}],
    pets: [{field: 'pet', label: 'Pets', note: 'they float beside you', list: () => P.PETS}],
    effects: [{skin: 'color', label: 'Glow effects', note: 'worn with this instrument'}],
  };
  let lockerFor = null, lkTab = 'outfit';
  const lkGuest = () => phase === 2;
  const lkAvatar = () => lkGuest() ? AV.guest() : AV.get();
  /** how many locker items are open: {have, total} (avatar items + this instrument's skins) */
  function lockerCount(id) {
    const items = AV.items(), skins = A.Skins.LIST.filter(s => !s.unlock.always);
    return {have: items.filter(it => AV.isUnlocked(it.field, it.id)).length + skins.filter(s => A.Skins.isUnlocked(s, id)).length, total: items.length + skins.length};
  }
  function openLocker() {
    const id = ids[cur]; if (!info(id)) return;
    lockerFor = id;
    $('lkTitle').textContent = lkGuest() ? `Guest · ${info(id).short}` : `${AV.nameOf(lkAvatar())} · ${info(id).short}`;
    drawLocker();
    $('locker').hidden = false;
    $('lkTab-' + lkTab).focus();
  }
  const LOCK = '<svg class="lk-lock" viewBox="0 0 20 24" aria-hidden="true"><rect x="3" y="10" width="14" height="12" rx="2"/><path d="M6.5 10V7a3.5 3.5 0 0 1 7 0v3" fill="none"/></svg>';
  function lkButton({attrs, name, open, pressed, need, prog, pic}) {
    return `<button type="button" class="sk-opt${open ? '' : ' locked'}" ${attrs} aria-pressed="${pressed}"` +
      ` aria-label="${name}${open ? (pressed ? ', wearing' : '') : ', locked. ' + need}"${open ? '' : ' aria-disabled="true"'}>` +
      `<span class="sk-o-pic" aria-hidden="true">${pic}${open ? '' : LOCK}</span>` +
      `<b>${name}</b>${open ? '' : `<small>${need}${prog ? `<br>${prog}` : ''}</small>`}</button>`;
  }
  function drawLocker() {
    const id = lockerFor, eq = A.Skins.equipped(id), m = info(id), av = lkAvatar(), guest = lkGuest();
    $('lkPic').innerHTML = A.avatarHTML({size: 'big', member: id, guest});
    $('lkNow').textContent = `Wearing: ${A.Skins.get(eq.color).name}${eq.acc ? ' + ' + A.Skins.get(eq.acc).name : ''}` +
      (av.pet !== 'none' ? ` · Pet: ${(P.PETS.find(p => p.id === av.pet) || {}).name}` : '');
    $('lkTabs').querySelectorAll('[role="tab"]').forEach(b => { const on = b.dataset.tab === lkTab; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    $('lkBody').setAttribute('aria-labelledby', 'lkTab-' + lkTab);
    $('lkBody').innerHTML = LK_TABS[lkTab].map((g, gi) => {
      let html;
      if (g.skin) {
        const list = g.skin === 'color' ? A.Skins.colors() : [{id: 'none', kind: 'acc', name: 'None', unlock: {always: true}}].concat(A.Skins.accessories());
        html = list.map(s => {
          const open = A.Skins.isUnlocked(s, id), skin = g.skin === 'color' ? {color: s.id, acc: eq.acc} : {color: eq.color, acc: s.id === 'none' ? null : s.id};
          const pressed = g.skin === 'color' ? s.id === eq.color : (s.id === 'none' ? !eq.acc : s.id === eq.acc);
          return lkButton({attrs: `data-kind="${s.kind}" data-skin="${s.id}"`, name: s.name, open, pressed, need: open ? '' : A.Skins.requirement(s), prog: open ? '' : A.Skins.progress(s, id),
            pic: s.id === 'none' ? '<span class="lk-none" aria-hidden="true">∅</span>' : A.avatarHTML({size: 'tile', member: id, guest, skin, label: m.short})});
        }).join('');
      } else {
        html = g.list().map(p => {
          const open = AV.isUnlocked(g.field, p.id);
          return lkButton({attrs: `data-field="${g.field}" data-item="${p.id}"`, name: p.name, open, pressed: av[g.field] === p.id,
            need: open ? '' : AV.requirement(g.field, p.id), prog: open ? '' : AV.progress(g.field, p.id),
            pic: A.avatarHTML({size: 'tile', member: id, avatar: Object.assign({}, av, {[g.field]: p.id}), label: ''})});
        }).join('');
      }
      return `<h3 class="lk-sub" id="lkG${gi}">${g.label}${g.note ? ` <small>(${g.note})</small>` : ''}</h3><div class="lk-grid" role="group" aria-labelledby="lkG${gi}">${html}</div>`;
    }).join('');
    const c = lockerCount(id); $('skinsCount').textContent = `${c.have} of ${c.total}`;
  }
  function pickSkin(b) {
    const id = lockerFor, name = b.querySelector('b').textContent;
    if (b.classList.contains('locked')) {
      A.Sfx.event('note-wrong');
      $('lkNow').textContent = `${name}: ${b.dataset.item ? AV.requirement(b.dataset.field, b.dataset.item) : A.Skins.requirement(A.Skins.get(b.dataset.skin))}`;
      return;
    }
    let sel;
    if (b.dataset.item) {                                        // an avatar item: the avatar wears it everywhere
      const av = lkAvatar(); av[b.dataset.field] = b.dataset.item;
      if (lkGuest()) AV.setGuest(av); else AV.set(av);
      A.Sfx.event('skin-equip');
      sel = `[data-field="${b.dataset.field}"][data-item="${b.dataset.item}"]`;
    } else {
      const s = b.dataset.skin;
      A.Skins.equip(id, b.dataset.kind === 'acc' ? {acc: s === 'none' ? null : s} : {color: s});
      sel = `[data-kind="${b.dataset.kind}"][data-skin="${s}"]`;
    }
    const scroll = $('locker').scrollTop;
    drawLocker(); refreshPortraits(id);
    $('locker').scrollTop = scroll;
    const again = document.querySelector('#locker .sk-opt' + sel);
    if (again) again.focus({preventScroll: true});
  }
  function lkShow(tab, focus) {
    lkTab = tab; drawLocker();
    if (focus) { $('lkTab-' + tab).focus(); A.Sfx.event('ui-toggle'); }
  }
  /** redraw every portrait of this instrument on the page (tile, preview, CONTINUE AS) with its new skin */
  function refreshPortraits(id) {
    A.Skins.refresh(id);
    if (ids[cur] === id) card();
  }
  on($('skinsBtn'), 'click', openLocker);
  on($('backupBtn'), 'click', () => A.Backup && A.Backup.open());       // shared/backup.js
  on($('lkBody'), 'click', e => { const b = e.target.closest('.sk-opt'); if (b) pickSkin(b); });
  on($('lkTabs'), 'click', e => { const b = e.target.closest('[role="tab"]'); if (b) lkShow(b.dataset.tab, true); });
  on($('lkTabs'), 'keydown', e => {                             // ←/→ between the tabs
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const list = Object.keys(LK_TABS), i = list.indexOf(lkTab);
    e.preventDefault(); lkShow(list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length], true);
  });
  const closeLocker = () => { $('locker').hidden = true; lockerFor = null; $('skinsBtn').focus({preventScroll: true}); };
  on($('lkDone'), 'click', closeLocker);
  on($('locker'), 'click', e => { if (e.target === $('locker')) closeLocker(); });
  on(window, 'keydown', e => { if (e.key === 'Escape' && !$('locker').hidden) closeLocker(); });

  highlight(cur, {focus: false, sound: false});
  (saved && canPlay(saved) ? $('continueBtn') : tiles[cur]).focus({preventScroll: true});
  /* skins already earned (old progress counts too) that this student hasn't seen yet: one UNLOCKED! card. On a
     device's first visit, "Create your player?" comes first (once; skippable: the random avatar stays). */
  const catchUp = () => { if (live === me && saved) A.Skins.catchUp(saved, {onEquip: () => refreshPortraits(saved)}); };
  if (!A.AvatarCreator.offer({onDone: still(() => { card(); catchUp(); })})) catchUp();
  }

  function close() {
    if (!live) return;
    live.ac.abort(); live = null;
    if (A.Marquee) A.Marquee.animate(null, 'select');
    const v = $('selectView');
    v.hidden = true; $('locker').hidden = true; $('ready').hidden = true;
    $('grid').innerHTML = '';
    document.title = A.ARCADE_NAME || 'Band Arcade';
  }
  A.SelectView = {open, close, get isOpen() { return !!live; }, get game() { return live && live.game; }};
})(window.Arcade);
