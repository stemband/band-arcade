/* FIRST SIGHT (first-sight/, docs/games/first-sight.md): sight-reading practice with NO MICROPHONE and no stars.
   THE GENERATOR (first-sight/etudes.js) over many codes: every bar adds up (shared/counting.js reads the whole etude),
   the counting lines up with the notes, each level uses only its own rhythms and meters, the period form (the second
   phrase starts with bar 1's rhythm, the half cadence, the tonic at the end), chromatic notes only as raised whole-step
   degrees (never a double sharp or flat in any instrument's written key), every note inside every member's GMEA range,
   THE SAME MUSIC for every instrument (the same concert pitch classes), the same code = the same etude.
   THE ENGRAVING (shared/notation.js's First Sight extras): triplets with their 3, articulations, dynamics, hairpins,
   ties across a row break, rest counting. THE PAGE: ?code= opens an etude, the study countdown and I'M READY, ▶ PLAY IT
   (the count-in and the click on the audio clock), ▶ HEAR IT locked until a play-through, then the student's own voice
   (shared/winds.js) or the snare kit, COUNTING, TEMPO per level, NEW ETUDE, the code form, START's line, print. */
const {test, expect} = require('@playwright/test');
const {prepare, device, tooWide} = require('./helpers');

const URL = 'first-sight/index.html?demo&nostart';
const st = page => page.evaluate(() => Arcade.FirstSight.state());
const fsDevice = (member = 'trumpet', gd = {}) => device(member, {gameData: {'first-sight': gd}});
async function open(page, store = fsDevice(), url = URL) {
  const watch = await prepare(page, {store});
  await page.goto(url);
  await page.locator('h1.game-title:visible, #kick:visible').first().click();   // a first tap: the arcade's audio unlocks
  return watch;
}

/* ================= THE GENERATOR ================= */
test('THE GENERATOR: every level, key and length over many codes: bars add up, the counting lines up, the level\'s own rhythms and meters, the form', async ({page}) => {
  const watch = await open(page);
  const bad = await page.evaluate(() => {
    const E = Arcade.FSEtudes, C = Arcade.Counting, out = [];
    const allowed = L => new Set([].concat(...Object.keys(L.cells).map(c => E.cellNotes(c).map(n => n.tok + (n.trip ? 't' : '')))));
    for (const L of E.LEVELS) for (const key of E.KEYS) for (const bars of [6, 8]) for (let k = 0; k < 40; k++) {
      const seed = E.newSeed(E.rng(`${L.n}${key}${bars}${k}`)), et = E.make({level: L.n, key, bars, seed});
      const tag = et.code;
      if (E.parseCode(et.code).seed !== seed || E.parseCode(et.code).level !== L.n) out.push(tag + ': code round trip');
      if (!(et.meter in L.meters)) out.push(tag + ': meter ' + et.meter);
      const P = C.parse(et.text, et.meter);
      if (P.errors && P.errors.length) out.push(tag + ': ' + P.errors.join(', '));
      if (P.measures !== bars) out.push(tag + ': measures ' + P.measures);
      if (!et.labels) out.push(tag + ': no counting');
      // every rhythm from this level's cells (or a cadence)
      const ok = allowed(L), cad = new Set(['w', 'h', 'q', 'e', 'q.', 'e.', 's', 'h.']);
      et.events.forEach(e => { const t = e.tok + (e.trip ? 't' : ''); if (!ok.has(t) && !(e.bar === bars - 1 || e.bar === bars / 2 - 1) && !(e.rest && ok.has(e.tok))) out.push(`${tag}: ${t} in bar ${e.bar + 1}`); if (e.trip && L.n !== 5) out.push(tag + ': triplet'); if (!cad.has(e.tok.replace('r', '')) && e.tok !== 'q.r') out.push(tag + ': token ' + e.tok); });
      // the form: the second phrase opens with bar 1's rhythm (level 2 up); the last note is the tonic, long
      const rhythm = b => et.events.filter(e => e.bar === b).map(e => e.tok).join(' ');
      if (L.n >= 2 && rhythm(bars / 2) !== rhythm(0)) out.push(tag + ': no answer');
      const notes = et.events.filter(e => !e.rest), last = notes[notes.length - 1];
      if (((last.deg % 7) + 7) % 7 !== 0 || last.alt) out.push(tag + ': last note ' + last.deg);
      if (last.d < 12 && !(et.meter === '6/8' && last.d >= 18)) out.push(tag + ': short last note');
      const half = notes.filter(n => n.bar === bars / 2 - 1).pop();
      if (![4, 1, -3, 8, -6].includes(half.deg) || half.alt) out.push(tag + ': half cadence on ' + half.deg);
      if (et.events.some(e => e.tiedFrom && (e.bar === bars - 1 || e.bar === bars / 2 - 1 || e.bar === bars / 2))) out.push(tag + ': tie into a cadence');
      // the span; chromatic notes: a raised degree, a whole step below the next scale note, only from level 4
      notes.forEach(n => {
        if (n.deg < L.span[0] - 1 || n.deg > L.span[1]) out.push(`${tag}: degree ${n.deg}`);
        if (n.alt && (L.n < 4 || n.alt !== 1 || ![0, 1, 3, 4, 5].includes(((n.deg % 7) + 7) % 7))) out.push(`${tag}: chromatic ${n.deg}+${n.alt}`);
      });
      if (notes.filter(n => n.alt).length > L.chrom) out.push(tag + ': too many chromatic notes');
      // the same code, the same etude
      if (JSON.stringify(E.make(E.parseCode(et.code)).events) !== JSON.stringify(et.events)) out.push(tag + ': not repeatable');
    }
    return out;
  });
  expect(bad.slice(0, 20)).toEqual([]);
  watch.check();
});

