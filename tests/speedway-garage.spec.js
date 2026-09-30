/* SUSTAIN SPEEDWAY: THE CARS AND THE GARAGE (sustain-speedway/cars.js, garage.js, levels.js SPEEDWAY_GARAGE).
   Every body draws (small and large, every decal, braking) without errors; the garage saves and restores; a locked
   item can't be picked and says how to earn it; unlocks come from existing progress (old stars and wins count); an old
   save races a Coupe in its instrument's color and a Racing Stripes skin still gives stripes; a race uses the chosen car
   (the ghost too) and a win shows NEW IN THE GARAGE!; drawing four cars stays cheap; the panel fits a phone, an iPad
   and a laptop. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const URL = 'sustain-speedway/index.html?demo&nostart';
const ready = page => page.waitForFunction(() => window.Arcade && Arcade.SpeedwayGarage && Arcade.SpeedwayCars && document.getElementById('garageBtn'));
/** saved Speedway progress: `wins` tracks won (3 ★), `more` finished 2nd (2 ★), for the trumpet in First 5 + Random */
const progress = (wins, more = []) => {
  const lv = {};
  wins.forEach(n => { lv[n] = {stars: 3, best: 600}; });
  more.forEach(n => { lv[n] = {stars: 2, best: 700}; });
  return {'sustain-speedway': {trumpet: lv}};
};

test('every body draws, small and large, with every decal and paint, braking or not', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(URL); await ready(page);
  const r = await page.evaluate(() => {
    const C = Arcade.SpeedwayCars, out = [], cv = document.createElement('canvas'); cv.width = 400; cv.height = 300;
    const x = cv.getContext('2d');
    for (const body of C.BODIES) for (const w of [10, 24, 60, 150, 320]) for (const decal of ['none', 'stripes', 'flames', 'stars', 'checker', 'lightning', 'number']) {
      const s = C.sprite({body, color: '#ff4fb3', decal, number: 42, w, dpr: 1.5, sky: '#ff5a7a', braking: w === 150});
      const d = s.cv.getContext('2d').getImageData(0, 0, s.cv.width, s.cv.height).data;
      let painted = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) painted++;
      out.push({body, w, decal, painted: painted / (d.length / 4)});
      C.draw(x, 200, 250, w, {body, color: '#3ae8ff', decal, number: 7, t: 1000, nitro: true, alpha: .4});
    }
    return {out, bodies: C.BODIES, levels: window.SPEEDWAY_TRACKS.flatMap(t => t.rivals.map(r => r.body))};
  });
  expect(r.bodies).toEqual(['coupe', 'mini', 'muscle', 'wagon', 'buggy', 'openwheel', 'hover', 'maestro']);
  r.out.forEach(o => expect(o.painted, `${o.body} at ${o.w} px (${o.decal})`).toBeGreaterThan(.08));
  expect(new Set(r.levels)).toEqual(new Set(['openwheel', 'wagon', 'coupe', 'muscle', 'hover', 'maestro']));   // every rival has its own body
  watch.check();
});

test('an old save: a Coupe in its instrument\'s color, only the free items open; locked ones say how to earn them', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await page.goto(URL); await ready(page);
  const s = await page.evaluate(() => Arcade.SpeedwayGarage.state());
  expect(s.choice).toMatchObject({body: 'coupe', paint: 'instrument', decal: null});
  expect(s.look.decal).toBe('none');
  expect(s.unlocked.body).toEqual(['coupe', 'mini']);
  expect(s.unlocked.paint).toEqual(['instrument', 'pink', 'cyan', 'yellow', 'green']);
  expect(s.unlocked.decal).toEqual(['none', 'stripes', 'number']);
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.pick('body', 'hover'))).toBe(false);
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.choice().body)).toBe('coupe');
  // the panel: locked tiles are silhouettes with their requirement; a tap says how to earn it and picks nothing
  await page.click('#garageBtn');
  await expect(page.locator('.sw-garage-ov')).toBeVisible();
  const muscle = page.locator('.g-opt[data-id="muscle"]');
  await expect(muscle).toHaveClass(/locked/);
  await expect(muscle).toContainText('Finish any 3 tracks');
  await muscle.click({force: true});                                                     // (aria-disabled: a tap still says why)
  await expect(page.locator('#gReq')).toContainText('Finish any 3 tracks');
  await expect(page.locator('#gReq')).toContainText('0 of 3 tracks so far');
  await expect(muscle).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('.sw-garage-ov')).toHaveCount(0);
  watch.check();
});

