/* SUSTAIN SPEEDWAY: THE DEEPER GARAGE (sustain-speedway/cars.js, garage.js, levels.js SPEEDWAY_GARAGE). Every body draws
   with every finish, rim and spoiler (rear and side views); dark paints get a light rim; every part saves and shows in
   the car's look; RANDOMIZE picks only unlocked items; the 3 saved loadouts save, rename from presets and wear; the
   track select shows the NEXT UNLOCK; there is no typed text anywhere; every tab fits a phone, an iPad and a laptop;
   ←/→ move between tabs; a race carries the parts (trail particles in Full, none in Lite) and counts clean laps. */
const {test, expect} = require('@playwright/test');
const {prepare, device, CPU_DRAWING} = require('./helpers');
test.use(CPU_DRAWING);                       // WebKit draws on the CPU here (helpers.js CPU_DRAWING: no page crashes on CI)
const {openSpeedway, startTrack, shortRace} = require('./speedway-helpers');

const URL = 'sustain-speedway/index.html?demo&nostart';
const ready = page => page.waitForFunction(() => window.Arcade && Arcade.SpeedwayGarage && Arcade.SpeedwayCars && document.getElementById('garageBtn'));

test('every body × finish × rims × spoiler draws, rear and side; dark paints get a light rim', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(URL); await ready(page);
  const r = await page.evaluate(() => {
    const C = Arcade.SpeedwayCars, G = window.SPEEDWAY_GARAGE, x = document.createElement('canvas').getContext('2d'), out = [];
    for (const body of C.BODIES) for (const finish of G.finishes.map(f => f.id)) {
      const rims = G.rims[out.length % G.rims.length].id, spoiler = G.spoilers[out.length % G.spoilers.length].id;
      const o = {body, color: '#ff4fb3', color2: '#3ae8ff', finish, rims, spoiler, decal: G.decals[out.length % G.decals.length].id, dcolor: '#ffe14d', number: 42, plate: {w: 'TUBA'}, w: 120, dpr: 1, sky: '#ff5a7a'};
      const s = C.sprite(o), d = s.cv.getContext('2d').getImageData(0, 0, s.cv.width, s.cv.height).data;
      let painted = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) painted++;
      C.side(x, 100, 100, 120, o);
      out.push({body, finish, painted: painted / (d.length / 4)});
    }
    // a black car: light rim pixels at its edge (a pink car has none of that rim color)
    // the silhouette's EDGE pixels (opaque, next to a see-through one): their average brightness
    const lightEdge = color => { const s = C.sprite({body: 'coupe', color, w: 160, dpr: 1, sky: '#2a1060'}), W = s.cv.width, H = s.cv.height, d = s.cv.getContext('2d').getImageData(0, 0, W, H).data;
      const a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : d[(y * W + x) * 4 + 3]);
      let sum = 0, n = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 200 && (a(x - 1, y) < 20 || a(x + 1, y) < 20 || a(x, y - 1) < 20)) { sum += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; } }
      return sum / n; };
    return {out, black: lightEdge(getComputedStyle(document.documentElement).getPropertyValue('--sw-paint-black').trim()), lumBlack: C.lum('#15131c') < C.DARK};
  });
  r.out.forEach(o => expect(o.painted, `${o.body} ${o.finish}`).toBeGreaterThan(.08));
  expect(r.lumBlack).toBe(true);
  expect(r.black).toBeGreaterThan(110);                                              // a light rim (the paint itself is ~20)
  watch.check();
});

