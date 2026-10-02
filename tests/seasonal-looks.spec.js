/* SEASONAL LOOKS (season-look.js + shared/seasons.js): the right look for a date, an event beats a background-only
   season, the "Seasonal look" switch (Settings panel + event panel) turns it off and is remembered, the old DECORATIONS
   "off" carries over, ?season= previews without saving, the concert countdown, and game pages never get a look. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const floor = (q = '') => `index.html?demo&nostart${q}`;
const look = page => page.evaluate(() => ({html: document.documentElement.dataset.slook || null, hosts: document.querySelectorAll('.slook').length,
  banner: !!document.querySelector('.ev-banner'), state: Arcade.SeasonLook.state()}));
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('bandarcade.v1') || '{}').gameData?.seasons || {});

test('the right look for sample dates; an event always beats a background-only season', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor());
  const got = await page.evaluate(() => {
    const at = s => { const [y, m, d] = s.split('-').map(Number); const L = Arcade.Seasons.look(new Date(y, m - 1, d, 12)); return L ? `${L.look}/${L.kind}` : null; };
    const dates = ['2026-08-01', '2026-09-30', '2026-10-01', '2026-11-01', '2026-11-02', '2026-11-30', '2026-12-01', '2027-01-07', '2027-01-08', '2027-02-06',
      '2027-02-07', '2027-02-14', '2027-02-15', '2027-02-28', '2027-03-15', '2027-04-15', '2027-05-22', '2027-06-20'];
    const out = Object.fromEntries(dates.map(d => [d, at(d)]));
    // a background-only season on an event's days: the event's look wins
    Arcade.SEASON_BACKDROPS.push({id: 'test-overlap', name: 'Overlap', look: 'frost', dates: [['10-01', '10-31']]});
    out.overlap = at('2026-10-15');
    Arcade.SEASON_BACKDROPS.pop();
    return out;
  });
  expect(got).toEqual({
    '2026-08-01': 'school/backdrop', '2026-09-30': 'school/backdrop', '2026-10-01': 'spooky/event', '2026-11-01': 'spooky/event',
    '2026-11-02': 'harvest/backdrop', '2026-11-30': 'harvest/backdrop', '2026-12-01': 'winter/event', '2027-01-07': 'winter/event',
    '2027-01-08': 'frost/backdrop', '2027-02-06': 'frost/backdrop', '2027-02-07': 'friendship/event', '2027-02-14': 'friendship/event',
    '2027-02-15': 'frost/backdrop', '2027-02-28': 'frost/backdrop', '2027-03-15': 'miosm/event', '2027-04-15': 'spring/event',
    '2027-05-22': 'summer/event', '2027-06-20': null, overlap: 'spooky/event'});
  watch.check();
});

test('the look shows on the menus (lobby, zone, ALL GAMES) and the 3D room takes its colors', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor('&today=2026-10-05'));
  let s = await look(page);
  expect(s.html).toBe('spooky');
  expect(s.state.hosts.sort()).toEqual(['body', 'pressStart', 'selectView']);   // behind the floor, PRESS START, Choose Your Instrument
  expect(s.banner).toBe(true);
  await expect(page.locator('body > .slook .sl-moon')).toBeVisible();
  await page.goto(floor('&today=2026-11-10#all-games'));
  expect((await look(page)).html).toBe('harvest');
  await expect(page.locator('#allView')).toBeVisible();
  await page.goto(floor('&today=2027-01-20#zone=note-reading'));
  await page.waitForFunction(() => Arcade.Arcade.state().kind, null, {timeout: 15000});
  expect((await look(page)).html).toBe('frost');
  if (await page.evaluate(() => Arcade.Arcade.state().kind === '3d')) {
    expect(await page.evaluate(() => Arcade.Floor3D.look())).toEqual({haze: ['cyan', 'blue', 'white'], lights: ['cyan', 'blue']});
  }
  watch.check();
});

test('"Seasonal look" OFF in the Settings panel: the normal arcade look, remembered; the event banner stays', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor('&today=2026-10-05'));
  expect((await look(page)).html).toBe('spooky');
  await page.evaluate(() => Arcade.UI.settings.open({lobby: true}));
  const sw = page.locator('#uiSettings [data-k=season]');
  await expect(sw).toHaveAttribute('aria-checked', 'true');
  await sw.click();
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  let s = await look(page);
  expect([s.html, s.hosts, s.banner]).toEqual([null, 0, true]);
  expect(await saved(page)).toMatchObject({look: false});
  await page.reload();
  s = await look(page);
  expect([s.html, s.hosts, s.banner]).toEqual([null, 0, true]);
  // on again from the event panel's switch
  await page.locator('.ev-banner').click();
  const cb = page.locator('.ev-deco-cb');
  await expect(cb).not.toBeChecked();
  await cb.check();
  expect((await look(page)).html).toBe('spooky');
  expect(await saved(page)).toMatchObject({look: true});
  watch.check();
});

test('an old DECORATIONS "off" (gameData seasons.deco = false) carries over as Seasonal look: Off', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {gameData: {seasons: {deco: false, claimed: {}}}})});
  await page.goto(floor('&today=2026-12-10'));
  let s = await look(page);
  expect([s.html, s.state.on, s.banner]).toEqual([null, false, true]);
  await page.evaluate(() => Arcade.UI.settings.open({lobby: true}));
  const sw = page.locator('#uiSettings [data-k=season]');
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  s = await look(page);
  expect(s.html).toBe('winter');
  const d = await saved(page);
  expect(d.look).toBe(true);
  expect('deco' in d).toBe(false);                                 // the old setting is gone
  watch.check();
});

test('?season= previews any look (events, background-only seasons, a look by name) and saves nothing', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  for (const [id, want, banner] of [['frost', 'frost', false], ['school', 'school', false], ['concert', 'concert', false], ['spring', 'spring', true]]) {
    await page.goto(floor(`&today=2027-06-20&season=${id}`));
    const s = await look(page);
    expect([id, s.html, s.banner]).toEqual([id, want, banner]);
  }
  expect(await saved(page)).toEqual({});
  // and with the switch off, a preview still shows (it's for trying a look)
  await page.evaluate(() => Arcade.Seasons.setLookOn(false));
  await page.goto(floor('&today=2027-06-20&season=harvest'));
  expect((await look(page)).html).toBe('harvest');
  watch.check();
});

test('a concert with countdown: true: the Concert Season look and "🎻 Concert in N days!"', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor('&today=2027-04-29'));
  const r = await page.evaluate(() => {
    Arcade.SEASONS.unshift({id: 'concert-test', name: 'Spring Concert', emoji: '🎻', start: '2027-04-20', end: '2027-05-04', look: 'concert', countdown: true,
      colors: ['yellow', 'red'], deco: 'music', ladder: [{do: 'days', n: 2}]});
    Arcade.SeasonLook.apply(); Arcade.SeasonLobby.render();
    const S = Arcade.Seasons, o = S.active();
    return {look: document.documentElement.dataset.slook, banner: document.querySelector('.ev-banner').textContent.replace(/\s+/g, ' ').trim(),
      tomorrow: S.leftText(Object.assign({}, o, {daysLeft: 1})), today: S.leftText(Object.assign({}, o, {daysLeft: 0}))};
  });
  expect(r.look).toBe('concert');
  expect(r.banner).toBe('🎻Concert in 5 days!');
  expect([r.tomorrow, r.today]).toEqual(['Concert tomorrow!', 'Concert tonight!']);
  watch.check();
});

test('games keep their own look; MOTION off stills the backdrop', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {gameData: {bg: {motion: false}}})});
  await page.goto(floor('&today=2026-12-10'));
  const s = await look(page);
  expect([s.html, s.state.still]).toEqual(['winter', true]);
  expect(await page.evaluate(() => [...document.querySelectorAll('body > .slook .sl-x')].every(e => getComputedStyle(e).animationName === 'none'))).toBe(true);
  await page.goto('ghost-notes/index.html?demo&nostart&today=2026-12-10');
  await page.waitForFunction(() => window.Arcade && Arcade.store);
  expect(await page.evaluate(() => [document.querySelectorAll('.slook').length, document.documentElement.dataset.slook || null])).toEqual([0, null]);
  watch.check();
});

/* ---------- THE SPOOKY SCENE: the front layer, the moon, the haunted band hall, the bat across the moon ---------- */
const path = require('path');
const GALLERY = !!process.env.GALLERY;
const SIZES = [['phone', 390, 844], ['ipad-portrait', 820, 1180], ['ipad-landscape', 1180, 820], ['chromebook', 1366, 768]];
const SPOOKY = '&today=2026-10-15';
const settle = page => page.waitForFunction(() => {             // the moon placed (season-look.js place(), after fonts)
  const h = document.querySelector('body > .slook');
  return h && h.style.getPropertyValue('--sl-top') && document.fonts.status === 'loaded';
}, null, {timeout: 10000}).then(() => page.waitForTimeout(400));
const rectOf = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); return e && e.getBoundingClientRect().toJSON(); }, sel);
/** the WCAG contrast of every text in `sel` against what's really behind it: its own solid background, else the
 *  brightest pixel of the backdrop under it (a screenshot with only the backdrop showing) */