test('unlocks come from existing progress; the choice saves and comes back after a reload', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {games: progress([1, 2, 3, 4, 8], [5]),
    gameData: {'sustain-speedway': {achievements: {'perfect-lap': true}, bestLap: {'sustain-speedway|trumpet|1': 20}}}})});
  await page.goto(URL); await ready(page);
  const s = await page.evaluate(() => Arcade.SpeedwayGarage.state());
  // 5 wins (4 of them + The Grand Prix) + a 2nd place = 17 ★, 6 tracks finished
  expect(s.unlocked.body).toEqual(['coupe', 'mini', 'muscle', 'wagon', 'buggy', 'openwheel', 'hover']);
  expect(s.unlocked.paint).toEqual(['instrument', 'pink', 'cyan', 'yellow', 'green', 'amber', 'purple', 'red']);
  expect(s.unlocked.decal).toEqual(['none', 'stripes', 'number', 'flames', 'stars', 'checker', 'lightning']);
  await page.click('#garageBtn');
  await page.locator('.g-opt[data-id="hover"]').click();
  await page.locator('[data-tab="paint"]').click();
  await page.locator('.g-opt[data-id="red"]').click();
  await page.locator('[data-tab="decal"]').click();
  await page.locator('.g-opt[data-id="number"]').click();
  for (let i = 0; i < 5; i++) await page.locator('[data-num="1"]').click();         // 7 → 12
  await expect(page.locator('#gNumV')).toHaveText('12');
  await page.locator('#gDone').click();
  await page.reload(); await ready(page);
  const c = await page.evaluate(() => ({choice: Arcade.SpeedwayGarage.choice(), look: Arcade.SpeedwayGarage.look(), red: getComputedStyle(document.documentElement).getPropertyValue('--red').trim()}));
  expect(c.choice).toEqual({body: 'hover', paint: 'red', decal: 'number', number: 12});
  expect(c.look).toMatchObject({body: 'hover', decal: 'number', number: 12, color: c.red});
  watch.check();
});

test('a Racing Stripes skin still gives stripes (until a decal is chosen)', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet', {skins: {equipped: {trumpet: {color: 'stripes'}}}})});
  await page.goto(URL + '&unlockall'); await ready(page);
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.look().decal)).toBe('stripes');
  await page.evaluate(() => Arcade.SpeedwayGarage.pick('decal', 'none'));
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.look().decal)).toBe('none');
  watch.check();
});

