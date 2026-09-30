/* NOTE NINJA: THE SENSEI BESIDE THE STAFF, SLICING NOTES (note-ninja/game.js drawGroup / pose / slice, shared/ui.js
   senseiSVG 'ready' / 'strike'). The Sensei stands INSIDE the scroll, in a slot at the right end of the staff drawing,
   wearing the belt: never over a note (read-ahead notes too), the clef, the key signature or the letter guides; the
   drawing keeps its old width (nothing is drawn smaller). A right answer: 'strike' + the two halves of the note, and the
   next note starts at once (read-ahead) or exactly after afterGroupMs as before; a wrong answer: 'hmm', no slice;
   reduced motion: the halves only fade. The results hero is the Sensei. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SIZES = [['phone', {width: 390, height: 844}], ['iPad portrait', {width: 768, height: 1024}],
  ['iPad landscape', {width: 1024, height: 768}], ['laptop', {width: 1366, height: 768}]];

async function play(page, lv, mode) {
  await page.goto('note-ninja/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Ninja);
  if (mode) {
    await page.evaluate(m => Arcade.store.setNoteMode('note-ninja', m), mode);
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.Ninja);
  }
  await page.evaluate(lv => document.querySelector(`.lvl[data-l="${lv}"]`).click(), lv);
  await page.evaluate(() => { const s = document.querySelector('.ls-start'); if (s) s.click(); });
  await page.waitForFunction(() => { const G = Arcade.Ninja.state(); return G && !G.locked && document.querySelector('#nnSensei svg'); });
}
/** the Sensei's box against every clef / key signature / guide letter and every note (head, stem, accidental) */
const layout = page => page.evaluate(() => {
  const r = e => e.getBoundingClientRect(), svg = document.querySelector('#playStaff svg'), ss = document.getElementById('nnSensei');
  const hit = (a, b) => a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5;
  const S = r(ss), box = r(document.getElementById('scroll'));
  const marks = [...svg.children].filter(e => e.tagName === 'text').map(r);                      // clef, key signature, guides
  const notes = [...svg.querySelectorAll('[id^="nn"]:not(#nnSensei)')].filter(g => /^nn\d$/.test(g.id))
    .flatMap(g => [...g.children].filter(c => !c.classList.contains('ncap')).map(r));
  const G = Arcade.Ninja.state();
  return {inside: S.left >= box.left - .5 && S.right <= box.right + .5 && S.top >= box.top - .5 && S.bottom <= box.bottom + .5,
    over: marks.concat(notes).filter(m => hit(S, m)).length, notes: notes.length, marks: marks.length,
    height: S.height / r(svg).height, vbW: svg.viewBox.baseVal.width, belt: ss.dataset.belt, beltWant: G.L.color,
    oldW: [0, 290, 330, 380, 420][G.L.onStaff] + Arcade.keySigWidth(G.sig), pose: Arcade.Ninja.sensei()};
});

for (const [name, size] of SIZES) {
  test(`${name}: the Sensei stands in the scroll, clear of the clef, key signature, guides and every note`, async ({page}) => {
    test.setTimeout(90000);
    await page.setViewportSize(size);
    const watch = await prepare(page, {store: device('trumpet')});
    // White (1 note + guides), Purple (read-ahead), Diamond (4 notes), and a key signature (Concert E♭, read-ahead)
    for (const [lv, mode] of [[1], [6], [10], [10, {notes: 'Eb', order: 'random'}], [10, {notes: 'chrom', order: 'random'}]]) {
      await play(page, lv, mode);
      const L = await layout(page);
      const at = `${name} belt ${lv}${mode ? ' ' + mode.notes : ''}`;
      expect(L.inside, at).toBe(true);
      expect(L.over, at).toBe(0);
      expect(L.notes, at).toBeGreaterThan(0);
      expect(L.marks, at).toBeGreaterThan(0);
      expect(L.height, at).toBeGreaterThan(.55);                  // sized to the drawing (the box's height)
      expect(L.vbW, at).toBe(L.oldW);                               // the same drawing width as before: nothing drawn smaller
      expect(L.belt, at).toBe(L.beltWant);                          // he wears the level's belt
      expect(L.pose, at).toBe('ready');
    }
    await expect(page.locator('#ninja')).toHaveCount(0);            // the old ninja figure is gone
    watch.check();
  });
}

