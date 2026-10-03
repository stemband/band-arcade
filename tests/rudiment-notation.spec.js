/* RUDIMENT NOTATION (shared/counting.js + shared/rhythm-staff.js): sticking (R / L), accents (>), grace notes ({L} flams,
   {RR} drags), roll slashes (/ // ///), buzz strokes (z), the written-out roll view and Counting.strokes(). The syntax
   examples are NOT the official rudiments (that list comes later and Mr. Graham checks it).
   UNCHANGED OUTPUT: fixtures/rhythm-staff-before.json holds, for every Counting Board example, every Rhythm Dojo level
   cell and the snare's extra rhythms, the counting text, a hash of the parsed notes (the fields that existed before) and
   hashes of the SVG engrave() drew before rudiment notation (3 option sets, + one row per measure): all must match.
   GALLERY=1 saves docs/gallery/rudiment-notation.png (every example, both roll views, sticking only and counting +
   sticking, at iPad width) for Mr. Graham's review. */
const {test, expect} = require('@playwright/test');
const crypto = require('crypto'), path = require('path');
const {prepare} = require('./helpers');

const ROOT = path.join(__dirname, '..');
const BEFORE = require('./fixtures/rhythm-staff-before.json');
const EX = [
  // (the prompt's 's>R sL sR sR | s>L sR sL sL' has a bar line after one beat and 's/R s/L e>R er' is 1½ beats: neither
  // fills a 2/4 bar, so the paradiddle is one bar of eight sixteenths and the roll figure ends with a quarter rest)
  {name: 'Single paradiddle', time: '2/4', text: 's>R sL sR sR s>L sR sL sL'},
  {name: 'Flam accent', time: '2/4', text: '[{L}e>R eL eR] [{R}e>L eR eL]'},
  {name: 'Flam tap', time: '2/4', text: '{L}s>R sR {R}s>L sL {L}s>R sR {R}s>L sL'},
  {name: 'Single drag tap', time: '2/4', text: '{LL}eR e>L {RR}eL e>R'},
  {name: 'Five-stroke-roll-like figure', time: '2/4', text: 's/R s/L e>R qr'},
  {name: 'Multiple bounce', time: '2/4', text: 'ezR ezL ezR ezL'},
  {name: 'Flam accent in 6/8', time: '6/8', text: '{L}e>R eL eR {R}e>L eR eL'},
];
const sha = s => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);

async function open(page) {
  const watch = await prepare(page);
  await page.goto('rhythm-dojo/counting.html');
  await page.evaluate(() => document.fonts && document.fonts.ready);
  return watch;
}