test('a race uses the chosen car (the ghost too); a win shows NEW IN THE GARAGE!; four cars stay cheap', async ({page}) => {
  test.setTimeout(150000);
  const watch = await prepare(page, {store: device('trumpet', {gameData: {'sustain-speedway': {garage: {body: 'mini', paint: 'cyan', decal: 'number', number: 3},
    ghosts: {'sustain-speedway|trumpet|1': {t: 60, p: [0, .02, .05, .08, .1, .13, .16, .2, .25, .3]}}}}})});
  await page.goto(URL); await ready(page);
  await page.evaluate(() => { document.querySelector('.trk[data-l="1"]').click(); document.querySelector('.ls-start').click(); });
  // the "turn on the microphone" reminder, if it shows: its main button (the demo stands in for the mic)
  for (let i = 0; i < 20 && !(await page.evaluate(() => { const G = Arcade.Speedway.debug(); return G && G.phase === 'race'; })); i++) {
    await page.evaluate(() => { const b = document.querySelector('.overlay:not(#results) [data-act="go"], .overlay:not(#results) .btn-primary'); if (b && b.getClientRects().length) b.click(); });
    await page.waitForTimeout(400);
  }
  const car = await page.evaluate(() => Arcade.Speedway.car());
  expect(car).toMatchObject({body: 'mini', decal: 'number', number: 3});
  // the cars on the road: the rivals' own bodies, the ghost = your car
  await page.waitForTimeout(700);
  const drawn = await page.evaluate(() => Arcade.Speedway.debug().carsDrawn);
  expect(drawn.find(c => c.name === 'you').body).toBe('mini');
  const ghost = drawn.find(c => c.ghost); if (ghost) expect(ghost.body).toBe('mini');
  drawn.filter(c => c.name && !['you', 'Best run'].includes(c.name)).forEach(c => expect(c.body).not.toBe('mini'));
  // four cars: every car is one cached picture, so a frame's cars cost little (measured on the sprites the race built)
  const perf = await page.evaluate(() => {
    const C = Arcade.SpeedwayCars, x = document.getElementById('road').getContext('2d'), look = Arcade.Speedway.car();
    const cars = [look, {body: 'openwheel', color: '#3ae8ff'}, {body: 'wagon', color: '#ffe14d'}, {body: 'coupe', color: '#4dff88'}];
    cars.forEach((o, i) => C.draw(x, 200, 200, 60 + i * 20, Object.assign({dpr: 1.5, t: 0}, o)));
    const t0 = performance.now();
    for (let f = 0; f < 200; f++) cars.forEach((o, i) => C.draw(x, 200, 200, 60 + i * 20, Object.assign({dpr: 1.5, t: f * 16}, o)));
    return {msPerFrame: (performance.now() - t0) / 200, builds: C.stats().builds};
  });
  expect(perf.msPerFrame).toBeLessThan(4);
  // win the race: every lap in tune (demo Space), through the pit stops
  await page.keyboard.down('Space');
  await expect(page.locator('#results')).toBeVisible({timeout: 120000});
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => Arcade.SpeedwayCars.stats().builds)).toBeLessThan(400);   // sprites are reused, not redrawn every frame
  await expect(page.locator('#resCar')).toBeVisible();
  await expect(page.locator('#gNew')).toBeVisible();
  await expect(page.locator('#gNew')).toContainText('Dune Buggy');                            // a first win
  await page.locator('#gNewBtn').click();
  await expect(page.locator('.sw-garage-ov')).toBeVisible();
  await expect(page.locator('.g-opt[data-id="buggy"]')).not.toHaveClass(/locked/);
  expect(await page.evaluate(() => Arcade.SpeedwayGarage.fresh())).toEqual([]);              // seen now
  watch.check();
});

for (const [name, size, touch] of [['phone', {width: 390, height: 844}, true], ['iPad portrait', {width: 768, height: 1024}, true],
  ['iPad landscape', {width: 1024, height: 768}, true], ['laptop', {width: 1366, height: 768}, false]]) {
  test.describe(`the garage fits (${name})`, () => {
    if (touch) test.use({hasTouch: true});
    test('every tab: no sideways scroll, the preview and Done reachable', async ({page}) => {
      await page.setViewportSize(size);
      const watch = await prepare(page, {store: device('trumpet')});
      await page.goto(URL + '&unlockall'); await ready(page);
      await page.click('#garageBtn');
      for (const tab of ['body', 'paint', 'decal']) {
        await page.locator(`[data-tab="${tab}"]`).click();
        const r = await page.evaluate(() => {
          const ov = document.querySelector('.sw-garage-ov'), p = ov.querySelector('.panel').getBoundingClientRect(), pv = ov.querySelector('#gPrev').getBoundingClientRect();
          return {sideways: document.documentElement.scrollWidth > innerWidth + 1 || ov.scrollWidth > ov.clientWidth + 1,
            inside: p.left >= -1 && p.right <= innerWidth + 1, preview: pv.height > 100 && pv.width > 200};
        });
        expect(r, `${name} ${tab}`).toEqual({sideways: false, inside: true, preview: true});
      }
      await page.locator('#gDone').scrollIntoViewIfNeeded();
      await page.locator('#gDone').click();
      await expect(page.locator('.sw-garage-ov')).toHaveCount(0);
      watch.check();
    });
  });
}