test('FOR EVERY INSTRUMENT: notes inside the GMEA range, spelled in the written key (no double sharps or flats), and the same concert music for everyone', async ({page}) => {
  const watch = await open(page);
  const bad = await page.evaluate(() => {
    const E = Arcade.FSEtudes, out = [];
    const members = Arcade.PLAYERS.map(id => Arcade.memberById(id));
    for (const L of E.LEVELS) for (const key of E.KEYS) for (let k = 0; k < 12; k++) {
      const et = E.make({level: L.n, key, bars: 8, seed: E.newSeed(E.rng(`m${L.n}${key}${k}`))});
      let pcs = null;
      members.forEach(m => {
        const r = E.realize(et, m);
        if (m.pitched === false) { if (!r.unpitched || r.clef !== null) out.push(et.code + ': snare'); return; }
        if (r.clef !== m.clef) out.push(`${et.code} ${m.id}: clef`);
        const mine = [];
        r.notes.forEach((n, i) => {
          if (!n) return;
          if (n.midi < m.lowMidi || n.midi > m.highMidi) out.push(`${et.code} ${m.id}: ${n.midi} out of range`);
          if (Math.abs(n.n.acc) > 1) out.push(`${et.code} ${m.id}: double accidental`);
          const L2 = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11}[n.n.letter];
          if ((n.n.oct + 1) * 12 + L2 + n.n.acc !== n.midi) out.push(`${et.code} ${m.id}: spelling`);
          if (et.events[i].tiedFrom && r.notes[i - 1].midi !== n.midi) out.push(`${et.code} ${m.id}: a tie changes pitch`);
          mine.push(((n.sounding % 12) + 12) % 12);
        });
        const s = mine.join(',');
        if (pcs == null) pcs = s; else if (pcs !== s) out.push(`${et.code} ${m.id}: different music`);
      });
    }
    return out;
  });
  expect(bad.slice(0, 20)).toEqual([]);
  watch.check();
});

