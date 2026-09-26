/* Select Player: a fighting-game character select for the game named in ?game=<id>. One tile per instrument
   (Arcade.PLAYERS), each with its neon portrait (shared/portraits.js). The highlighted tile has a pulsing neon
   outline and a 1P marker; the big preview and player card show it. Tap a tile to highlight it, tap it again
   (or SELECT) to choose; arrow keys move, Enter selects. Choosing saves the instrument MEMBER
   (Arcade.store.setPlayer); its player group follows (Arcade.groupFor), so every game's saved stars stay put. */
(function (A) {
  "use strict";
  const {$} = A;
  const game = A.GAMES.find(g => g.id === A.params.get('game'));
  if (!game) { location.replace(A.homeLink('')); return; }      // missing or unknown game: back to the arcade
  if (game.player) { location.replace(A.startLink(game)); return; }   // a game with its own instrument: nothing to choose

  const gameLink = A.linkTo('../' + game.id + '/index.html');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const {noteLabel} = A.music;
  const FAMILY = {woodwind: 'Woodwind', brass: 'Brass', percussion: 'Percussion'};
  const KEY = {0: 'Concert pitch', 2: 'B♭ instrument', 7: 'F instrument', 9: 'E♭ instrument'};

  document.title = `Select Player · ${game.name}`;
  $('homeLink').href = A.homeLink(game.id);
  A.Sfx.mountControls($('soundCtl'));
  document.body.className = A.trimClasses(game);          // this game's neon colors for the whole page
  $('marquee').innerHTML = A.marqueeHTML(game, 'p');

  const ids = A.PLAYERS, info = id => A.memberById(id);
  const group = id => A.groupFor(id, {hornStart: A.store.hornStart});

  /* ---------- the grid ---------- */
  $('grid').innerHTML = ids.map(id => {
    const m = info(id);
    return `<button type="button" class="tile fam-${m.family}" data-id="${id}" style="--pc:var(--pt-${id})" tabindex="-1" aria-pressed="false" aria-label="${m.short}, ${FAMILY[m.family]}">` +
      `<span class="p1" aria-hidden="true">1P</span>${A.portraitSVG(id, {size: 'tile'})}<span class="t-name">${m.short}</span></button>`;
  }).join('');
  const tiles = [...$('grid').querySelectorAll('.tile')];

  /* returning students: CONTINUE AS, or (after the members update) a group to pick an exact instrument from */
  const saved = A.store.player, pending = A.store.pending;
  let cur = Math.max(0, ids.indexOf(saved || 'flute'));
  if (saved) {
    $('continue').hidden = false;
    $('continueName').textContent = info(saved).short;
    $('continuePic').innerHTML = A.portraitSVG(saved, {size: 'tile'});
    $('continueBtn').href = gameLink;
    $('continueBtn').addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault(); confirm(saved);
    });
  } else if (pending && pending.group) {
    const g = A.getInstrument(pending.group), mine = g ? g.members.map(m => m.id) : [];
    tiles.forEach(t => t.classList.toggle('suggest', mine.includes(t.dataset.id)));
    if (mine.length) cur = ids.indexOf(mine[0]);
    $('msg').hidden = false;
    $('msg').innerHTML = `<b>Pick your exact instrument!</b> Every instrument has its own player now. You played as ${g ? g.name : 'a group'}: choose the one that's yours.`;
  } else if (pending && pending.reason === 'tonebells') {
    $('msg').hidden = false;
    $('msg').innerHTML = `<b>Choose your player again!</b> Colored Tone Bells has left the arcade. Pick your instrument (percussion players: choose Bells).`;
  }

  /* ---------- highlight + player card ---------- */
  function keyText(id) {
    const m = info(id), g = group(id);
    const key = m.sounds === -24 ? 'Sounds 2 octaves higher' : KEY[A.music.mod12(g.t)] || 'Transposing';
    return `${key} · ${g.clef === 'bass' ? 'Bass' : 'Treble'} clef`;
  }
  function card() {
    const id = ids[cur], m = info(id), g = group(id);
    $('preview').style.setProperty('--pc', `var(--pt-${id})`);
    $('pvPic').innerHTML = A.portraitSVG(id, {size: 'big', label: m.short});
    $('cFam').textContent = FAMILY[m.family]; $('cFam').className = 'card-fam fam-' + m.family;
    $('cName').textContent = m.short;
    $('cKey').textContent = keyText(id);
    $('cFive').textContent = 'First five: ' + g.notes.map(noteLabel).join(' ');
    const n = A.store.starsForPlayer(id);
    $('cStars').textContent = n; $('cStarsWord').textContent = n === 1 ? 'star on this device' : 'stars on this device';
    $('hornToggle').hidden = id !== 'horn';
    $('hornToggle').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.horn === A.store.hornStart));
    $('selectBtn').textContent = `Select ${m.short}`;
  }
  function highlight(i, {focus = true, sound = true} = {}) {
    if (i < 0 || i >= ids.length) return;
    const moved = i !== cur;
    cur = i;
    tiles.forEach((t, k) => { t.classList.toggle('on', k === i); t.setAttribute('aria-pressed', k === i); t.tabIndex = k === i ? 0 : -1; });
    if (focus) tiles[i].focus({preventScroll: false});
    card();
    if (moved && sound) A.Sfx.event('tile-move');
  }

  tiles.forEach((t, k) => t.addEventListener('click', () => {
    if (k === cur && t.classList.contains('on')) confirm(ids[k]); else highlight(k);
  }));
  $('selectBtn').addEventListener('click', () => confirm(ids[cur]));
  $('hornToggle').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    A.store.setHornStart(b.dataset.horn); A.Sfx.event('tile-move'); card();
  }));

  /* Chromebooks: arrows move the highlight around the grid (as many columns as the layout shows), Enter selects */
  const cols = () => getComputedStyle($('grid')).gridTemplateColumns.split(' ').filter(Boolean).length || 5;
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || leaving) return;
    const onButton = e.target.closest && e.target.closest('button, a');
    if (onButton && !onButton.classList.contains('tile') && (e.key === 'Enter' || e.key === ' ')) return;   // SELECT, horn toggle, sound…
    const c = cols(), step = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -c, ArrowDown: c}[e.key];
    if (step) { e.preventDefault(); highlight(Math.min(ids.length - 1, Math.max(0, cur + step))); }
    else if (e.key === 'Enter') { e.preventDefault(); confirm(ids[cur]); }
  });

  /* ---------- confirm: a flash, PLAYER 1 READY, then the game ---------- */
  let leaving = false;
  function confirm(id) {
    if (leaving) return;
    leaving = true;
    A.store.setPlayer(id);
    tiles.forEach(t => t.classList.toggle('chosen', t.dataset.id === id));
    A.Sfx.event('player-select');
    const r = $('ready');
    r.hidden = false; void r.offsetWidth; r.classList.add('go');
    setTimeout(() => A.Sfx.event('player-ready'), 260);
    setTimeout(() => { location.href = gameLink; }, reduced.matches ? 700 : 1100);
  }
  addEventListener('pageshow', e => { if (e.persisted) { leaving = false; $('ready').hidden = true; $('ready').classList.remove('go'); } });   // back button

  highlight(cur, {focus: false, sound: false});
  (saved ? $('continueBtn') : tiles[cur]).focus({preventScroll: true});
})(window.Arcade);