/* GARAGE beside START (LevelSelect.show({beside})): in the sticky heading row, just left of START, visible at the top
   without scrolling, as tall as START and narrower; on a narrow phone only its icon; Tab reaches it before START */
for (const [name, size, touch] of [['phone', {width: 390, height: 844}, true], ['small phone', {width: 360, height: 740}, true], ['iPad portrait', {width: 768, height: 1024}, true],
  ['iPad landscape', {width: 1024, height: 768}, true], ['laptop', {width: 1366, height: 768}, false]]) {
  test.describe(`GARAGE beside START (${name})`, () => {
    if (touch) test.use({hasTouch: true});
    test('left of START in the sticky row, on screen at the top, Tab order GARAGE then START, still opens the garage', async ({page}) => {
      await page.setViewportSize(size);
      const watch = await prepare(page, {store: device('trumpet')});
      await page.goto(URL); await ready(page);
      await page.evaluate(() => { document.querySelector('.trk[data-l="1"]').click(); window.scrollTo(0, 0); });   // a track selected: START shows
      await expect(page.locator('.ls-start')).toBeVisible();
      const r = await page.evaluate(() => {
        const g = document.getElementById('garageBtn'), s = document.querySelector('.ls-start'), row = document.querySelector('.ls-row');
        const gr = g.getBoundingClientRect(), sr = s.getBoundingClientRect(), label = g.querySelector('.gb-t');
        return {inRow: row.contains(g) && g.parentElement === s.parentElement, before: g.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING,
          left: gr.right <= sr.left + 1, sameLine: Math.abs((gr.top + gr.bottom) / 2 - (sr.top + sr.bottom) / 2) < 4, sameHeight: Math.abs(gr.height - sr.height) <= 2,
          narrower: gr.width < sr.width, onScreen: gr.top >= 0 && gr.bottom <= innerHeight && gr.left >= 0 && sr.right <= innerWidth + 1,
          startOnScreen: sr.top >= 0 && sr.bottom <= innerHeight,
          startOneLine: s.querySelector('.ls-start-t').getClientRects().length === 1 && sr.height < 80,
          iconOnly: !label || getComputedStyle(label).display === 'none', aria: g.getAttribute('aria-label')};
      });
      // on screen at the top with no scrolling wherever START is (a 740 px phone shows the picker first: there START and
      // GARAGE both come into view together, and stick once scrolled to)
      expect(r).toMatchObject({inRow: true, left: true, sameLine: true, sameHeight: true, narrower: true, startOneLine: true, aria: 'Garage'});
      expect(r.onScreen).toBe(r.startOnScreen);
      if (size.height >= 768) expect(r.onScreen).toBe(true);
      expect(r.before).toBeTruthy();
      expect(r.iconOnly).toBe(size.width <= 560);                         // the label hides only on a narrow phone
      // the row sticks: scrolled down to the last tracks, GARAGE is still at the top
      await page.evaluate(() => { const t = document.querySelector('.trk[data-l="8"]'); t.scrollIntoView({block: 'end'}); });
      await page.waitForTimeout(150);
      const top = await page.evaluate(() => { const b = document.getElementById('garageBtn').getBoundingClientRect(); return b.top >= -1 && b.bottom <= innerHeight; });
      expect(top).toBe(true);
      // keyboard: Tab from GARAGE goes to START
      await page.locator('#garageBtn').focus();
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('ls-start'))).toBe(true);
      // it still opens the garage
      await page.locator('#garageBtn').click();
      await expect(page.locator('.sw-garage-ov')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('.sw-garage-ov')).toHaveCount(0);
      watch.check();
    });
  });
}
