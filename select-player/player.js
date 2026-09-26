/* Select Player: choose an instrument for the game named in ?game=<id>, then go straight to it.
   Choosing saves the instrument on this device (Arcade.store.setInstId). */
(function (A) {
  "use strict";
  const {$} = A;
  const game = A.GAMES.find(g => g.id === A.params.get('game'));
  if (!game) { location.replace(A.homeLink('')); return; }      // missing or unknown game: back to the arcade
  if (game.player) { location.replace(A.startLink(game)); return; }   // a game with its own instrument: nothing to choose

  const gameLink = A.linkTo('../' + game.id + '/index.html');
  const {noteLabel} = A.music;
  const notesOf = inst => inst.notes.map(noteLabel).join(' ');
  function choose(id) { A.store.setInstId(id); A.Sfx.playThenGo('blip', gameLink); }   // blip, then the game (silent)

  document.title = `Select Player · ${game.name}`;
  $('homeLink').href = A.homeLink(game.id);
  A.Sfx.mountControls($('soundCtl'));
  document.body.className = A.trimClasses(game);          // this game's neon colors for the whole page
  $('marquee').innerHTML = A.marqueeHTML(game, 'p');
  $('gameSkill').textContent = game.skill ? `${game.skill} · ${game.name}` : game.name;

  const saved = A.currentInstrument();
  if (saved) {
    $('continue').hidden = false;
    $('continueName').textContent = saved.name;
    $('continueNotes').textContent = 'Plays ' + notesOf(saved);
    $('continueBtn').href = gameLink;
    $('continueBtn').addEventListener('click', e => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
      e.preventDefault(); A.Sfx.playThenGo('blip', gameLink);
    });
    $('pickHelp').hidden = true;
  }

  $('roster').innerHTML = A.INSTRUMENTS.map((inst, i) => {
    const me = saved && saved.id === inst.id;
    return `<button class="player${me ? ' me' : ''}" data-id="${inst.id}" aria-label="${inst.name}. Plays ${notesOf(inst)}${me ? '. Your current player' : ''}">` +
      `<span class="p-num" aria-hidden="true">${me ? 'You' : 'P' + (i + 1)}</span>` +
      `<span class="p-portrait" aria-hidden="true">${A.staffSVG(inst.clef, inst.notes.map((n, k) => ({n, x: 110 + k * 62})), {label: ''})}</span>` +
      `<span class="p-name">${inst.name}</span>` +
      `<span class="p-notes">${notesOf(inst)}</span></button>`;
  }).join('');
  $('roster').querySelectorAll('.player').forEach(b => b.addEventListener('click', () => choose(b.dataset.id)));
  (saved ? $('continueBtn') : $('roster').querySelector('.player')).focus({preventScroll: true});
})(window.Arcade);