test('a right answer: strike + the note split in two, and the next note starts exactly as before', async ({page}) => {
  await page.setViewportSize({width: 1024, height: 768});
  const watch = await prepare(page, {store: device('trumpet')});
  // read-ahead (Diamond, 4 notes on the staff): the next note starts at once
  await play(page, 10);
  const r = await page.evaluate(() => {
    const G = Arcade.Ninja.state(), it = G.items[G.i], i0 = G.i, t0 = performance.now();
    if (it.acc) document.querySelector(`.acc[data-acc="${it.acc}"]`).click();
    document.querySelector(`.letter[data-letter="${it.letter}"]`).click();
    const halves = document.querySelectorAll('.nn-slice .nn-half').length, streaks = document.querySelectorAll('.nn-slice .nn-streak').length;
    return {halves, streaks, next: G.i === i0 + 1, started: G.noteStart >= t0, locked: G.locked, pose: Arcade.Ninja.sensei(),
      hidden: getComputedStyle(document.querySelector('#nn0 ellipse.head')).visibility, cap: !!document.querySelector('#nn0 .ncap')};
  });
  expect(r).toEqual({halves: 2, streaks: 2, next: true, started: true, locked: false, pose: 'strike', hidden: 'hidden', cap: true});
  await expect.poll(() => page.locator('.nn-slice').count(), {timeout: 2000}).toBe(0);   // the halves are gone after ~300 ms
  await expect.poll(() => page.evaluate(() => Arcade.Ninja.sensei())).toBe('ready');
  // one note at a time (White): the next note comes after afterGroupMs, exactly as before
  await play(page, 1);
  const t = await page.evaluate(async () => {
    const G = Arcade.Ninja.state(), it = G.items[G.i], t0 = performance.now();
    document.querySelector(`.letter[data-letter="${it.letter}"]`).click();
    const halves = document.querySelectorAll('.nn-half').length;
    await new Promise(res => { const tick = () => (!Arcade.Ninja.state().locked ? res() : requestAnimationFrame(tick)); tick(); });
    return {halves, wait: performance.now() - t0, rule: window.NINJA_RULES.afterGroupMs};
  });
  expect(t.halves).toBe(2);
  expect(t.wait).toBeGreaterThanOrEqual(t.rule - 5);
  expect(t.wait).toBeLessThan(t.rule + 250);
  watch.check();
});

test('a wrong answer: the Sensei says "hmm", nothing is sliced', async ({page}) => {
  const watch = await prepare(page, {store: device('trumpet')});
  await play(page, 1);
  const r = await page.evaluate(() => {
    const G = Arcade.Ninja.state(), it = G.items[G.i], wrong = 'ABCDEFG'.split('').find(l => l !== it.letter);
    document.querySelector(`.letter[data-letter="${wrong}"]`).click();
    return {pose: Arcade.Ninja.sensei(), slices: document.querySelectorAll('.nn-slice').length, wrong: G.wrong,
      mood: document.querySelector('#nnSensei svg').getAttribute('class')};
  });
  expect(r).toEqual({pose: 'hmm', slices: 0, wrong: 1, mood: 'sensei hmm'});
  await expect.poll(() => page.evaluate(() => Arcade.Ninja.sensei()), {timeout: 3000}).toBe('ready');
  watch.check();
});

test('reduced motion: the note splits in place and fades (no sliding), and the results hero is the Sensei', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  const watch = await prepare(page, {store: device('trumpet')});
  await play(page, 1);
  const moves = await page.evaluate(() => {
    const G = Arcade.Ninja.state(), it = G.items[G.i];
    document.querySelector(`.letter[data-letter="${it.letter}"]`).click();
    return [...document.querySelectorAll('.nn-half, .nn-streak')].flatMap(e => e.getAnimations().flatMap(a => a.effect.getKeyframes()))
      .some(k => k.transform && k.transform !== 'none' || k.strokeDashoffset != null);
  });
  expect(moves).toBe(false);
  // name every note of the belt, then the results
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate(() => {
      const G = Arcade.Ninja.state();
      if (!G || G.i >= G.count) return true;
      if (G.locked) return false;
      const it = G.items[G.i];
      if (it.acc) document.querySelector(`.acc[data-acc="${it.acc}"]`).click();
      document.querySelector(`.letter[data-letter="${it.letter}"]`).click();
      return false;
    });
    if (done) break;
    await page.waitForTimeout(150);
  }
  await expect(page.locator('#results #resNinja svg.sensei')).toBeVisible({timeout: 5000});
  expect(await page.locator('#results #resNinja svg.sensei').getAttribute('class')).toBe('sensei happy');
  watch.check();
});
