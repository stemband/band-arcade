/* Arcade home page (the lobby): pick an instrument ("Select player"), then a game cabinet. */
(function (A) {
  "use strict";
  const {$} = A;

  const ICONS = {
    ghost: () => A.ghostSVG('', 'bob'),
    tuner: () => `<svg class="tuner" viewBox="0 0 40 40" aria-hidden="true"><path class="arc" d="M6 30a14 14 0 0 1 28 0" fill="none" stroke-width="3" stroke-linecap="round"/><line class="hand" x1="20" y1="30" x2="27" y2="15" stroke-width="3" stroke-linecap="round"/><circle class="hub" cx="20" cy="30" r="3.5"/></svg>`,
    storm: () => `<svg class="storm" viewBox="0 0 40 40" aria-hidden="true"><g class="lines" stroke-width="1.5"><line x1="2" y1="14" x2="38" y2="14"/><line x1="2" y1="21" x2="38" y2="21"/><line x1="2" y1="28" x2="38" y2="28"/></g><path class="bolt" d="M17 3L8 22H15L12 37L28 15H20L24 3Z"/><ellipse class="head" cx="31" cy="27" rx="4.5" ry="3.3" transform="rotate(-20 31 27)"/><line class="stem" x1="35" y1="26" x2="35" y2="10" stroke-width="2"/></svg>`,
  };
  const COLORS = ['pink', 'cyan', 'yellow'];

  $('arcadeName').innerHTML = A.ARCADE_NAME.replace(/ (\S+)$/, ' <span>$1</span>');
  $('arcadeTagline').textContent = A.ARCADE_TAGLINE;
  document.title = A.ARCADE_NAME;
  $('demoNote').hidden = !A.DEMO;

  function render() {
    const inst = A.currentInstrument();
    $('instGrid').innerHTML = A.INSTRUMENTS.map(i =>
      `<button class="inst" data-id="${i.id}" aria-pressed="${!!inst && inst.id === i.id}">` +
      `<span class="led" aria-hidden="true"></span>` +
      `<span class="inst-text"><b>${i.name}</b><small>Plays ${i.notes.map(A.music.noteLabel).join(' ')}</small></span></button>`).join('');
    $('instGrid').querySelectorAll('.inst').forEach(b => b.addEventListener('click', () => {
      A.store.setInstId(b.dataset.id); render();
      $('stepGame').closest('section').scrollIntoView({behavior: 'smooth', block: 'start'});
    }));

    $('gameGrid').innerHTML = A.GAMES.map(g => {
      const color = COLORS.includes(g.color) ? g.color : 'cyan';
      let panel;
      if (!inst) {
        panel = `<span class="cab-info">Select a player first</span>`;
      } else {
        const info = g.maxStars
          ? `<span class="cab-info cab-stars"><b>${A.store.totalStars(g.id, inst.id)}</b> / ${g.maxStars} <span class="star" aria-hidden="true">★</span><span class="sr"> stars</span></span>`
          : `<span class="cab-info">Free play</span>`;
        panel = info + `<span class="cab-start" aria-hidden="true">Start</span>`;
      }
      return `<a class="cab cab-${color}${inst ? '' : ' off'}" href="${A.link(g.id + '/index.html')}" ${inst ? '' : 'aria-disabled="true" tabindex="-1"'}>
        <h3 class="cab-marquee"><span>${g.name}</span></h3>
        <span class="cab-screen">
          <span class="ico">${(ICONS[g.icon] || ICONS.ghost)()}</span>
          <span class="tag">${g.skill}</span>
          <span class="blurb">${g.blurb}</span>
        </span>
        <span class="cab-panel">${panel}</span>
      </a>`;
    }).join('');
  }
  render();
})(window.Arcade);
