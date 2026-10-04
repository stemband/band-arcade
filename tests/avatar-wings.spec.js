/* AVATAR WINGS (shared/avatar-parts.js WINGBEAT / wingbeat()): the 4 wing items (Neon wings, Feathered wings, Bat wings,
   Bee Wings) are ATTACHED to the back in the full-body side view (stand, walk, play, any instrument, any frame), and they
   BEAT in every view (bust, front, side, back) by rotating about their root: the root never moves, the tips go up and
   down (never sideways). Never over the face in the bust. The capes keep their sideways sway, exactly as before
   (fixtures/capes-before.json was made on main before the change). Reduced motion / Motion off: frame 0 only.
   GALLERY=1 saves docs/gallery/avatar-wings.png for Mr. Graham. */
const path = require('path');
const {test, expect} = require('@playwright/test');
const {ROOT, prepare, device} = require('./helpers');
const CAPES = require('./fixtures/capes-before.json');

const WINGS = ['wings', 'featherwings', 'batwings', 'beewings'];
const VIEWS = ['bustBehind', 'behind.front', 'behind.side', 'behind.back'];

/** opens the floor (it has avatar.js + the instrument sprites) and adds the in-page helpers (window.WT) */
async function open(page, store = device()) {
  const watch = await prepare(page, {store});
  await page.goto('index.html?demo&nostart&unlockall');
  await page.waitForFunction(() => window.Arcade && Arcade.Avatar && window.QUEST_ART && window.AVATAR_PARTS);
  await page.evaluate(() => {
    const P = window.AVATAR_PARTS;
    const base = extra => Object.assign(Arcade.Avatar.get(), {skin: 4, hair: 'short', hairColor: 'brown', head: 'none', top: 'tee', pet: 'none', back: 'none',
      hand: 'none', effect: 'none', bg: 'none', chair: false}, extra || {});
    const grid = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      return Array.from({length: c.height}, (_, y) => Array.from({length: c.width}, (_, x) => { const k = (y * c.width + x) * 4; return d[k + 3] ? d.slice(k, k + 4).join() : ''; })); };
    /** a map's pixels at their place on the grid: [[x, y]] */
    const pixels = m => { const out = []; (m.half || m.rows).forEach((r, y) => [...r].forEach((ch, x) => { if (ch !== '.' && ch !== ' ') out.push([(m.x || 0) + x, (m.y || 0) + y]); })); return out; };
    const at = (part, key) => key.split('.').reduce((o, k) => o && o[k], part);
    window.WT = {
      P, base, grid, pixels,
      frames: (id, key) => P.BACKS.find(b => b.id === id).anim.maps[key],
      still: (id, key) => at(P.BACKS.find(b => b.id === id), key),
      /** the wing's own pixels in a sprite frame: what changes when the wing is added; body = everything else */
      spriteDiff(member, view, extra, back) {
        const W = Arcade.Avatar.sprites(member, {avatar: base(Object.assign({}, extra, {back}))})[view].frames;
        const B = Arcade.Avatar.sprites(member, {avatar: base(extra)})[view].frames;
        return W.map((c, i) => { const g = grid(c), h = grid(B[i % B.length]), wing = [];
          g.forEach((r, y) => r.forEach((v, x) => { if (v && v !== h[y][x]) wing.push([x, y]); }));
          return {wing, body: h}; });
      },
      /** is a wing pixel at the shoulder rows next to (or under) the body? (rows 13–17: the idle bob moves the body 1 row;
          long hair hangs over the root, so there the wing must touch the hair: rows 8–18) */
      attached({wing, body}, [y0, y1] = [13, 17]) {
        return wing.some(([x, y]) => y >= y0 && y <= y1 && [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => body[y + dy] && body[y + dy][x + dx]));
      },
    };
  });
  return watch;
}

test('side view: every wing is attached to the back in every pose, instrument, top and frame', {tag: '@quick'}, async ({page}) => {
  const watch = await open(page);
  const bad = await page.evaluate(WINGS => {
    const out = [];
    const looks = [{}, {top: 'hoodie'}, {top: 'marching'}, {top: 'rockstar'}, {top: 'ghosthunter'}, {top: 'tailcoat'}, {hair: 'long'}, {chair: true}];
    WINGS.forEach(id => ['trumpet', 'tuba', 'basscl', 'flute', 'snare', 'bells'].forEach(m => ['', '-walk', '-play'].forEach(v => looks.forEach(extra => {
      WT.spriteDiff(m, v, extra, id).forEach((f, i) => { if (!f.wing.length || !WT.attached(f, extra.hair ? [8, 18] : undefined)) out.push(`${id} ${m} ${v || 'stand'} ${JSON.stringify(extra)} frame ${i}`); });
    }))));
    return out;
  }, WINGS);
  expect(bad).toEqual([]);
  watch.check();
});