test('every part saves and shows in the look; RANDOMIZE picks only unlocked items; no typed text', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(URL + '&unlockall'); await ready(page);
  const r = await page.evaluate(() => {
    const Gg = Arcade.SpeedwayGarage;
    Gg.set({body: 'rally', paint: 'sw-paint-black', finish: 'pearl', paint2: 'pink', decal: 'tiger', dcolor: 'yellow', rims: 'turbine', spoiler: 'tall', glow: 'cyan', flame: 'rainbow', trail: 'notes', plate: {w: 'ALLEGRO'}});
    const a = Gg.look();
    Gg.set({plate: {d: '0427'}});
    return {a, plate: Gg.look().plate, css: n => 0};
  });
  expect(r.a).toMatchObject({body: 'rally', finish: 'pearl', decal: 'tiger', rims: 'turbine', spoiler: 'tall', glow: 'cyan', flame: 'rainbow', trail: 'notes', plate: {w: 'ALLEGRO'}});
  expect(r.a.color2).toBeTruthy(); expect(r.a.dcolor).toBeTruthy();
  expect(r.plate).toEqual({d: '0427'});
  // Matte Black always wears matte
  expect(await page.evaluate(() => { Arcade.SpeedwayGarage.set({paint: 'sw-paint-matte', finish: 'gloss'}); return Arcade.SpeedwayGarage.look().finish; })).toBe('matte');
  // a typed plate is refused (only the preset words or digits)
  expect(await page.evaluate(() => { Arcade.SpeedwayGarage.set({plate: {w: 'HELLO'}}); return Arcade.SpeedwayGarage.look().plate; })).toEqual({w: 'BAND'});
  // RANDOMIZE on a fresh device: only unlocked items (no ?unlockall)
  await page.goto(URL); await ready(page);
  const bad = await page.evaluate(() => {
    const Gg = Arcade.SpeedwayGarage, st = Gg.state(), out = [];
    for (let i = 0; i < 30; i++) {
      const c = Gg.randomize();
      ['body', 'paint', 'finish', 'rims', 'spoiler', 'glow', 'flame', 'trail'].forEach(k => { if (!st.unlocked[k].includes(c[k])) out.push(k + ':' + c[k]); });
      if (c.decal && !st.unlocked.decal.includes(c.decal)) out.push('decal:' + c.decal);
      if (c.paint2 && !st.unlocked.paint.includes(c.paint2)) out.push('paint2:' + c.paint2);
    }
    return out;
  });
  expect(bad).toEqual([]);
  await page.click('#garageBtn');
  for (const t of ['body', 'paint', 'decal', 'parts', 'plate']) { await page.click(`[data-tab="${t}"]`); await expect(page.locator('.sw-garage-ov input, .sw-garage-ov textarea, .sw-garage-ov [contenteditable]')).toHaveCount(0); }
  await page.click('#gRandom');
  await page.click('#gDone');
  watch.check();
});

test('saved loadouts: save, rename from the presets, wear; the side view; ←/→ between tabs', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(URL + '&unlockall'); await ready(page);
  await page.click('#garageBtn');
  await page.locator('.g-opt[data-kind="body"][data-id="kart"]').click();
  await page.locator('[data-lname="0"]').click();                                     // Car 1 → Car 2 → …
  await expect(page.locator('[data-lname="0"]')).toHaveText('Car 2');
  for (let i = 0; i < 2; i++) await page.locator('[data-lname="0"]').click();
  await expect(page.locator('[data-lname="0"]')).toHaveText('Race Day');
  await page.locator('[data-lsave="0"]').click();
  await expect(page.locator('#gReq')).toHaveText('Saved as Race Day.');
  await page.locator('.g-opt[data-kind="body"][data-id="bumper"]').click();
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.choice().body)).toBe('bumper');
  await expect(page.locator('[data-lwear="1"]')).toBeDisabled();                         // an empty slot
  await page.locator('[data-lwear="0"]').click();
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.choice().body)).toBe('kart');
  expect(await page.evaluate(() => Arcade.store.gameData('sustain-speedway').loadouts[0])).toMatchObject({name: 'Race Day', car: {body: 'kart'}});
  // the side view
  await page.click('#gView');
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.state().view)).toBe('side');
  await expect(page.locator('#gView')).toHaveText('Rear view');
  // keyboard: ←/→ between the tabs
  await page.locator('[data-tab="body"]').focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.state().tab)).toBe('paint');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.state().tab)).toBe('plate');
  await page.keyboard.press('Escape');
  await expect(page.locator('.sw-garage-ov')).toHaveCount(0);
  watch.check();
});