async function contrasts(page, sel) {
  const texts = await page.evaluate(sel => {
    const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
    const out = [], r = document.createRange();
    document.querySelectorAll(sel).forEach(root => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const el = n.parentElement;
        if (!n.nodeValue.trim() || el.closest('.sr,[hidden]') || !el.checkVisibility({visibilityProperty: true, opacityProperty: true})) continue;
        r.selectNodeContents(n);
        const b = r.getBoundingClientRect();
        if (b.width < 2 || b.height < 2) continue;
        let bg = null;
        for (let e = el; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if (/^rgb\(/.test(c.backgroundColor) || /,\s*1\)$/.test(c.backgroundColor)) { bg = lum(c.backgroundColor); break; } if (e === document.body) break; }
        out.push({text: n.nodeValue.trim().slice(0, 30), fg: lum(getComputedStyle(el).color), bg, box: [b.left, b.top, b.width, b.height]});
      }
    });
    return out;
  }, sel);
  const bare = texts.filter(t => t.bg === null);
  if (bare.length) {
    const tag = await page.addStyleTag({content: 'body > :not(.slook):not(.slook-front):not(.room){visibility:hidden!important}'});
    const png = (await page.screenshot()).toString('base64');
    await tag.evaluate(t => t.remove());
    const lums = await page.evaluate(async ([png, boxes]) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
      const c = document.createElement('canvas'); c.width = innerWidth; c.height = innerHeight;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, innerWidth, innerHeight);
      const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
      return boxes.map(([l, t, w, h]) => {
        l = Math.max(0, Math.floor(l)); t = Math.max(0, Math.floor(t)); w = Math.min(innerWidth - l, Math.ceil(w)); h = Math.min(innerHeight - t, Math.ceil(h));
        if (w <= 0 || h <= 0) return 0;
        const d = x.getImageData(l, t, w, h).data; let m = 0;
        for (let i = 0; i < d.length; i += 4) m = Math.max(m, .2126 * f(d[i]) + .7152 * f(d[i + 1]) + .0722 * f(d[i + 2]));
        return m;
      });
    }, [png, bare.map(t => t.box)]);
    bare.forEach((t, i) => { t.bg = lums[i]; });
  }
  return texts.map(t => ({text: t.text, ratio: +((Math.max(t.fg, t.bg) + .05) / (Math.min(t.fg, t.bg) + .05)).toFixed(2)}));
}