test('the side view now beats too, and the wings were floating before (the check would have caught it)', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(WINGS => {
    const beats = WINGS.map(id => (WT.frames(id, 'behind.side') || []).length);
    // the old Neon wings' side picture (x 0–7, rows 10–19), 4–5 px behind the back
    const old = {y: 10, rows: ['....9', '...990', '..9900', '..99900', '.999900', '.9999000', '..999900', '...99900', '....9990', '.....99']};
    const wings = WT.P.BACKS.find(b => b.id === 'wings'), keep = wings.behind.side, anim = wings.anim;
    wings.behind.side = old; wings.anim = null;
    const f = WT.spriteDiff('trumpet', '', {top: 'concert'}, 'wings')[0];
    wings.behind.side = keep; wings.anim = anim;
    return {beats, oldAttached: WT.attached(f)};
  }, WINGS);
  expect(r.beats).toEqual([4, 4, 4, 4]);
  expect(r.oldAttached).toBe(false);
  watch.check();
});

test('front, back, bust and side: the root never slides; the tips flap up and down, not sideways', async ({page}) => {
  const watch = await open(page);
  const bad = await page.evaluate(([WINGS, VIEWS]) => {
    const out = [];
    WINGS.forEach(id => VIEWS.forEach(key => {
      const F = WT.frames(id, key), still = WT.still(id, key);
      if (!F || F.length !== 4) { out.push(`${id} ${key}: ${F ? F.length : 0} frames`); return; }
      if (JSON.stringify(F[0]) !== JSON.stringify(still) || JSON.stringify(F[2]) !== JSON.stringify(still)) out.push(`${id} ${key}: frames 0 and 2 are not the still picture`);
      const p0 = WT.pixels(F[0]), rootX = Math.max(...p0.map(p => p[0])), root = p0.filter(p => p[0] >= rootX - 1);
      F.forEach((m, i) => {
        const pi = WT.pixels(m);
        if (root.some(([x, y]) => !pi.some(([a, b]) => Math.abs(a - x) <= 1 && Math.abs(b - y) <= 1))) out.push(`${id} ${key} frame ${i}: the root moved`);
      });
      // the tips: the pixels farthest from the root (the outer 40 % of the wing)
      const minX = Math.min(...p0.map(p => p[0])), cut = rootX - 0.6 * (rootX - minX);
      const centroid = m => { const t = WT.pixels(m).filter(p => p[0] <= cut); return [t.reduce((s, p) => s + p[0], 0) / t.length, t.reduce((s, p) => s + p[1], 0) / t.length]; };
      const [ux, uy] = centroid(F[1]), [dx, dy] = centroid(F[3]), [sx, sy] = centroid(F[0]);
      if (!(uy < sy && dy > sy)) out.push(`${id} ${key}: frame 1 must raise the tips, frame 3 lower them`);
      if (!(dy - uy >= 2 && Math.abs(dy - uy) > 2 * Math.abs(dx - ux))) out.push(`${id} ${key}: the tips move ${(dy - uy).toFixed(1)} down, ${(dx - ux).toFixed(1)} across`);
    }));
    return out;
  }, [WINGS, VIEWS]);
  expect(bad).toEqual([]);
  watch.check();
});

test('the bust: no wing pixel over the face in any frame, with long or big hair, hats and an effect', async ({page}) => {
  const watch = await open(page);
  const bad = await page.evaluate(WINGS => {
    const out = [];
    // avatar-fx.js's FACE rect (x 8.5–27.5, y 9.5–25.5 of the 36 grid): the pixels wholly inside it, x 9–26, y 10–24
    const looks = [{}, {hair: 'long'}, {hair: 'afro'}, {hair: 'puffs'}, {hair: 'highpuff'}, {hair: 'bald'}, {head: 'tophat'}, {head: 'wizard'}, {head: 'hijab'}, {effect: 'aura'}];
    WINGS.forEach(id => looks.forEach(extra => {
      const W = Arcade.Avatar.bustFrames(WT.base(Object.assign({}, extra, {back: id}))), B = Arcade.Avatar.bustFrames(WT.base(extra));
      W.forEach((c, i) => { const g = WT.grid(c), h = WT.grid(B[i % B.length]);
        for (let y = 10; y <= 24; y++) for (let x = 9; x <= 26; x++) if (g[y][x] !== h[y][x]) { out.push(`${id} ${JSON.stringify(extra)} frame ${i} (${x}, ${y})`); return; } });
    }));
    return out;
  }, WINGS);
  expect(bad).toEqual([]);
  watch.check();
});