test.describe('rudiment notation', () => {
  test('every example parses with its hands, accents, graces, rolls and buzzes', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    const got = await page.evaluate(EX => EX.map(e => {
      const p = Arcade.Counting.parse(e.text, e.time);
      return {errors: p.errors, measures: p.measures, notes: p.notes.map(n => [n.hand, n.accent, n.graces.join(''), n.roll, n.buzz, n.rest])};
    }), EX);
    got.forEach(g => expect(g.errors).toEqual([]));
    const N = (hand, accent = false, graces = '', roll = 0, buzz = false, rest = false) => [hand, accent, graces, roll, buzz, rest];
    expect(got[0].notes).toEqual([N('R', true), N('L'), N('R'), N('R'), N('L', true), N('R'), N('L'), N('L')]);
    expect(got[0].measures).toBe(1);
    expect(got[1].notes).toEqual([N('R', true, 'L'), N('L'), N('R'), N('L', true, 'R'), N('R'), N('L')]);
    expect(got[2].notes).toEqual([N('R', true, 'L'), N('R'), N('L', true, 'R'), N('L'), N('R', true, 'L'), N('R'), N('L', true, 'R'), N('L')]);
    expect(got[3].notes).toEqual([N('R', false, 'LL'), N('L', true), N('L', false, 'RR'), N('R', true)]);
    expect(got[4].notes).toEqual([N('R', false, '', 1), N('L', false, '', 1), N('R', true), N(null, false, '', 0, false, true)]);
    expect(got[5].notes).toEqual([N('R', false, '', 0, true), N('L', false, '', 0, true), N('R', false, '', 0, true), N('L', false, '', 0, true)]);
    expect(got[6].notes).toEqual(got[1].notes);
    // the graces take no time: the flam accent's bar is exactly 2/4; // and /// parse
    const more = await page.evaluate(() => {
      const C = Arcade.Counting, p = C.parse('[{L}e>R eL eR] [{R}e>L eR eL]', '2/4');
      const r = C.parse('q//R q///L', '2/4');
      return {total: p.total, ticks: p.notes.map(n => n.t), counting: C.text(C.groups(p)), rolls: r.notes.map(n => n.roll), rErr: r.errors,
        plain: JSON.stringify(C.parse('q q q q', '4/4').notes[0])};
    });
    expect(more.total).toBe(24);
    expect(more.ticks).toEqual([0, 4, 8, 12, 16, 20]);
    expect(more.counting).toBe('1 la le 2 la le');
    expect(more.rolls).toEqual([2, 3]);
    expect(more.rErr).toEqual([]);
    expect(JSON.parse(more.plain)).toEqual({i: 0, t: 0, d: 12, rest: false, tie: false, dots: 0, val: 'q', trip: 0, measure: 0,
      hand: null, accent: false, graces: [], roll: 0, buzz: false});
    watch.check();
  });

  test('bad tokens give clear errors', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    const errs = await page.evaluate(() => Object.fromEntries(['{X}qR q q q', '{L}qr q q q', 'qrR q q q', 'qz/R q q q', 'q/r q q q', 'qzr q q q',
      'q>r q q q', '{L} qR q q q', '{}qR q q q', 'q////R q q q', 'qRL q q q'].map(t => [t, Arcade.Counting.parse(t, '4/4').errors])));
    expect(errs['{X}qR q q q']).toEqual(['"{X}qR": grace notes are R or L, like {L}eR or {RR}eL.']);
    expect(errs['{L}qr q q q']).toEqual(['"{L}qr": a rest can\'t have grace notes.']);
    expect(errs['qrR q q q']).toEqual(['"qrR": a rest has no hand (R or L).']);
    expect(errs['qz/R q q q']).toEqual(['"qz/R": a note is a buzz (z) or a roll (/), not both.']);
    expect(errs['q/r q q q'][0]).toBe('I can\'t read "q/r".');                        // the order is value dots rest roll …
    expect(errs['qzr q q q'][0]).toMatch(/^I can't read/);
    expect(await page.evaluate(() => Arcade.Counting.parse('qr/ q q q', '4/4').errors)).toEqual(['"qr/": a rest can\'t be a roll (/) or a buzz (z).']);
    expect(await page.evaluate(() => Arcade.Counting.parse('qrz q q q', '4/4').errors)).toEqual(['"qrz": a rest can\'t be a roll (/) or a buzz (z).']);
    expect(await page.evaluate(() => Arcade.Counting.parse('qr> q q q', '4/4').errors)).toEqual(['"qr>": a rest can\'t be accented.']);
    expect(errs['{L} qR q q q'][0]).toBe('"{L}": a grace note goes right before its note, with no space: {L}eR.');
    expect(errs['{}qR q q q']).toEqual(['"{}qR": grace notes are R or L, like {L}eR or {RR}eL.']);
    expect(errs['q////R q q q']).toEqual(['"q////R": a roll has at most three slashes (///).']);
    expect(errs['qRL q q q'][0]).toMatch(/^I can't read/);
    watch.check();
  });

  test('strokes(): the playing order, graces before their note, a slash = two strokes, the same in both roll views', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    const r = await page.evaluate(() => {
      const C = Arcade.Counting, st = (t, time = '2/4', o) => C.strokes(C.parse(t, time), o);
      const sticks = l => l.map(s => (s.grace ? 'g' : '') + s.hand + (s.accent ? '>' : '') + (s.buzz ? 'z' : '')).join(' ');
      return {para: sticks(st('s>R sL sR sR s>L sR sL sL')), paraBars: sticks(st('s>R sL sR sR | s>L sR sL sL', '2/4')),
        flam: st('[{L}e>R eL eR] [{R}e>L eR eL]'),
        drag: sticks(st('{LL}eR e>L {RR}eL e>R')),
        roll: st('s/R s/L e>R qr'), rollW: st('s/R s/L e>R qr', '2/4', {rolls: 'written'}),
        buzz: sticks(st('ezR ezL ezR ezL')), tie: st('h_R | qR qL').length, slashes2: st('q//R qL').length};
    });
    expect(r.para).toBe('R> L R R L> R L L');
    expect(r.paraBars).toBe(r.para);                                         // bar lines change nothing in the strokes
    expect(r.flam.map(s => [s.n, s.s, s.t, s.hand, s.accent, s.grace])).toEqual([
      [0, -1, 0, 'L', false, true], [0, 0, 0, 'R', true, false], [1, 0, 4, 'L', false, false], [2, 0, 8, 'R', false, false],
      [3, -1, 12, 'R', false, true], [3, 0, 12, 'L', true, false], [4, 0, 16, 'R', false, false], [5, 0, 20, 'L', false, false]]);
    expect(r.drag).toBe('gL gL R L> gR gR L R>');
    expect(r.roll.map(s => [s.n, s.s, s.t, s.hand])).toEqual([[0, 0, 0, 'R'], [0, 1, 1.5, 'R'], [1, 0, 3, 'L'], [1, 1, 4.5, 'L'], [2, 0, 6, 'R']]);
    expect(r.rollW).toEqual(r.roll);
    expect(r.buzz).toBe('Rz Lz Rz Lz');
    expect(r.tie).toBe(2);                                                   // the tied-into quarter is not struck
    expect(r.slashes2).toBe(3);                                              // // = a double, for now
    watch.check();
  });

  for (const rolls of ['slash', 'written']) {
    test(`the staff (${rolls}): one sticking letter under each head, accents above, graces left of their note, nothing past the edge`, async ({page}) => {
      const watch = await open(page);
      const res = await page.evaluate(([EX, rolls]) => {
        const C = Arcade.Counting, RS = Arcade.RhythmStaff, host = document.createElement('div');
        document.body.appendChild(host);
        return EX.flatMap(e => [true, false].map(counting => {
          const p = C.parse(e.text, e.time), E = RS.engrave(p, {sticking: true, counting, rolls, id: 'x'});
          host.innerHTML = E.svg; RS.refine(host);
          const svg = host.querySelector('svg'), box = el => { const b = el.getBBox(); return {x: b.x, y: b.y, width: b.width, height: b.height}; };
          const heads = [...svg.querySelectorAll('g.rn:not(.rest)')].map(g => ({n: +g.dataset.n, s: +(g.dataset.s || 0), b: box(g.querySelector('ellipse')), top: box(g).y}));
          const threes = [...svg.querySelectorAll('text')].filter(t => t.textContent === '3').map(box);
          const hands = [...svg.querySelectorAll('text.rs-hand:not(.grace)')].map(t => ({n: +t.dataset.n, s: +t.dataset.s, text: t.textContent, b: box(t)}));
          const ghands = [...svg.querySelectorAll('text.rs-hand.grace')].map(t => ({n: +t.dataset.n, s: +t.dataset.s, text: t.textContent, b: box(t)}));
          const graces = [...svg.querySelectorAll('g.rs-grace')].map(g => ({n: +g.dataset.n, b: box(g), heads: g.querySelectorAll('ellipse').length,
            slash: g.querySelectorAll('line').length > g.querySelectorAll('ellipse').length, beams: g.querySelectorAll('rect').length}));
          const accs = [...svg.querySelectorAll('path.rs-acc')].map(a => box(a));
          const beams = [...svg.querySelectorAll('rect')].map(r => ({x: +r.getAttribute('x'), y: +r.getAttribute('y'), w: +r.getAttribute('width')}));
          const all = box(svg), vb = svg.viewBox.baseVal;
          const bars = [...svg.querySelectorAll('line.rs-bar')].map(l => +l.getAttribute('x1'));
          const allTexts = [...svg.querySelectorAll('text, ellipse, path, rect, line')].map(el => { const b = el.getBoundingClientRect(), s = svg.getBoundingClientRect(); return {r: b.right - s.left, l: b.left - s.left}; });
          return {name: e.name, counting, notes: p.notes.map(n => ({i: n.i, hand: n.hand, accent: n.accent, graces: n.graces, roll: n.roll, rest: n.rest, buzz: n.buzz})),
            heads, threes, hands, ghands, graces, accs, beams, bars, W: vb.width, H: vb.height, h: E.h, w: E.w, strokes: E.strokes,
            maxR: Math.max(...allTexts.map(t => t.r)), minL: Math.min(...allTexts.map(t => t.l)), slashes: svg.querySelectorAll('path.rs-slash').length,
            buzzes: svg.querySelectorAll('text.rs-buzz').length, svgW: svg.getBoundingClientRect().width, top: all.y, written: rolls === 'written'};
        }));
      }, [EX, rolls]);
      for (const r of res) {
        const where = `${r.name} (${rolls}, counting ${r.counting})`;
        // one main letter per head, in order, under it
        const expectHands = r.written
          ? r.notes.filter(n => !n.rest).flatMap(n => n.roll && !n.buzz ? [n.hand, n.hand] : [n.hand])
          : r.notes.filter(n => !n.rest).map(n => n.hand);
        expect(r.hands.map(h => h.text), where).toEqual(expectHands);
        expect(r.heads.length, where).toBe(r.hands.length);
        r.hands.forEach((h, k) => {
          const hd = r.heads[k], cx = hd.b.x + hd.b.width / 2;
          expect(Math.abs(h.b.x + h.b.width / 2 - cx), `${where}: letter ${k} under its head`).toBeLessThan(4);
          expect(h.b.y, `${where}: letter ${k} below the staff`).toBeGreaterThan(hd.b.y + hd.b.height);
          expect([hd.n, hd.s], where).toEqual([h.n, h.s]);
        });
        // with counting: the sticking row is BELOW the counting, and the staff is taller
        if (r.counting) { expect(r.H, where).toBe(r.h); expect(r.hands.every(h => h.b.y > 136), where).toBe(true); expect(r.h).toBeGreaterThan(144); }
        else expect(r.hands.every(h => h.b.y < 144 && h.b.y > 100), where).toBe(true);
        // the grace letters: small, one per grace, under the grace heads
        const nGr = r.notes.reduce((s, n) => s + n.graces.length, 0);
        expect(r.ghands.length, where).toBe(nGr);
        if (nGr) expect(r.ghands[0].b.height, where).toBeLessThan(r.hands[0].b.height * .8);
        // accents above every accented note (above the beam: every stem reaches the same top)
        const accented = r.notes.filter(n => n.accent).length;
        expect(r.accs.length, where).toBe(accented);
        r.notes.filter(n => n.accent).forEach((n, k) => {
          const hd = r.heads.find(h => h.n === n.i && h.s === 0), a = r.accs[k];
          expect(a.y + a.height, `${where}: accent ${k} above its stem and beam`).toBeLessThan(hd.top - 1);
          r.threes.forEach(t => expect(a.y + a.height < t.y || a.y > t.y + t.height || a.x > t.x + t.width || a.x + a.width < t.x, `${where}: accent ${k} clear of the 3`).toBe(true));
          expect(Math.abs(a.x + a.width / 2 - (hd.b.x + hd.b.width / 2)), `${where}: accent ${k} over its note`).toBeLessThan(6);
        });
        // graces sit left of their note, clear of the previous note and the bar line
        r.graces.forEach(g => {
          const hd = r.heads.find(h => h.n === g.n && h.s === 0), prev = r.heads.filter(h => h.b.x < hd.b.x).pop();
          expect(g.b.x + g.b.width, `${where}: grace of ${g.n} left of its note`).toBeLessThan(hd.b.x + 1);
          if (prev) expect(g.b.x, `${where}: grace of ${g.n} clear of the previous note`).toBeGreaterThan(prev.b.x + prev.b.width + 8);
          r.bars.filter(b => b < hd.b.x).forEach(b => expect(g.b.x, `${where}: clear of the bar line`).toBeGreaterThan(b + 4));
          const want = r.notes[g.n].graces.length;
          expect(g.heads, where).toBe(want);
          expect(g.slash, `${where}: a single grace has its slash`).toBe(want === 1);
          expect(g.beams, where).toBe(want === 1 ? 0 : 2);
        });
        // rolls: slashes in the slash view; in the written view the 32nds get a third beam
        const rolled = r.notes.filter(n => n.roll).length;
        if (!r.written) expect(r.slashes, where).toBe(r.notes.reduce((s, n) => s + n.roll, 0));
        else {
          expect(r.slashes, where).toBe(0);
          if (rolled) expect(r.beams.filter(b => Math.abs(b.y - 40) < .01).length, `${where}: a third beam`).toBeGreaterThan(0);
        }
        expect(r.buzzes, where).toBe(r.notes.filter(n => n.buzz).length);
        // strokes: one per drawn head and grace head, with their x
        expect(r.strokes.length, where).toBe(r.heads.length + nGr);
        // nothing overflows the SVG's width (or its top)
        expect(r.maxR, where).toBeLessThanOrEqual(r.svgW + .5);
        expect(r.minL, where).toBeGreaterThanOrEqual(-.5);
        expect(r.top, where).toBeGreaterThanOrEqual(0);
      }
      watch.check();
    });
  }

  test('rows(): a long rudiment splits into rows by measure, each row with its graces and accents', async ({page}) => {
    const watch = await open(page);
    const r = await page.evaluate(() => {
      const C = Arcade.Counting, RS = Arcade.RhythmStaff, p = C.parse('{L}s>R sR {R}s>L sL {L}s>R sR {R}s>L sL | {L}s>R sR {R}s>L sL {L}s>R sR {R}s>L sL', '2/4');
      return RS.rows(p, 1).map(([from, to]) => { const E = RS.engrave(p, {from, to, sticking: true, counting: false}); return [(E.svg.match(/rs-grace/g) || []).length, (E.svg.match(/rs-acc/g) || []).length]; });
    });
    expect(r).toEqual([[4, 4], [4, 4]]);
    watch.check();
  });

  test('unchanged: the counting, the parsed notes and every staff drawing are exactly as before', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    const OLD = ['i', 't', 'd', 'rest', 'tie', 'dots', 'val', 'trip', 'measure'];
    const now = await page.evaluate(([cases, opts, OLD]) => cases.map(c => {
      const C = Arcade.Counting, RS = Arcade.RhythmStaff, p = C.parse(c.text, c.time);
      return {counting: C.text(C.groups(p)), parse: JSON.stringify(p.notes.map(n => Object.fromEntries(OLD.map(k => [k, n[k]])))),
        svgs: opts.map(o => RS.engrave(p, o).svg), rows: p.measures > 1 ? RS.rows(p, 1).map(([from, to]) => RS.engrave(p, {from, to, id: 'r' + from}).svg) : undefined};
    }), [BEFORE.cases.map(c => ({text: c.text, time: c.time})), BEFORE.opts, OLD]);
    expect(now.length).toBe(BEFORE.cases.length);
    now.forEach((n, k) => {
      const b = BEFORE.cases[k], where = `${b.time} ${b.text}`;
      expect(n.counting, where).toBe(b.counting);
      expect(sha(n.parse), where).toBe(b.parse);
      expect(n.svgs.map(sha), where).toEqual(b.svgs);
      expect((n.rows || []).map(sha), where).toEqual(b.rows || []);
    });
    watch.check();
  });

  test('GALLERY=1: the sheet of every example for Mr. Graham (docs/gallery/rudiment-notation.png)', async ({page}) => {
    test.skip(!process.env.GALLERY, 'only with GALLERY=1');
    await page.setViewportSize({width: 820, height: 1180});                  // iPad portrait
    const watch = await open(page);
    await page.evaluate(EX => {
      const C = Arcade.Counting, RS = Arcade.RhythmStaff, esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const VIEWS = [['Rolls as slashes · sticking', {rolls: 'slash', sticking: true, counting: false}],
        ['Rolls as slashes · counting + sticking', {rolls: 'slash', sticking: true}],
        ['Rolls written out · sticking', {rolls: 'written', sticking: true, counting: false}],
        ['Rolls written out · counting + sticking', {rolls: 'written', sticking: true}]];
      document.body.innerHTML = `<div class="wrap" id="sheet" style="max-width:820px;padding:12px 16px"><h1 class="game-title" style="font-size:28px">Rudiment notation</h1>${EX.map((e, k) =>
        `<section style="background:var(--floor-2);border:2px solid var(--floor-3);border-radius:14px;padding:8px 12px;margin:0 0 12px">
          <h2 style="margin:0;font:700 18px var(--text);color:var(--text-hi)">${esc(e.name)} <code style="font-size:14px;color:var(--text-lo)">${esc(e.time)} · ${esc(e.text)}</code></h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px">${VIEWS.map(([label, o], j) => {
            const E = RS.engrave(C.parse(e.text, e.time), Object.assign({id: 'g' + k + '_' + j}, o));
            return `<figure style="margin:0"><figcaption style="font-size:12px;color:var(--text-lo)">${label}</figcaption><div style="color:var(--text-hi)">${E.svg.replace('<svg ', '<svg style="max-width:100%;height:auto" ')}</div></figure>`;
          }).join('')}</div></section>`).join('')}</div>`;
      RS.refine(document.body);
    }, EX);
    if (process.env.GALLERY) await page.locator('#sheet').screenshot({path: path.join(ROOT, 'docs/gallery/rudiment-notation.png')});
    watch.check();
  });
});