/** the texts without their own solid background (the view's own background is under the backdrop) that touch the moon */
const bareOnMoon = (page, view) => page.evaluate(view => {
  const root = document.querySelector(view), host = view === 'body' ? 'body > .slook' : `${view} > .slook`;
  const m = document.querySelector(`${host} .sl-moon`).getBoundingClientRect();
  const out = [], rg = document.createRange(), w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const el = n.parentElement;
    if (!n.nodeValue.trim() || el.closest('.sr,[hidden]' + (view === 'body' ? ',#pressStart,#selectView' : '')) || !el.checkVisibility({visibilityProperty: true, opacityProperty: true})) continue;
    let solid = false;
    for (let e = el; e && e !== root; e = e.parentElement) { const c = getComputedStyle(e); if (c.backgroundImage !== 'none' || /^rgb\(|,\s*1\)$/.test(c.backgroundColor)) { solid = true; break; } }
    if (solid) continue;
    rg.selectNodeContents(n); const b = rg.getBoundingClientRect();
    if (b.width > 2 && b.left < m.right && m.left < b.right && b.top < m.bottom && m.top < b.bottom) out.push(n.nodeValue.trim());
  }
  return out;
}, view);

test('spooky: the jack-o\'-lanterns stand in the FRONT layer, over the floor\'s lines and the fog', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  for (const [name, w, h] of [SIZES[0], SIZES[3]]) {
    await page.setViewportSize({width: w, height: h});
    await page.goto(floor(SPOOKY));
    await settle(page);
    const r = await page.evaluate(() => {
      // the backdrop takes no taps: let the hit test see it for a moment
      const s = document.createElement('style');
      s.textContent = '.room,.slook,.slook-front,.slook *,.slook-front *{pointer-events:auto!important}';
      document.head.append(s);
      const order = [...document.querySelectorAll('body > *')];
      const out = {fronts: Arcade.SeasonLook.state().fronts, front: Arcade.SeasonLook.front('spooky'), pumpkins: []};
      out.frontAfterRoom = order.indexOf(document.querySelector('body > .slook-front')) === order.indexOf(document.querySelector('body > .room')) + 1;
      out.backBeforeRoom = order.indexOf(document.querySelector('body > .slook')) < order.indexOf(document.querySelector('body > .room'));
      out.backHasNone = [...document.querySelectorAll('body > .slook .sl-pk')].every(e => getComputedStyle(e).display === 'none');
      document.querySelectorAll('body > .slook-front .sl-pk').forEach(pk => {
        const b = pk.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height * .62;
        const stack = document.elementsFromPoint(x, y).filter(e => e.matches('.room') || e.closest('.slook,.slook-front'));
        const top = stack[0], room = stack.findIndex(e => e.matches('.room')), fog = stack.findIndex(e => e.closest('.sl-fog'));
        const mine = stack.findIndex(e => e.closest('.sl-pk') === pk);
        out.pumpkins.push({visible: b.width > 20 && b.bottom <= innerHeight + 1, topIsPumpkin: !!(top && top.closest('.sl-pk') === pk), underRoom: room !== -1 && room < mine, underFog: fog !== -1 && fog < mine});
      });
      s.remove();
      return out;
    });
    expect(r.fronts.sort()).toEqual(['body', 'pressStart', 'selectView']);
    expect(r.front).toEqual(['sl-pk', 'sl-pk', 'sl-pk']);
    expect([name, r.frontAfterRoom, r.backBeforeRoom, r.backHasNone]).toEqual([name, true, true, true]);
    expect(r.pumpkins).toHaveLength(3);
    for (const p of r.pumpkins) expect([name, p]).toEqual([name, {visible: true, topIsPumpkin: true, underRoom: false, underFog: false}]);
  }
  // every other look's floor-standing props are front props too
  const fronts = await page.evaluate(() => Object.fromEntries(Arcade.SeasonLook.LOOKS.map(id => [id, Arcade.SeasonLook.front(id)])));
  expect(fronts).toEqual({spooky: ['sl-pk', 'sl-pk', 'sl-pk'], winter: ['sl-hills'], friendship: [], miosm: ['sl-drum', 'sl-drum d2'], spring: ['sl-grass'],
    summer: ['sl-wheel', 'sl-palm', 'sl-boards', 'sl-wave'], concert: ['sl-foot'], school: [], harvest: ['sl-wheat', 'sl-wheat w2', 'sl-gourd', 'sl-gourd g2', 'sl-wheat'], frost: []});
  watch.check();
});