test('the capes still sway exactly as before; wing items keep their ids, colors and unlocks', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const P = WT.P, pick = x => JSON.parse(JSON.stringify({bustBehind: x.bustBehind, behind: x.behind, anim: x.anim}));
    return {cape: pick(P.ACCESSORIES.cape), pixelcape: pick(P.BACKS.find(b => b.id === 'pixelcape')),
      wings: ['wings', 'featherwings', 'batwings', 'beewings'].map(id => { const b = P.BACKS.find(x => x.id === id); return [id, b.name, b.pal || null, !!b.unlock]; }),
      tuning: P.WINGBEAT};
  });
  expect(r.cape).toEqual(CAPES.cape);
  expect(r.pixelcape).toEqual(CAPES.pixelcape);
  expect(r.wings).toEqual([['wings', 'Neon wings', null, true], ['featherwings', 'Feathered wings', {N: 'white-hi', O: 'av-white-d'}, true],
    ['batwings', 'Bat wings', {N: 'purple', O: 'purple-ink'}, true], ['beewings', 'Bee Wings', {N: 'mh-bee-wing', O: 'mh-bee'}, true]]);
  expect(r.tuning.up).toBeLessThan(0);
  expect(r.tuning.down).toBeGreaterThan(0);
  watch.check();
});

test('the avatar code carries each wing item unchanged', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(WINGS => WINGS.map(id => { const av = Arcade.Avatar.normalize(WT.base({back: id})), back = Arcade.avatarCode.decode(Arcade.avatarCode.encode(av));
    return [id, back && back.back, JSON.stringify(Arcade.Avatar.normalize(back)) === JSON.stringify(av)]; }), WINGS);
  expect(r).toEqual(WINGS.map(id => [id, id, true]));
  watch.check();
});

for (const how of ['reduced motion', 'Motion off']) {
  test(`${how}: the sprites show frame 0 only, still attached`, async ({page}) => {
    if (how === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
    const watch = await open(page, how === 'Motion off' ? device('trumpet', {gameData: {bg: {motion: false}}}) : device());
    const bad = await page.evaluate(WINGS => {
      const out = [];
      if (!Arcade.reducedMotion.matches) out.push('motion is still on');
      WINGS.forEach(id => {
        const F = WT.spriteDiff('trumpet', '', {}, id);
        if (F.length !== 2) out.push(`${id}: ${F.length} frames`);
        F.forEach((f, i) => { if (!WT.attached(f)) out.push(`${id} frame ${i}: not attached`); });
        // frame 1 = frame 0 bobbed down 1 row: the same wing picture
        const k = ps => ps.map(([x, y]) => x + ',' + y).sort().join(' ');
        if (k(F[1].wing.map(([x, y]) => [x, y - 1])) !== k(F[0].wing)) out.push(`${id}: frame 1 is not the still wing`);
      });
      return out;
    }, WINGS);
    expect(bad).toEqual([]);
    watch.check();
  });
}

test('GALLERY=1: the wing sheet (bust, front, side frames 0–3, back frame 0) for Mr. Graham', async ({page}) => {
  test.skip(!process.env.GALLERY, 'only with GALLERY=1');
  await open(page);
  await page.setViewportSize({width: 2560, height: 760});
  await page.evaluate(WINGS => {
    const d = document.createElement('div'); d.id = 'sheet';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#140f1f;padding:12px;overflow:auto;color:#fff;font:14px sans-serif';
    const S = 4, cv = (src, w) => { const c = document.createElement('canvas'); c.width = c.height = w * S; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, w * S, w * S); c.style.cssText = 'margin:2px;background:#2a2340'; return c; };
    const label = t => { const s = document.createElement('span'); s.textContent = t; s.style.cssText = 'width:52px;text-align:center;opacity:.7'; return s; };
    d.innerHTML = '<div style="margin:0 0 6px">Each row: BUST frames 0–3 · FRONT 0–3 · SIDE 0–3 · BACK 0 (frame 1 = wings up, frame 3 = wings down)</div>';
    WINGS.forEach(id => {
      const av = WT.base({back: id, top: 'hoodie', topColor: 'teal', glasses: 'none'}), row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:2px;margin:6px 0';
      row.innerHTML = `<b style="width:110px">${id}</b>`;
      Arcade.Avatar.bustFrames(av).forEach(c => row.appendChild(cv(c, 36)));
      const sp = Arcade.Avatar.sprites('trumpet', {avatar: av});
      row.appendChild(label('front'));
      sp['-front'].frames.forEach(c => row.appendChild(cv(c, 32)));
      row.appendChild(label('side'));
      sp[''].frames.forEach(c => row.appendChild(cv(c, 32)));
      row.appendChild(label('back'));
      row.appendChild(cv(sp['-back'].frames[0], 32));
      d.appendChild(row);
    });
    document.body.appendChild(d);
  }, WINGS);
  await page.locator('#sheet').screenshot({path: path.join(ROOT, 'docs/gallery', 'avatar-wings.png')});
});