test('the track select shows the NEXT UNLOCK with its progress; locked parts say how to earn them', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {gameData: {'sustain-speedway': {cleanLaps: 2}}})});
  await page.goto(URL); await ready(page);
  await expect(page.locator('#garageNext')).toBeVisible();
  const nx = await page.evaluate(() => Arcade.SpeedwayGarage.nextUnlock());
  expect(nx.name).toBe('Kart');                                                         // 2 of 3 clean laps: the closest
  await expect(page.locator('#garageNext')).toContainText('Kart');
  await expect(page.locator('#garageNext')).toContainText('2 of 3 clean laps so far');
  await page.click('#garageBtn');
  await page.click('[data-tab="parts"]');
  const neon = page.locator('.g-opt[data-kind="rims"][data-id="neonrim"]');
  await expect(neon).toHaveClass(/locked/);
  await neon.click({force: true});
  await expect(page.locator('#gReq')).toContainText('Drive 10 clean laps');
  await expect(page.locator('#gReq')).toContainText('2 of 10 clean laps so far');
  watch.check();
});

for (const [name, size, touch] of [['phone', {width: 390, height: 844}, true], ['iPad portrait', {width: 768, height: 1024}, true], ['laptop', {width: 1366, height: 768}, false]]) {
  test.describe(`the deeper garage fits (${name})`, () => {
    if (touch) test.use({hasTouch: true});
    test('parts and plate tabs, the loadouts and RANDOMIZE: no sideways scroll', async ({page}) => {
      await page.setViewportSize(size);
      const watch = await prepare(page, {store: device('trumpet')});
      await page.goto(URL + '&unlockall'); await ready(page);
      await page.click('#garageBtn');
      for (const tab of ['parts', 'plate']) {
        await page.locator(`[data-tab="${tab}"]`).click();
        const r = await page.evaluate(() => {
          const ov = document.querySelector('.sw-garage-ov'), p = ov.querySelector('.panel').getBoundingClientRect();
          const small = [...ov.querySelectorAll('button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 36).map(b => b.textContent.trim());
          return {sideways: document.documentElement.scrollWidth > innerWidth + 1 || ov.scrollWidth > ov.clientWidth + 1, inside: p.left >= -1 && p.right <= innerWidth + 1, small};
        });
        expect(r, `${name} ${tab}`).toEqual({sideways: false, inside: true, small: []});
      }
      await page.locator('#gRandom').scrollIntoViewIfNeeded();
      await page.locator('#gRandom').click();
      await page.locator('#gDone').click();
      watch.check();
    });
  });
}

for (const gfx of ['full', 'lite']) test(`a race carries the parts: the trail in ${gfx === 'full' ? 'Full' : 'Lite (none)'}; clean laps count`, async ({page}) => {
  test.setTimeout(120000);
  const watch = await prepare(page, {store: device('trumpet', {gameData: {'sustain-speedway': {steerHint: true, gfx, garage: {body: 'coupe', trail: 'sparkles', glow: 'cyan'}}}})});
  await page.goto(URL + '&unlockall'); await ready(page);
  await startTrack(page, 1);
  await shortRace(page, 6);
  expect(await page.evaluate(() => Arcade.Speedway.car())).toMatchObject({trail: 'sparkles', glow: 'cyan'});
  await page.keyboard.down('Space');
  await page.waitForFunction(() => Arcade.Speedway.debug().v > .6, null, {timeout: 20000});
  await page.waitForTimeout(600);
  const fx = await page.evaluate(() => Arcade.Speedway.fx());
  if (gfx === 'full') expect(fx.kinds).toContain('spark'); else expect(fx.particles).toBe(0);
  await page.waitForFunction(() => Arcade.Speedway.podium() || document.querySelector('#resTuning'), null, {timeout: 90000});
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => Arcade.store.gameData('sustain-speedway').cleanLaps || 0)).toBeGreaterThan(0);
  watch.check();
});