test('spooky: in a zone and the FULL ARCADE (3D and 2D) the jack-o\'-lanterns stay in front, in free spots: never under or over a cabinet or control', async ({page}) => {
  test.setTimeout(400000);                                         // every size × every view
  const watch = await prepare(page, {store: device('trumpet')});
  const seen = new Set();
  for (const [name, w, h] of SIZES) {
    await page.setViewportSize({width: w, height: h});
    for (const hash of ['#zone=note-reading', '#full-arcade']) {
      for (const flat of [false, true]) {
        await page.goto(floor(`${SPOOKY}${flat ? '&flat' : ''}${hash}`));
        await page.waitForFunction(() => Arcade.Arcade.state().kind, null, {timeout: 15000});
        await page.waitForTimeout(1200);                           // the 3D cabinets in place, then placeFront()
        await page.evaluate(() => Arcade.SeasonLook.placeFront());
        const at = `${name} ${hash} ${flat ? '2D' : 'default'}`;
        const r = await page.evaluate(() => {
          const s = document.createElement('style');
          s.textContent = '.slook-front,.slook-front *{pointer-events:auto!important}';
          document.head.append(s);
          const box = e => e.getBoundingClientRect();
          const shown = e => e.getClientRects().length && e.checkVisibility({visibilityProperty: true, opacityProperty: true});
          const controls = [...document.querySelectorAll('#jumpStrip, .nav, .start3d, #zoneView .slot[data-d="0"] .cab-start, .prize3d, .prize2d')]
            .filter(e => !e.hidden && shown(e)).map(e => [e.className || e.id, box(e)]).concat(Arcade.Arcade.cabinets().map(b => ['cabinet', b]));
          const over = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          const out = {kind: Arcade.Arcade.state().kind, frontShown: getComputedStyle(document.querySelector('body > .slook-front')).display !== 'none', pumpkins: []};
          document.querySelectorAll('body > .slook-front .sl-pk').forEach(pk => {
            const b = box(pk), x = b.left + b.width / 2, y = b.top + b.height * .62;
            const visible = shown(pk) && b.width > 10 && b.top >= 0 && b.bottom <= innerHeight + 1;
            const top = document.elementFromPoint(x, y);
            out.pumpkins.push({visible, onTop: !!(top && top.closest('.sl-pk') === pk), overlaps: visible ? controls.filter(([, c]) => over(b, c)).map(([n]) => n) : []});
          });
          s.remove();
          return out;
        });
        seen.add(r.kind);
        expect(r.frontShown, at).toBe(true);
        const vis = r.pumpkins.filter(p => p.visible);
        expect(vis.length, `${at}: pumpkins shown`).toBeGreaterThanOrEqual(2);
        for (const p of vis) expect([at, p.onTop, p.overlaps]).toEqual([at, true, []]);
      }
    }
  }
  expect([...seen].sort()).toEqual(['2d', '3d']);                   // both views were checked
  // the lobby is unchanged: the pumpkins at home
  await page.goto(floor(SPOOKY));
  await settle(page);
  expect(await page.evaluate(() => [...document.querySelectorAll('body > .slook-front .sl-pk')].map(e => e.style.transform + (e.classList.contains('sl-hide') ? 'hidden' : '')))).toEqual(['', '', '']);
  watch.check();
});