/* ================= THE ENGRAVING ================= */
test('THE ENGRAVING: triplets with a 3, articulations, dynamics and hairpins, a tie across a row break, rest counting', async ({page}) => {
  const watch = await open(page);
  const r = await page.evaluate(() => {
    const N = Arcade.Notation, n = (letter, oct) => ({letter, acc: 0, oct});
    const E = N.engrave({clef: 'treble', sig: null, per: 4, timeSig: [4, 4], measures: 1, header: 'full', captions: true, groupBeats: 1,
      events: [
        {t: 0, beats: 1 / 3, n: n('C', 5), trip: 'a', label: '1', dyn: 'p', hair: 'cresc'},
        {t: 1 / 3, beats: 1 / 3, n: n('D', 5), trip: 'a', label: 'la'},
        {t: 2 / 3, beats: 1 / 3, n: n('E', 5), trip: 'a', label: 'le'},
        {t: 1, beats: .5, n: n('F', 4), art: ['stac'], label: '2'}, {t: 1.5, beats: .5, n: n('G', 4), art: ['acc', 'ten'], label: '&'},
        {t: 2, beats: 1, rest: true, label: '(3)'},
        {t: 3, beats: 1, n: n('A', 4), dyn: 'f', hairEnd: true, tieOut: true, label: '4'}]});
    const d = document.createElement('div'); d.innerHTML = E.svg; document.body.appendChild(d);
    const out = {tuplets: d.querySelectorAll('text.tuplet').length, stac: d.querySelectorAll('.art-stac').length, acc: d.querySelectorAll('.art-acc').length,
      ten: d.querySelectorAll('.art-ten').length, dyns: [...d.querySelectorAll('text.dyn')].map(t => t.textContent), cresc: d.querySelectorAll('.hairpin.cresc').length,
      caps: [...d.querySelectorAll('.ncap')].map(t => t.textContent), ties: d.querySelectorAll('.tie').length,
      // the triplet is beamed alone (not with the next beat's eighths), the eighths together
      beams: E.layout().beams};
    d.remove();
    return out;
  });
  expect(r.tuplets).toBe(1);
  expect([r.stac, r.acc, r.ten]).toEqual([1, 1, 1]);
  expect(r.dyns).toEqual(['p', 'f']);
  expect(r.cresc).toBe(1);
  expect(r.caps).toEqual(expect.arrayContaining(['1', 'la', 'le', '2', '&', '4', '(3)']));
  expect(r.ties).toBe(1);
  expect(r.beams.length).toBe(2);
  expect(r.beams[0].length).toBe(3);
  watch.check();
});

/* ================= THE PAGE ================= */
test('THE PAGE: ?code= opens that etude; study, then ▶ PLAY IT counts in and clicks on the audio clock; ▶ HEAR IT unlocks after it and plays the student\'s voice', async ({page}) => {
  const watch = await open(page, fsDevice('trumpet', {studyS: 30, tempo: {1: 88}}), URL + '&code=1F6-ABCD');
  let s = await st(page);
  expect(s).toMatchObject({screen: 'play', code: '1F6-ABCD', level: 1, studyOn: true, played: false});
  await expect(page.locator('#study')).toBeVisible();
  await expect(page.locator('#keyLine')).toHaveText('Concert F · your G Major');
  // ▶ HEAR IT is locked until the student has played it
  await page.locator('#hearBtn').click();
  expect((await st(page)).run).toBe(null);
  await page.locator('#readyBtn').click();
  expect((await st(page)).studyOn).toBe(false);
  // ▶ PLAY IT: 1 bar of count-in + every beat (click on)
  await page.locator('#playBtn').click();
  s = await st(page);
  expect(s.run).toMatchObject({kind: 'play', clicks: 4 + 6 * 4, notes: 0});
  expect(s.bpm).toBe(88);
  await page.waitForFunction(() => !Arcade.FirstSight.state().run, null, {timeout: 30_000});
  s = await st(page);
  expect(s).toMatchObject({played: true, read: 1, byLevel: {1: 1}});
  // ▶ HEAR IT: the trumpet's voice, every note
  await page.locator('#hearBtn').click();
  s = await st(page);
  const notes = await page.evaluate(() => Arcade.FirstSight.etude().events.filter(e => !e.rest && !e.tiedFrom).length);
  expect(s.run).toMatchObject({kind: 'hear', notes, voice: true});
  const h = await page.evaluate(() => Arcade.Winds.test.history.filter(x => x.kind === 'phrase').pop());
  expect(h).toMatchObject({voice: 'brass', notes, played: true});
  await page.locator('#hearBtn').click();                  // ■ Stop
  expect((await st(page)).run).toBe(null);
  watch.check();
});

