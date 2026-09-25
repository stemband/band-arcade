/* Arcade home page: the arcade floor. Students pick a GAME here (no instruments on this page).
   A carousel of cabinets: arrows, swipe, ←/→ keys, the indicator lights, or a tap on a side cabinet
   turn a cabinet to the front. START goes to select-player/index.html?game=<id>. */
(function (A) {
  "use strict";
  const {$} = A;
  const GAMES = A.GAMES, N = GAMES.length;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  $('arcadeName').innerHTML = A.ARCADE_NAME.replace(/ (\S+)$/, ' <span>$1</span>');
  $('arcadeTagline').textContent = A.ARCADE_TAGLINE;
  document.title = A.ARCADE_NAME;
  $('demoNote').hidden = !A.DEMO;
  if (!N) return;

  /* The ring of cabinets. With fewer than 5 games the list repeats (only visually) so both
     sides of the aisle always have a neighbor. ring[r] is GAMES[r % N]. */
  const M = N >= 5 ? N : N * Math.ceil(5 / N);
  const aisle = $('aisle');
  aisle.innerHTML = Array.from({length: M}, (_, r) => {
    const g = GAMES[r % N];
    return `<div class="slot" data-r="${r}">${A.cabinetHTML(g, {href: A.playerLink(g.id, '')})}</div>`;
  }).join('');
  const slots = [...aisle.querySelectorAll('.slot')];

  $('lights').innerHTML = GAMES.map((g, i) =>
    `<button class="light" data-i="${i}" aria-label="${g.name}"><i></i></button>`).join('');
  const lights = [...$('lights').querySelectorAll('.light')];

  const wrap = d => { d = ((d % M) + M) % M; return d > M / 2 ? d - M : d; };   // ring offset, −M/2 < d ≤ M/2
  let cur = Math.max(0, GAMES.findIndex(g => '#' + g.id === location.hash));

  function place() {
    const hadFocus = aisle.contains(document.activeElement);
    slots.forEach((el, r) => {
      let d = wrap(r - cur);
      d = Math.max(-3, Math.min(3, d));
      const prev = el.dataset.d === undefined ? d : +el.dataset.d;
      el.classList.toggle('jump', Math.abs(d - prev) > 1);   // wrapping from one end of the aisle to the other: no fly-across
      el.dataset.d = d;
      const front = d === 0;
      el.setAttribute('aria-hidden', front ? 'false' : 'true');
      el.querySelector('.cab-start').tabIndex = front ? 0 : -1;
    });
    const g = GAMES[cur % N], frontEl = slots[cur];
    A.setAttract(frontEl.querySelector('.cab'), g);
    if (hadFocus) frontEl.querySelector('.cab-start').focus({preventScroll: true});
    if (reduced.matches) { aisle.classList.remove('fade'); void aisle.offsetWidth; aisle.classList.add('fade'); }

    $('infoSkill').textContent = g.skill || '';
    $('infoName').textContent = g.name;
    $('infoBlurb').textContent = g.blurb || '';
    const inst = A.currentInstrument(), hs = $('hiscore');
    hs.hidden = !(inst && g.maxStars);
    if (!hs.hidden) {
      hs.innerHTML = `<b>Hi-score:</b> ${A.store.totalStars(g.id, inst.id)} / ${g.maxStars} ` +
        `<span class="star" aria-hidden="true">★</span><span class="sr">stars</span> <span class="who">(${inst.shortName})</span>`;
    }
    lights.forEach((b, i) => b.setAttribute('aria-current', i === cur % N ? 'true' : 'false'));
    try { history.replaceState(null, '', '#' + g.id); } catch (e) { /* some browsers block this on local files */ }
  }

  const go = step => { cur = ((cur + step) % M + M) % M; place(); };
  /** turn game i to the front, taking the shortest way round */
  function goTo(i) {
    let best = cur, bestD = Infinity;
    for (let r = i; r < M; r += N) { const d = Math.abs(wrap(r - cur)); if (d < bestD) { bestD = d; best = r; } }
    cur = best; place();
  }

  $('prevBtn').addEventListener('click', () => go(-1));
  $('nextBtn').addEventListener('click', () => go(1));
  lights.forEach(b => b.addEventListener('click', () => goTo(+b.dataset.i)));

  document.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });

  /* a tap on a side cabinet turns it to the front (its START does nothing until then) */
  let swiped = false;
  aisle.addEventListener('click', e => {
    if (swiped) { swiped = false; e.preventDefault(); e.stopPropagation(); return; }
    const slot = e.target.closest('.slot'); if (!slot) return;
    const d = +slot.dataset.d;
    if (d !== 0) { e.preventDefault(); go(d); }
  }, true);

  /* swipe left/right. touch-action: pan-y (arcade.css) leaves vertical scrolling to the browser. */
  let sx = 0, sy = 0, sid = null;
  aisle.addEventListener('pointerdown', e => { sid = e.pointerId; sx = e.clientX; sy = e.clientY; swiped = false; });
  aisle.addEventListener('pointerup', e => {
    if (e.pointerId !== sid) return;
    sid = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) { swiped = true; go(dx < 0 ? 1 : -1); setTimeout(() => { swiped = false; }, 350); }
  });
  aisle.addEventListener('pointercancel', () => { sid = null; });
  aisle.addEventListener('dragstart', e => e.preventDefault());

  place();
})(window.Arcade);