test('spooky: the moon is twice its old size, its top under the top bar; no bare text on it; the band hall stays at the edge', async ({page}) => {
  test.setTimeout(300000);                                         // every size × every view
  const watch = await prepare(page, {store: device('trumpet')});
  for (const [name, w, h] of SIZES.concat([['big', 1920, 1300], ['phone-landscape', 844, 390]])) {
    await page.setViewportSize({width: w, height: h});
    for (const hash of ['', '#all-games', '#zone=note-reading']) {
      await page.goto(floor(SPOOKY + hash));
      if (hash.includes('zone')) await page.waitForFunction(() => Arcade.Arcade.state().kind, null, {timeout: 15000});
      await settle(page);
      const r = await page.evaluate(() => {
        const q = s => document.querySelector(s).getBoundingClientRect();
        const vmin = Math.min(innerWidth, innerHeight) / 100, old = Math.min(140, Math.max(64, 11 * vmin));
        return {moon: q('body > .slook .sl-moon').toJSON(), hall: q('body > .slook .sl-hall').toJSON(), bar: q('#fbar').toJSON(), old, W: innerWidth};
      });
      const at = `${name} ${hash || 'lobby'}`;
      expect(Math.abs(r.moon.width - 2 * r.old), `${at}: moon width`).toBeLessThanOrEqual(2);
      expect(r.moon.top, `${at}: moon under the top bar`).toBeGreaterThanOrEqual(r.bar.bottom);
      // the hall: in front of the moon's lower part (its body covers the moon's bottom edge), never in the middle 40 %
      expect(r.hall.top, `${at}: hall top`).toBeGreaterThan(r.moon.top);
      expect(r.hall.top, `${at}: hall top`).toBeLessThan(r.moon.bottom - r.moon.height / 3);
      expect(r.hall.bottom, `${at}: hall bottom`).toBeGreaterThan(r.moon.bottom);
      expect(Math.min(r.hall.right, r.moon.right) - Math.max(r.hall.left, r.moon.left), `${at}: hall across the moon`).toBeGreaterThan(r.moon.width * .6);
      expect(r.hall.left, `${at}: hall out of the middle`).toBeGreaterThanOrEqual(r.W * .7);
      // no text without its own background lands on the (light) moon
      const onMoon = await bareOnMoon(page, 'body');
      expect(onMoon, `${at}: bare text on the moon`).toEqual([]);
    }
  }
  watch.check();
});

