/* THE SPELLED ANSWER PADS (shared/answer-pad.js `notes`, shared/sequences.js `spelled`, teacher-settings.js
   SPELL_ANSWER_BUTTONS): with First 5 or a scale, a note-name pad shows one button per note of the WHOLE set, already
   spelled ("B♭ C D E♭ F" for flute First 5), one tap answers letter + accidental, no ♭ ♮ ♯ row; Chromatic keeps the
   Shift pad (♭ ♮ ♯ + A–G); the teacher setting off = the Shift pad everywhere. Note Ninja (its own pad, same rule),
   Dojo Duel (two pads), Keys to the City (key-signature rounds), Blocktave (TOUCH note cards: the component's rule). */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const SIZES = [['phone', {width: 360, height: 740}], ['iPad portrait', {width: 768, height: 1024}],
  ['iPad landscape', {width: 1024, height: 768}], ['Chromebook', {width: 1366, height: 768}]];

/** Note Ninja at belt lv with a NOTES choice, playing */
async function ninja(page, lv, mode) {
  await page.goto('note-ninja/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.Ninja);
  if (mode) {
    await page.evaluate(m => Arcade.store.setNoteMode('note-ninja', m), mode);
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.Ninja);
  }
  await page.evaluate(lv => document.querySelector(`.lvl[data-l="${lv}"]`).click(), lv);
  await page.evaluate(() => { const s = document.querySelector('.ls-start'); if (s) s.click(); });
  await page.waitForFunction(() => { const G = Arcade.Ninja.state(); return G && !G.locked; });
}
const ninjaPad = page => page.evaluate(() => ({
  labels: [...document.querySelectorAll('#letters .letter')].map(b => b.textContent),
  aria: [...document.querySelectorAll('#letters .letter')].map(b => b.getAttribute('aria-label')),
  accRow: !document.getElementById('accRow').hidden,
}));
/** wait for the next note (after a right answer, read-ahead or a new group) */
const ready = (page, i) => page.waitForFunction(i => { const G = Arcade.Ninja.state(); return G && (G.i > i || !document.getElementById('play').offsetParent) && !G.locked; }, i);

