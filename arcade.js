/* Arcade home page: pick an instrument, then a game. */
(function (A) {
  "use strict";
  const {$} = A;

  const ICONS = {
    ghost: () => A.ghostSVG('', ''),
    tuner: () => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M6 30a14 14 0 0 1 28 0" fill="none" stroke="#a3b4d2" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="30" x2="27" y2="15" stroke="#f0b43c" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="30" r="3.5" fill="#f0b43c"/></svg>`,
  };

  $('arcadeName').innerHTML = A.ARCADE_NAME.replace(/ (\S+)$/, ' <span>$1</span>');
  $('arcadeTagline').textContent = A.ARCADE_TAGLINE;
  document.title = A.ARCADE_NAME;
  $('heroGhosts').innerHTML = A.ghostSVG('B♭') + A.ghostSVG('C') + A.ghostSVG('D');
  $('demoNote').hidden = !A.DEMO;

  function render() {
    const inst = A.currentInstrument();
    $('instGrid').innerHTML = A.INSTRUMENTS.map(i =>
      `<button class="inst" data-id="${i.id}" aria-pressed="${!!inst && inst.id === i.id}">` +
      `<b>${i.name}</b><small>Plays ${i.notes.map(A.music.noteLabel).join(' ')}</small></button>`).join('');
    $('instGrid').querySelectorAll('.inst').forEach(b => b.addEventListener('click', () => {
      A.store.setInstId(b.dataset.id); render();
      $('stepGame').scrollIntoView({behavior: 'smooth', block: 'start'});
    }));

    $('gameGrid').innerHTML = A.GAMES.map(g => {
      let prog = '';
      if (inst) {
        prog = g.maxStars
          ? `<span class="stars"><span class="on">★</span></span><span><b>${A.store.totalStars(g.id, inst.id)}</b> of ${g.maxStars} stars</span>`
          : `<span>${inst.shortName}</span><span>Open →</span>`;
      } else {
        prog = `<span>Choose an instrument first</span>`;
      }
      return `<a class="game${inst ? '' : ' off'}" href="${A.link(g.id + '/index.html')}" ${inst ? '' : 'aria-disabled="true" tabindex="-1"'}>
        <span class="ico">${(ICONS[g.icon] || ICONS.ghost)()}</span>
        <span class="tag">${g.skill}</span>
        <h2>${g.name}</h2>
        <p>${g.blurb}</p>
        <span class="prog">${prog}</span>
      </a>`;
    }).join('');
  }
  render();
})(window.Arcade);