test('spooky: the top bar\'s text and the zone signs keep ≥ 4.5:1 over the new scene', async ({page}) => {
  test.setTimeout(300000);                                         // every size × every view
  const watch = await prepare(page, {store: device('trumpet')});
  for (const [name, w, h] of SIZES) {
    await page.setViewportSize({width: w, height: h});
    for (const hash of ['', '#zone=note-reading']) {
      await page.goto(floor(SPOOKY + hash));
      if (hash) await page.waitForFunction(() => Arcade.Arcade.state().kind, null, {timeout: 15000});
      await settle(page);
      const got = await contrasts(page, hash ? '#fbar' : '#fbar, #zones .zsign, #lobby > .sign');
      expect(got.length).toBeGreaterThan(3);
      for (const t of got) expect(`${name} ${hash || 'lobby'} "${t.text}" ${t.ratio}`).toMatch(t.ratio >= 4.5 ? /./ : /^$/);
    }
  }
  watch.check();
});

test('spooky: now and then a bat crosses the moon; never with reduced motion, where nothing in the look moves', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.clock.install();
  await page.setViewportSize({width: 1180, height: 820});
  await page.goto(floor(SPOOKY + '#all-games'));
  await page.waitForFunction(() => document.querySelector('body > .slook .sl-mbat'));
  const bat = page.locator('body > .slook .sl-mbat');
  await expect(bat).not.toHaveClass(/fly/);
  const flying = async () => (await bat.getAttribute('class')).includes('fly');
  const now = () => page.evaluate(() => Date.now());                // the page's (fake) clock
  let waited = 0;                                                   // at most 35 s between passes
  while (waited < 36000 && !(await flying())) { await page.clock.runFor(250); waited += 250; }
  await expect(bat).toHaveClass(/fly/);
  const first = await now();
  // the flight: off the disc's left, across its middle, off its right (the animation paused at three moments)
  const at = t => page.evaluate(t => {
    const b = document.querySelector('body > .slook .sl-mbat');
    b.getAnimations({subtree: true}).forEach(a => { a.pause(); a.currentTime = a.animationName === 'sl-flap' ? 0 : t; });
    const m = b.getBoundingClientRect(), r = b.querySelector('svg').getBoundingClientRect();
    return {x: (r.left + r.width / 2 - m.left) / m.width, y: (r.top + r.height / 2 - m.top) / m.height, o: +getComputedStyle(b.querySelector('.mb')).opacity};
  }, t);
  const [a, mid, z] = [await at(150), await at(1500), await at(2850)];
  expect(a.x).toBeLessThan(0.05);
  expect(mid.x).toBeGreaterThan(0.35); expect(mid.x).toBeLessThan(0.65);
  expect(mid.y).toBeGreaterThan(0.1); expect(mid.y).toBeLessThan(0.5);          // across the upper disc (above the hall)
  expect(mid.o).toBe(1);
  expect(z.x).toBeGreaterThan(0.95);
  const flap = await page.evaluate(() => document.querySelector('body > .slook .sl-mbat svg').getAnimations().map(a => a.effect.getTiming().duration));
  expect(flap[0]).toBeGreaterThanOrEqual(300);                    // a slow flap, never a flash
  await page.evaluate(() => document.querySelector('body > .slook .sl-mbat').getAnimations({subtree: true}).forEach(a => a.play()));
  await page.clock.runFor(3500);
  await expect(bat).not.toHaveClass(/fly/);
  // the next pass: 20–35 s after the last one started
  waited = 0;
  while (waited < 40000 && !(await flying())) { await page.clock.runFor(250); waited += 250; }
  const gap = (await now()) - first;
  expect(gap).toBeGreaterThanOrEqual(19500);
  expect(gap).toBeLessThanOrEqual(36500);

  // reduced motion: the bat isn't drawn, no pass, nothing in either layer animates
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto(floor(SPOOKY));
  await page.waitForFunction(() => document.querySelector('body > .slook .sl-mbat'));
  await page.clock.runFor(70000);
  const still = await page.evaluate(() => ({fly: document.querySelectorAll('.sl-mbat.fly').length, shown: [...document.querySelectorAll('.sl-mbat')].filter(e => getComputedStyle(e).display !== 'none').length,
    moving: document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.slook,.slook-front')).length,
    glow: [...document.querySelectorAll('body > .slook-front .pkg')].map(e => +getComputedStyle(e).opacity)}));
  expect(still).toEqual({fly: 0, shown: 0, moving: 0, glow: [0.75, 0.75, 0.75]});   // the candles: a steady glow
  watch.check();
});

