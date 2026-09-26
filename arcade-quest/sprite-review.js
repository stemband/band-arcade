/* ARCADE QUEST: THE SPRITE REVIEW SHEET (for Mat). arcade-quest/index.html?sprites
   Every instrument's band kid in every pose and frame: CARRY facing right (idle ×2, walk ×4; walking left is the
   same, mirrored), facing the viewer and facing away (idle ×2, walk ×4 each), and PLAYING (2 frames: breathing,
   or for bells and snare mallets up / striking). Each frame is shown at 1× and at the chosen zoom, on a dark or a
   light background (or both), with a live animated preview per character. Nothing is saved from this page.
   To nudge a hand or an instrument: arcade-quest/sprites.js, POSES (then reload this page). */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const ROWS = [
    {label: 'Carry · facing right', frames: [['', 0], ['', 1], ['-walk', 0], ['-walk', 1], ['-walk', 2], ['-walk', 3]]},
    {label: 'Carry · facing you', frames: [['-front', 0], ['-front', 1], ['-front-walk', 0], ['-front-walk', 1], ['-front-walk', 2], ['-front-walk', 3]]},
    {label: 'Carry · facing away', frames: [['-back', 0], ['-back', 1], ['-back-walk', 0], ['-back-walk', 1], ['-back-walk', 2], ['-back-walk', 3]]},
    {label: 'Playing', frames: [['-play', 0], ['-play', 1]]},
  ];
  const FRAME_NAMES = ['idle 1', 'idle 2', 'walk 1', 'walk 2', 'walk 3', 'walk 4'];
  const PREVIEW = [['-walk', 'Walking right'], ['-walk', 'Walking left', true], ['-front-walk', 'Walking down'], ['-back-walk', 'Walking up'], ['-play', 'Playing'], ['', 'Standing']];

  function canvasOf(id, frame, scale) {
    const d = Q.spriteDef(id), c = document.createElement('canvas');
    c.width = d.w * scale; c.height = d.h * scale; c.className = 'spr-sprite';
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    Q.draw(x, id, 0, 0, {frame, scale, pose: true});
    return c;
  }

  Q.spriteReview = function () {
    const state = {zoom: 4, bg: 'both', tone: 1};
    document.body.classList.add('q-review');
    const root = Q.el('main', 'spr');
    root.innerHTML = `<header class="spr-head"><h1>Arcade Quest · Sprite review</h1>
      <p>Every band kid, carrying and playing. Hands and instrument positions are in <code>arcade-quest/sprites.js</code> (POSES).</p>
      <div class="spr-controls">
        <span>Zoom</span>${[1, 2, 4].map(z => `<button type="button" data-zoom="${z}">${z}×</button>`).join('')}
        <span>Background</span>${[['dark', 'Dark'], ['light', 'Light'], ['both', 'Both']].map(([v, l]) => `<button type="button" data-bg="${v}">${l}</button>`).join('')}
        <span>Skin tone</span>${[0, 1, 2, 3].map(t => `<button type="button" data-tone="${t}">${t + 1}</button>`).join('')}
      </div></header><div id="srList"></div>`;
    document.body.prepend(root);
    const list = root.querySelector('#srList');
    const previews = [];

    function render() {
      root.querySelectorAll('[data-zoom]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.zoom === state.zoom));
      root.querySelectorAll('[data-bg]').forEach(b => b.setAttribute('aria-pressed', b.dataset.bg === state.bg));
      root.querySelectorAll('[data-tone]').forEach(b => b.setAttribute('aria-pressed', +b.dataset.tone === state.tone));
      list.innerHTML = ''; previews.length = 0;
      const bgs = state.bg === 'both' ? ['dark', 'light'] : [state.bg];
      A.PLAYERS.forEach(mid => {
        const m = A.memberById(mid), base = Q.playerId(mid, {tone: state.tone});
        const card = Q.el('section', 'spr-card');
        card.innerHTML = `<h2>${m.name}</h2>`;
        const pv = Q.el('div', 'spr-preview');
        const pc = document.createElement('canvas'); pc.width = 96; pc.height = 96; pc.className = 'spr-sprite';
        const cap = Q.el('p', 'spr-cap', '');
        pv.append(pc, cap, Q.el('p', 'spr-name', m.name));
        card.appendChild(pv);
        previews.push({base, c: pc, cap});
        bgs.forEach(bg => {
          const panel = Q.el('div', 'spr-panel spr-' + bg);
          ROWS.forEach(row => {
            const r = Q.el('div', 'spr-row');
            r.appendChild(Q.el('p', 'spr-label', row.label));
            row.frames.forEach(([suf, f], i) => {
              const cell = Q.el('figure', 'spr-cell');
              cell.appendChild(canvasOf(base + suf, f, state.zoom));
              if (state.zoom !== 1) cell.appendChild(canvasOf(base + suf, f, 1));
              cell.appendChild(Q.el('figcaption', '', row.label === 'Playing' ? (f ? 'frame 2' : 'frame 1') : FRAME_NAMES[i]));
              r.appendChild(cell);
            });
            panel.appendChild(r);
          });
          panel.appendChild(Q.el('p', 'spr-name', m.name));
          card.appendChild(panel);
        });
        list.appendChild(card);
      });
    }
    root.querySelector('.spr-controls').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.zoom) state.zoom = +b.dataset.zoom;
      if (b.dataset.bg) state.bg = b.dataset.bg;
      if (b.dataset.tone) state.tone = +b.dataset.tone;
      render();
    });
    render();
    // the live previews: each cycles walking right, left, down, up, playing and standing (2 s each)
    const tick = now => {
      requestAnimationFrame(tick);
      if (document.hidden) return;
      const k = Math.floor(now / 2000) % PREVIEW.length, [suf, label, flip] = PREVIEW[k];
      previews.forEach(p => {
        const x = p.c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 96, 96);
        const id = p.base + suf, d = Q.spriteDef(id);
        const opts = {t: now, scale: 3, flip, pose: true};
        if (d.strike) opts.frame = Math.floor(now / 250) % 2;                 // mallets and sticks keep striking here
        Q.draw(x, id, 0, 0, opts);
        if (p.cap.textContent !== label) p.cap.textContent = label;
      });
    };
    requestAnimationFrame(tick);
  };
})(window.Arcade);