test('THE PAGE: the level select (key, length, START\'s line), NEW ETUDE, the code form, COUNTING and TEMPO per level', async ({page}) => {
  const watch = await open(page, fsDevice('altosax'));
  await page.locator('#keySeg [data-key="Eb"]').click();
  await page.locator('#barsSeg [data-bars="6"]').click();
  await page.locator('.fs-card[data-l="3"]').click();
  await expect(page.locator('.ls-start')).toContainText('Concert E♭ · 6 bars');
  await page.locator('.ls-start').click();
  let s = await st(page);
  expect(s).toMatchObject({screen: 'play', level: 3, key: 'Eb', bars: 6});
  expect(s.code).toMatch(/^3E6-[A-Z2-9]{4}$/);
  expect(s.rows.length).toBe(2);                            // 6 bars: 3 a row on an iPad
  // counting on: the syllables under the notes
  await page.locator('#countSeg [data-count="on"]').click();
  expect(await page.locator('#rows .ncap').count()).toBeGreaterThan(6);
  // tempo: remembered for this level
  await page.locator('#slowerBtn').click();
  expect((await st(page)).bpm).toBe(76);
  expect(await page.evaluate(() => Arcade.store.gameData('first-sight').tempo)).toEqual({3: 76});
  // NEW ETUDE: a new code, same level, key and length
  const was = s.code;
  await page.locator('#newBtn').click();
  s = await st(page);
  expect(s.code).not.toBe(was);
  expect(s.code.slice(0, 3)).toBe('3E6');
  // the code form
  await page.evaluate(() => Arcade.FirstSight.hub());
  await page.locator('#codeIn').fill('nope');
  await page.locator('#codeForm button').click();
  await expect(page.locator('#codeMsg')).toContainText('doesn’t look right');
  await page.locator('#codeIn').fill('5a8 k7qx');
  await page.locator('#codeForm button').click();
  expect(await st(page)).toMatchObject({screen: 'play', code: '5A8-K7QX', level: 5});
  watch.check();
});

test('THE SNARE: no key row, the rhythm on a one-line staff (accents only), ▶ HEAR IT on the drum kit; every bell is a mallet', async ({page}) => {
  const watch = await open(page, fsDevice('snare', {studyS: 0}), URL + '&code=5B8-ZZ23');
  const s = await st(page);
  expect(s.screen).toBe('play');
  expect(await page.locator('#rows .art-stac, #rows .art-ten, #rows .slur').count()).toBe(0);
  expect(await page.locator('#rows svg').first().evaluate(svg => svg.querySelectorAll('line').length)).toBeGreaterThan(0);
  await expect(page.locator('#keyLine')).toContainText('Snare drum');
  await page.evaluate(() => Arcade.FirstSight.hub());
  await expect(page.locator('#keyRow')).toBeHidden();
  expect(await page.evaluate(() => Arcade.Winds.voiceFor('bells'))).toBe('mallet');
  watch.check();
});

test('PRINT IT prints only the music; the etude page fits a phone', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  const watch = await open(page, fsDevice('clarinet', {studyS: 0}), URL + '&code=6A8-QWER');
  expect((await st(page)).rows.length).toBe(4);              // 2 bars a row on a phone
  expect(await tooWide(page)).toEqual([]);
  await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
  await page.locator('#printBtn').click();
  expect(await page.evaluate(() => window.__printed)).toBe(1);
  await page.emulateMedia({media: 'print'});
  await expect(page.locator('#playBtn')).toBeHidden();
  await expect(page.locator('#printHead')).toBeVisible();
  watch.check();
});

test('THE STUDY COUNTDOWN keeps counting after the pause menu\'s BACK TO LEVELS (it once froze for good)', async ({page}) => {
  const watch = await open(page, fsDevice('trumpet', {studyS: 30}), URL + '&code=1F8-ABCD');
  const left = () => page.evaluate(() => Arcade.FirstSight.state().studyLeft);
  const a = await left();
  await page.waitForTimeout(1300);
  expect(await left()).toBeLessThan(a - .8);
  // pause, then BACK TO LEVELS
  await page.locator('.ui-pause-btn').click();
  const p0 = await left();
  await page.waitForTimeout(700);
  expect(await left()).toBe(p0);                            // paused: it holds
  await page.locator('.ui-menu [data-act="levels"]').click();
  await expect(page.locator('#hub')).toBeVisible();
  // a new etude: its countdown runs
  await page.locator('.fs-card[data-l="2"]').click();
  await page.locator('.ls-start').click();
  expect((await st(page)).studyOn).toBe(true);
  const b = await left();
  await page.waitForTimeout(1300);
  expect(await left()).toBeLessThan(b - .8);
  await expect(page.locator('#studyLeft')).not.toHaveText('30');
  watch.check();
});