test('spooky: the candle glow and the hall\'s windows breathe slowly (no flicker)', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(floor(SPOOKY));
  await page.waitForFunction(() => document.querySelector('body > .slook-front .pkg'));
  const r = await page.evaluate(() => {
    const anims = sel => [...document.querySelectorAll(sel)].flatMap(e => e.getAnimations()).map(a => ({name: a.animationName, d: a.effect.getTiming().duration, delay: a.effect.getTiming().delay}));
    return {glow: anims('body > .slook-front .pkg'), face: anims('body > .slook-front .pf'), win: anims('body > .slook .sl-hall .hw'), clef: document.querySelectorAll('.sl-hall .hc').length};
  });
  expect(r.glow.map(a => a.name)).toEqual(['sl-candle', 'sl-candle', 'sl-candle']);
  expect(new Set(r.glow.map(a => a.delay)).size).toBe(3);                        // each pumpkin its own phase
  for (const a of r.glow.concat(r.face)) { expect(a.d).toBeGreaterThanOrEqual(4000); expect(a.d).toBeLessThanOrEqual(5000); }
  expect(r.clef).toBe(0);                                          // no treble-clef window: five plain arched ones
  expect(r.win.length).toBe(5);
  for (const a of r.win) expect([a.name, a.d]).toEqual(['sl-win', 6000]);
  expect(new Set(r.win.map(a => a.delay)).size).toBeGreaterThan(3);             // staggered
  watch.check();
});