test.describe('Note Ninja', () => {
  test('flute First 5: exactly B♭ C D E♭ F, no ♭ ♮ ♯ row, one tap answers (level 1 still shows all five)', async ({page}) => {
    const watch = await prepare(page, {store: device('flute')});
    await ninja(page, 1);
    const p = await ninjaPad(page);
    expect(p.labels).toEqual(['B♭', 'C', 'D', 'E♭', 'F']);
    expect(p.aria).toEqual(['B flat', 'C', 'D', 'E flat', 'F']);
    expect(p.accRow).toBe(false);
    expect(await page.evaluate(() => Arcade.Ninja.state().items.every(it => ['B♭', 'C', 'D'].includes(it.label)))).toBe(true);   // the smaller pool
    // every note of the level, ONE tap each on its spelled button; B♭ comes up (each pool note before any repeats)
    const seen = new Set();
    for (let k = 0; k < 4; k++) {
      const it = await page.evaluate(() => { const G = Arcade.Ninja.state(), it = G.items[G.i]; return {i: G.i, letter: it.letter, label: it.label, hits: G.hits}; });
      seen.add(it.label);
      expect(await page.locator('#demoAns').textContent()).toBe(`Answer: ${it.label}`);   // the demo hint: the spelled name
      await page.evaluate(l => document.querySelector(`#letters .letter[data-letter="${l}"]`).click(), it.letter);
      expect(await page.evaluate(() => Arcade.Ninja.state().hits)).toBe(it.hits + 1);
      expect(await page.evaluate(() => Arcade.Ninja.state().wrong)).toBe(0);
      await ready(page, it.i);
    }
    expect(seen.has('B♭')).toBe(true);
    watch.check();
  });

  test('keyboard: B answers B♭ in the flute set; 1/2/3 do nothing there; a wrong tap names what was tapped', async ({page}) => {
    const watch = await prepare(page, {store: device('flute')});
    await ninja(page, 2);
    for (let k = 0; k < 12; k++) {                                            // until a B♭ comes up
      const it = await page.evaluate(() => { const G = Arcade.Ninja.state(), it = G.items[G.i]; return {i: G.i, letter: it.letter, label: it.label}; });
      if (it.label === 'B♭') {
        await page.keyboard.press('3');                                        // (a sharp, on the Shift pad) ignored here
        await page.keyboard.press('b');
        expect(await page.evaluate(() => Arcade.Ninja.state().hits)).toBeGreaterThan(0);
        expect(await page.evaluate(() => Arcade.Ninja.state().wrong)).toBe(0);
        await ready(page, it.i);
        break;
      }
      await page.keyboard.press(it.letter.toLowerCase());
      await ready(page, it.i);
      expect(k, 'a B♭ in 12 notes').toBeLessThan(11);
    }
    // a wrong tap: "Not E♭." (the spelled name of the button)
    const it = await page.evaluate(() => { const G = Arcade.Ninja.state(); return G.items[G.i].letter; });
    if (it !== 'E') {
      await page.evaluate(() => document.querySelector('#letters .letter[data-letter="E"]').click());
      await expect(page.locator('#prompt')).toContainText('Not E♭');
    }
    watch.check();
  });

  for (const [who, store, want] of [
    ['trumpet First 5', device('trumpet'), ['C', 'D', 'E', 'F', 'G']],
    ['horn, F starting notes', device('horn', {hornStart: 'F'}), ['F', 'G', 'A', 'B♭', 'C']],
    ['horn, C starting notes', device('horn', {hornStart: 'C'}), ['C', 'D', 'E', 'F', 'G']],
  ]) {
    test(`${who}: ${want.join(' ')}`, async ({page}) => {
      const watch = await prepare(page, {store});
      await ninja(page, 1);
      const p = await ninjaPad(page);
      expect(p.labels).toEqual(want);
      expect(p.accRow).toBe(false);
      watch.check();
    });
  }

  for (const [notes, want] of [['Eb', ['C', 'D', 'E', 'F', 'G', 'A', 'B']], ['Bb', ['G', 'A', 'B', 'C', 'D', 'E', 'F♯']]]) {
    test(`alto sax, concert ${notes} scale (written): ${want.join(' ')}, in Random and Scale Order`, async ({page}) => {
      const watch = await prepare(page, {store: device('altosax')});
      for (const order of ['random', 'order']) {
        await ninja(page, 1, {notes, order});
        const p = await ninjaPad(page);
        expect(p.labels, order).toEqual(want);
        expect(p.accRow, order).toBe(false);
        // the answers are these spellings, one tap each
        const it = await page.evaluate(() => { const G = Arcade.Ninja.state(); return G.items[G.i]; });
        await page.evaluate(l => document.querySelector(`#letters .letter[data-letter="${l}"]`).click(), it.letter);
        expect(await page.evaluate(() => Arcade.Ninja.state().hits), order).toBe(1);
      }
      watch.check();
    });
  }

  test('Chromatic keeps the Shift pad: ♭ ♮ ♯ + A–G, the sign first', async ({page}) => {
    const watch = await prepare(page, {store: device('flute')});
    await ninja(page, 1, {notes: 'chrom', order: 'random'});
    const p = await ninjaPad(page);
    expect(p.labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(p.accRow).toBe(true);
    await page.evaluate(() => document.querySelector('.acc[data-acc="-1"]').click());
    expect((await ninjaPad(page)).labels).toEqual(['A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F♭', 'G♭']);
    await page.evaluate(() => document.querySelector('.acc[data-acc="0"]').click());   // back to ♮ (♭ again would toggle it off)
    for (let k = 0; k < 3; k++) {
      const it = await page.evaluate(() => { const G = Arcade.Ninja.state(), it = G.items[G.i]; return {i: G.i, letter: it.letter, acc: it.acc, hits: G.hits}; });
      await page.evaluate(it => { if (it.acc) document.querySelector(`.acc[data-acc="${it.acc}"]`).click(); document.querySelector(`#letters .letter[data-letter="${it.letter}"]`).click(); }, it);
      expect(await page.evaluate(() => Arcade.Ninja.state().hits)).toBe(it.hits + 1);
      await ready(page, it.i);
    }
    watch.check();
  });

  test('the teacher setting off: the old Shift pad for First 5 and the scales', async ({page}) => {
    await page.route(/shared\/teacher-settings\.js/, async route => {
      const body = (await (await route.fetch()).text()).replace('SPELL_ANSWER_BUTTONS: true', 'SPELL_ANSWER_BUTTONS: false');
      await route.fulfill({contentType: 'text/javascript', body});
    });
    const watch = await prepare(page, {store: device('flute')});
    await ninja(page, 1);
    const p = await ninjaPad(page);
    expect(p.labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(p.accRow).toBe(true);
    await ninja(page, 1, {notes: 'Eb', order: 'order'});
    expect((await ninjaPad(page)).accRow).toBe(true);
    watch.check();
  });

  for (const [name, size] of SIZES) {
    test(`${name}: the spelled pad fits (no overflow, buttons ≥ 48 px, at most two rows)`, async ({page}) => {
      await page.setViewportSize(size);
      const watch = await prepare(page, {store: device('altosax')});
      for (const mode of [{notes: 'Bb', order: 'random'}, {notes: 'first5', order: 'random'}]) {
        await ninja(page, 1, mode);
        const L = await page.evaluate(() => {
          const bs = [...document.querySelectorAll('#letters .letter')].map(b => b.getBoundingClientRect());
          return {n: bs.length, minW: Math.min(...bs.map(b => b.width)), minH: Math.min(...bs.map(b => b.height)),
            left: Math.min(...bs.map(b => b.left)), right: Math.max(...bs.map(b => b.right)), rows: new Set(bs.map(b => Math.round(b.top))).size,
            vw: document.documentElement.clientWidth, scrollW: document.documentElement.scrollWidth,
            text: [...document.querySelectorAll('#letters .letter')].every(b => b.scrollWidth <= b.clientWidth + 1)};
        });
        const at = `${name} ${mode.notes}`;
        expect(L.minW, at).toBeGreaterThanOrEqual(48);
        expect(L.minH, at).toBeGreaterThanOrEqual(48);
        expect(L.left, at).toBeGreaterThanOrEqual(0);
        expect(L.right, at).toBeLessThanOrEqual(L.vw);
        expect(L.scrollW, at).toBeLessThanOrEqual(L.vw);
        expect(L.rows, at).toBeLessThanOrEqual(2);
        expect(L.text, at).toBe(true);
        if (size.width >= 768) expect(L.rows, at).toBe(1);
      }
      watch.check();
    });
  }
});

test.describe('AnswerPad (the shared component: Dojo Duel, Keys to the City, Blocktave)', () => {
  test('notes → spelled buttons, one tap, letter keys; no notes → the Shift pad; set() switches', async ({page}) => {
    const watch = await prepare(page, {store: device('flute')});
    await page.goto('note-ninja/index.html?demo&nostart');
    await page.waitForFunction(() => window.Arcade && Arcade.AnswerPad && Arcade.buildSequence);
    const r = await page.evaluate(() => {
      const A = Arcade, el = document.createElement('div'); el.style.width = '600px'; document.body.appendChild(el);
      const got = [], m = A.currentMember(), grp = A.currentInstrument();
      const seq = A.buildSequence({member: m, group: grp, notes: 'first5', level: 1});
      const pad = A.AnswerPad.mount(el, {accs: true, notes: seq.spelled, onAnswer: (l, a) => got.push(l + a)});
      const labels = () => [...el.querySelectorAll('.apad-letter')].map(b => b.textContent);
      const out = {pool: seq.pool.length, spelled: labels(), accRow: !el.querySelector('.apad-accs').hidden,
        aria: [...el.querySelectorAll('.apad-letter')].map(b => b.getAttribute('aria-label'))};
      el.querySelector('.apad-letter[data-letter="B"]').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
      pad.setAcc(1); pad.press('E');                               // a Shift does nothing on a spelled pad
      out.got = got.slice(); out.letters = pad.letters(); out.label = pad.label('E');
      const ch = A.buildSequence({member: m, group: grp, notes: 'chrom', level: 1});
      pad.set({notes: ch.spelled});
      out.chromSpelled = ch.spelled; out.chrom = labels(); out.chromRow = !el.querySelector('.apad-accs').hidden;
      pad.setAcc(-1); out.shifted = labels(); pad.press('D'); out.got2 = got.slice(2);
      return out;
    });
    expect(r.pool).toBe(3);                                         // level 1's smaller pool …
    expect(r.spelled).toEqual(['B♭', 'C', 'D', 'E♭', 'F']);       // … still all five buttons
    expect(r.aria).toEqual(['B flat', 'C', 'D', 'E flat', 'F']);
    expect(r.accRow).toBe(false);
    expect(r.got).toEqual(['B-1', 'E-1']);
    expect(r.letters).toEqual(['B', 'C', 'D', 'E', 'F']);
    expect(r.label).toBe('E♭');
    expect(r.chromSpelled).toBe(null);
    expect(r.chrom).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(r.chromRow).toBe(true);
    expect(r.shifted).toEqual(['A♭', 'B♭', 'C♭', 'D♭', 'E♭', 'F♭', 'G♭']);
    expect(r.got2).toEqual(['D-1']);
    watch.check();
  });

  test('every instrument: First 5 = its five notes low to high, a scale = 7 letters from the tonic, all distinct', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('note-ninja/index.html?demo&nostart');
    await page.waitForFunction(() => window.Arcade && Arcade.buildSequence);
    const bad = await page.evaluate(() => {
      const A = Arcade, out = [], LET = 'CDEFGAB';
      for (const grp of A.INSTRUMENTS) for (const m of grp.members) {
        if (m.pitched === false || !grp.notes) continue;
        for (const notes of ['first5', 'Bb', 'Eb', 'F', 'Ab']) {
          let s; try { s = A.buildSequence({member: m, group: grp, notes, level: 1}).spelled; } catch (e) { continue; }
          const ls = s.map(n => n.letter);
          if (new Set(ls).size !== ls.length) out.push(`${m.id} ${notes}: a letter twice`);
          if (s.length !== (notes === 'first5' ? 5 : 7)) out.push(`${m.id} ${notes}: ${s.length} buttons`);
          if (notes === 'first5' && ls.join() !== grp.notes.map(n => n.letter).join()) out.push(`${m.id} first5 not its notes in order`);
          for (let i = 1; i < ls.length; i++) if (LET[(LET.indexOf(ls[i - 1]) + 1) % 7] !== ls[i]) out.push(`${m.id} ${notes}: not in letter order`);
        }
      }
      return out;
    });
    expect(bad).toEqual([]);
    watch.check();
  });
});

test.describe('Dojo Duel', () => {
  const store = device('flute', {gameData: {'dojo-duel': {setup: {mode: '2p', layout: 'side', count: 'off', to: 7,
    p: [{clef: 'treble', notes: 'first5', belt: 1}, {clef: 'bass', notes: 'Eb', belt: 1}]}}}});
  const pads = page => page.evaluate(() => [0, 1].map(pi => ({
    labels: [...document.querySelectorAll(`#pad${pi} .apad-letter`)].map(b => b.textContent),
    accRow: !document.querySelector(`#pad${pi} .apad-accs`).hidden})));

  test('both pads follow the rule: each player\'s own set, spelled; one tap answers', async ({page}) => {
    const watch = await prepare(page, {store});
    await page.goto('dojo-duel/index.html?demo&nostart');
    await page.waitForFunction(() => window.Arcade && Arcade.Duel);
    await page.click('#goBtn');
    await page.waitForFunction(() => { const s = Arcade.Duel.state(); return s && s.phase === 'play'; }, null, {timeout: 20000});
    const p = await pads(page);
    expect(p[0].labels).toEqual(['B♭', 'C', 'D', 'E♭', 'F']);              // flute, First 5
    expect(p[1].labels).toEqual(['E♭', 'F', 'G', 'A♭', 'B♭', 'C', 'D']);   // bass clef (trombone), the concert E♭ scale
    expect(p[0].accRow).toBe(false); expect(p[1].accRow).toBe(false);
    // Player 2 taps the right button once (by the letter only): the point
    const it = await page.evaluate(() => Arcade.Duel.state().players[1].it);
    await page.locator(`#pad1 .apad-letter[data-letter="${it.letter}"]`).dispatchEvent('pointerdown');
    await page.waitForFunction(() => Arcade.Duel.state().players[1].score === 1, null, {timeout: 5000});
    watch.check();
  });

  test('Chromatic and the teacher setting off: the Shift pad', async ({page}) => {
    await page.route(/shared\/teacher-settings\.js/, async route => {
      const body = (await (await route.fetch()).text()).replace('SPELL_ANSWER_BUTTONS: true', 'SPELL_ANSWER_BUTTONS: false');
      await route.fulfill({contentType: 'text/javascript', body});
    });
    const watch = await prepare(page, {store});
    await page.goto('dojo-duel/index.html?demo&nostart');
    await page.waitForFunction(() => window.Arcade && Arcade.Duel);
    await page.click('#goBtn');
    await page.waitForFunction(() => { const s = Arcade.Duel.state(); return s && s.phase === 'play'; }, null, {timeout: 20000});
    const p = await pads(page);
    expect(p[0].labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(p[0].accRow).toBe(true); expect(p[1].accRow).toBe(true);
    watch.check();
  });

  for (const [name, size] of SIZES) {
    test(`${name}: both spelled pads fit`, async ({page}) => {
      await page.setViewportSize(size);
      // a phone: TABLETOP (the default on touch screens); side by side halves there are narrower than 3 buttons
      const st = size.width < 500 ? JSON.parse(JSON.stringify(store).replace('"layout":"side"', '"layout":"table"')) : store;
      const watch = await prepare(page, {store: st});
      await page.goto('dojo-duel/index.html?demo&nostart');
      await page.waitForFunction(() => window.Arcade && Arcade.Duel);
      await page.click('#goBtn');
      await page.waitForFunction(() => { const s = Arcade.Duel.state(); return s && s.phase === 'play'; }, null, {timeout: 20000});
      const L = await page.evaluate(() => [0, 1].map(pi => {
        const pad = document.getElementById('pad' + pi).getBoundingClientRect();
        const bs = [...document.querySelectorAll(`#pad${pi} .apad-letter`)].map(b => b.getBoundingClientRect());
        return {minW: Math.min(...bs.map(b => b.width)), out: bs.filter(b => b.left < pad.left - 1 || b.right > pad.right + 1).length,
          rows: new Set(bs.map(b => Math.round(b.top))).size, offScreen: bs.filter(b => b.left < 0 || b.right > innerWidth).length};
      }));
      for (const [pi, l] of L.entries()) {
        expect(l.minW, `${name} pad ${pi}`).toBeGreaterThanOrEqual(48);
        expect(l.out, `${name} pad ${pi}`).toBe(0);
        expect(l.offScreen, `${name} pad ${pi}`).toBe(0);
        expect(l.rows, `${name} pad ${pi}`).toBeLessThanOrEqual(2);
      }
      watch.check();
    });
  }
});

/** Keys to the City: district lv, its rounds answered (Arcade.KeysCity.answer) until `n` NAME rounds were checked by fn */
async function kttcNameRounds(page, lv, n, fn) {
  await page.evaluate(lv => Arcade.KeysCity.begin(lv), lv);
  await page.waitForSelector('#introGo', {state: 'visible'});
  await page.click('#introGo');
  let checked = 0;
  for (let k = 0; k < 40 && checked < n; k++) {
    await page.waitForFunction(() => { const s = Arcade.KeysCity.state(); return s.round && !s.done && document.querySelector('#pad:not(.off)') || (s.round && !s.done && s.round.type !== 'name'); }, null, {timeout: 15000, polling: 100});
    const s = await page.evaluate(() => Arcade.KeysCity.state());
    if (s.round.type === 'name') { await fn(s); checked++; }
    else await page.evaluate(() => Arcade.KeysCity.answer());
    await page.waitForFunction(i => { const s = Arcade.KeysCity.state(); return s.i !== i || s.menu; }, s.i, {timeout: 15000, polling: 100});
  }
  expect(checked, `district ${lv}: NAME rounds checked`).toBe(n);
}
const kttcPad = page => page.evaluate(() => ({labels: [...document.querySelectorAll('#pad .apad-letter')].map(b => b.textContent),
  accRow: !document.querySelector('#pad .apad-accs').hidden, ghost: document.querySelector('#pad .apad-accs').classList.contains('apad-ghost')}));

test('Keys to the City: a key-signature NAME round shows that key\'s 7 notes, spelled, one tap; plain rounds keep their pad', async ({page}) => {
  test.setTimeout(120000);
  const watch = await prepare(page, {store: device('flute')});
  await page.goto('keys-to-the-city/index.html?demo&nostart');
  await page.waitForFunction(() => window.Arcade && Arcade.KeysCity);
  // Key Signature Square: every NAME round has a key signature
  await kttcNameRounds(page, 7, 2, async s => {
    const p = await kttcPad(page);
    const want = await page.evaluate(key => { const K = Arcade.KTTC, t = K.KEYS[key].tonic, m = K.midiOf(Object.assign({oct: 4}, t));
      return K.scaleOf(key, m).slice(0, 7).map(x => K.label(x.n)); }, s.round.key);
    expect(p.labels, s.round.key).toEqual(want);
    expect(p.accRow, 'no ♭ ♮ ♯ row in this district').toBe(false);
    await page.locator(`#pad .apad-letter[data-letter="${s.round.name[0]}"]`).dispatchEvent('pointerdown');   // one tap
    await page.waitForFunction(r => Arcade.KeysCity.state().right === r + 1, s.right);
  });
  // Sharp Street (no key signature, black keys): ♭ ♮ ♯ + A–G
  await kttcNameRounds(page, 3, 1, async () => {
    const p = await kttcPad(page);
    expect(p.labels).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(p.accRow).toBe(true);
    expect(p.ghost).toBe(false);
    await page.evaluate(() => Arcade.KeysCity.answer());
  });
  watch.check();
});