test('spooky: PRESS START and Choose Your Instrument have their own copy (with the front layer)' + (GALLERY ? ' + GALLERY screenshots' : ''), async ({page}) => {
  test.setTimeout(GALLERY ? 360000 : 120000);
  const watch = await prepare(page, {store: device('trumpet', {avatarOffered: true}), visit: false});
  const shot = name => GALLERY ? page.screenshot({path: path.join(__dirname, '..', 'docs/gallery', `season-spooky-${name}.jpg`), type: 'jpeg', quality: 80}) : null;
  for (const [name, w, h] of SIZES) {                              // no bare text on the moon, at every size
    await page.setViewportSize({width: w, height: h});
    await page.goto('index.html?demo' + SPOOKY);
    await expect(page.locator('#pressStart')).toBeVisible();
    await page.waitForTimeout(500);
    expect([name, await bareOnMoon(page, '#pressStart')]).toEqual([name, []]);
    await page.goto(floor(SPOOKY + '&game=ghost-notes'));
    await expect(page.locator('#selectView')).toBeVisible();
    await page.waitForTimeout(500);
    expect([name, await bareOnMoon(page, '#selectView')]).toEqual([name, []]);
  }
  await page.setViewportSize({width: 1180, height: 820});
  await page.goto('index.html?demo' + SPOOKY);
  await expect(page.locator('#pressStart')).toBeVisible();
  await expect(page.locator('#pressStart > .slook-front .sl-pk')).toHaveCount(3);
  await expect(page.locator('#pressStart > .slook .sl-moon')).toBeVisible();
  await page.waitForTimeout(600);
  expect(await bareOnMoon(page, '#pressStart')).toEqual([]);
  await shot('press-start');
  await page.goto(floor(SPOOKY + '&game=ghost-notes'));
  await expect(page.locator('#selectView')).toBeVisible();
  await expect(page.locator('#selectView > .slook-front .sl-pk').first()).toBeVisible();
  await page.waitForTimeout(800);
  const m = await rectOf(page, '#selectView > .slook .sl-moon'), bar = await rectOf(page, '#selectView .topbar');
  expect(m.top).toBeGreaterThanOrEqual(bar.bottom);
  expect(await bareOnMoon(page, '#selectView')).toEqual([]);
  await shot('choose-instrument');
  if (GALLERY) {
    for (const [name, w, h] of SIZES) {
      await page.setViewportSize({width: w, height: h});
      for (const [hash, kind] of [['', 'lobby'], ['#zone=note-reading', 'zone'], ['#full-arcade', 'full-3d'], ['&flat#full-arcade', 'full-2d']]) {
        await page.goto(floor(SPOOKY + hash));
        if (hash) await page.waitForFunction(() => Arcade.Arcade.state().kind, null, {timeout: 15000});
        if (hash) { await page.waitForTimeout(1200); await page.evaluate(() => Arcade.SeasonLook.placeFront()); }
        await settle(page);
        await page.waitForTimeout(800);
        await shot(`${name}-${kind}`);
      }
    }
  }
  watch.check();
});
