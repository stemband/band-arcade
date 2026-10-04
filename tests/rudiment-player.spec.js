/* THE RUDIMENT PLAYER (shared/rudiment-player.js): the plan (pure: timing, graces, buzz copies, count-off, click track,
   repeats, the OPEN–CLOSE–OPEN ramp), the live player on an OfflineAudioContext with a test clock (every source starts at
   its stroke's time − 10 ms with the right buffer and gain, stop() fades everything within 30 ms, a hidden tab stops it,
   every file missing = the kit plays the same plan, a listening microphone refuses it), the highlight, the five
   recordings (each decodes and its hit is 10 ms in: .m4a in WebKit, as sounds.spec.js), and the Sound Board's RUDIMENT
   PLAYER section at iPad and Chromebook sizes. */
const {test, expect} = require('@playwright/test');
const {prepare} = require('./helpers');

const EX = {
  para: ['s>R sL sR sR s>L sR sL sL', '2/4'],
  flamAcc: ['[{L}e>R eL eR] [{R}e>L eR eL]', '2/4'],
  flamTap: ['{L}s>R sR {R}s>L sL {L}s>R sR {R}s>L sL', '2/4'],
  drag: ['{LL}eR e>L {RR}eL e>R', '2/4'],
  five: ['s/R s/L e>R qr', '2/4'],
  buzz: ['ezR ezL ezR ezL', '2/4'],
  six8: ['{L}e>R eL eR {R}e>L eR eL', '6/8'],
};

/* a light page with the notation, then the player's scripts */
async function open(page) {
  const watch = await prepare(page);
  await page.goto('rhythm-dojo/counting.html');
  for (const src of ['../music-highway/backing.js', '../shared/calibration.js', '../shared/rudiment-player.js']) await page.addScriptTag({url: new URL(src, page.url()).href});
  await page.waitForFunction(() => window.Arcade && Arcade.RudimentPlayer && Arcade.MHBacking);
  return watch;
}
/** plan(text, time, opts) in the page -> plain entries */
const plan = (page, key, o) => page.evaluate(([[text, time], o]) => {
  const p = Arcade.RudimentPlayer.plan(Arcade.Counting.parse(text, time), o);
  return {ev: p.map(e => Object.assign({}, e)), gridS: p.gridS, endS: p.endS, reps: p.reps, R: Arcade.RudimentPlayer.RULES, G: Arcade.RudimentPlayer.GAIN};
}, [EX[key] || key, o]);
const strokes = ev => ev.filter(e => e.kind !== 'click' && !e.copy);
const mains = ev => strokes(ev).filter(e => e.kind !== 'grace');

test.describe('rudiment player: the plan', () => {
  test('timing: the paradiddle at 60 and 120, 6/8 at dotted quarter 60, a slashed sixteenth', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    const p60 = await plan(page, 'para', {bpm: 60, countOff: false});
    const m = mains(p60.ev);
    expect(m.map(e => e.time)).toEqual([0, .25, .5, .75, 1, 1.25, 1.5, 1.75]);
    expect(m.map(e => e.kind)).toEqual(['accent', 'stroke', 'stroke', 'stroke', 'accent', 'stroke', 'stroke', 'stroke']);
    expect(m.map(e => e.hand).join('')).toBe('RLRRLRLL');
    const p120 = await plan(page, 'para', {bpm: 120, countOff: false});
    mains(p120.ev).forEach((e, i) => expect(e.time).toBeCloseTo(i * .125, 9));
    const p68 = await plan(page, 'six8', {bpm: 60, countOff: false});
    const m68 = mains(p68.ev);
    m68.forEach((e, i) => expect(e.time - m68[0].time).toBeCloseTo(i / 3, 9));
    const five = await plan(page, 'five', {bpm: 60, countOff: false});
    expect(mains(five.ev).slice(0, 2).map(e => [e.hand, e.n, e.s, +e.time.toFixed(9)])).toEqual([['R', 0, 0, 0], ['R', 0, 1, .125]]);
    expect(mains(five.ev).map(e => e.kind)).toEqual(['stroke', 'stroke', 'stroke', 'stroke', 'accent']);
    watch.check();
  });

  test('graces: a flam flamMs before, a drag dragGapMs apart; at 140 they shrink; nothing before 0', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    for (const key of ['flamAcc', 'flamTap', 'six8']) {
      const p = await plan(page, key, {bpm: 80, countOff: false}), ev = strokes(p.ev);
      ev.forEach((e, i) => { if (e.kind === 'grace') { const main = ev[i + 1]; expect([main.n, main.s]).toEqual([e.n, 0]); expect(main.time - e.time).toBeCloseTo(p.R.flamMs / 1000, 9); } });
      expect(Math.min(...p.ev.map(e => e.time))).toBeGreaterThanOrEqual(0);
    }
    const d = await plan(page, 'drag', {bpm: 60, countOff: false}), dv = strokes(d.ev);
    const g = dv.filter(e => e.n === 0 && e.kind === 'grace'), m0 = dv.find(e => e.n === 0 && e.kind !== 'grace');
    expect(g.map(e => e.hand).join('')).toBe('LL');
    expect(g[1].time - g[0].time).toBeCloseTo(p0(d), 9);
    expect(m0.time - g[1].time).toBeCloseTo(p0(d), 9);
    expect(Math.min(...d.ev.map(e => e.time))).toBe(0);                               // the first grace at 0: the pattern shifted
    function p0(x) { return x.R.dragGapMs / 1000; }
    // at 140: every grace stays after the stroke before it (within graceMaxFrac of the gap), the drag's spacing shrinks
    for (const key of ['drag', 'flamTap', 'flamAcc']) {
      const p = await plan(page, key, {bpm: 140, reps: 3, countOff: false}), ev = strokes(p.ev);
      let prev = null;
      ev.forEach(e => {
        if (e.kind === 'grace') { if (prev != null) expect(e.time, `${key}: a grace after the stroke before`).toBeGreaterThan(prev + 1e-6); }
        else prev = e.time;
      });
      expect(Math.min(...p.ev.map(e => e.time))).toBeGreaterThanOrEqual(0);
    }
    const fast = strokes((await plan(page, 'drag', {bpm: 140, countOff: false})).ev);
    const fg = fast.filter(e => e.n === 2 && e.kind === 'grace'), fm = fast.find(e => e.n === 2 && e.kind !== 'grace'), before = fast.find(e => e.n === 1);
    expect(fm.time - fg[0].time).toBeLessThan(2 * d.R.dragGapMs / 1000 - 1e-6);       // shrunk
    expect(fm.time - fg[0].time).toBeCloseTo(d.R.graceMaxFrac * (fm.time - before.time), 9);
    watch.check();
  });

  test('buzz: at 60 an eighth rings with extra copies to its end; at 140 none', async ({page}) => {
    const watch = await open(page);
    const slow = await plan(page, 'buzz', {bpm: 60, countOff: false}), R = slow.R;
    const n0 = slow.ev.filter(e => e.n === 0);
    expect([n0[0].kind, n0[0].time, !!n0[0].copy]).toEqual(['buzz', 0, false]);
    const copies = n0.filter(e => e.copy);
    expect(copies.length).toBeGreaterThan(0);
    copies.forEach((c, i) => { expect(c.time).toBeCloseTo((i + 1) * R.buzzStepMs / 1000, 9); expect(c.time).toBeLessThan(.5); expect(c.gain).toBeCloseTo(slow.G.buzz * R.buzzTailGain, 9); });
    expect(copies[copies.length - 1].time + R.buzzLenS).toBeGreaterThanOrEqual(.5 - R.buzzOverlapMs / 1000);   // rings to the note's end
    const next = slow.ev.find(e => e.n === 1);
    expect(next.time).toBe(.5);                                                          // the next buzz on time
    const fast = await plan(page, 'buzz', {bpm: 140, countOff: false});
    expect(fast.ev.filter(e => e.copy)).toEqual([]);
    watch.check();
  });

  test('count-off, click track and repeats', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    const two = await plan(page, 'para', {bpm: 60});
    const co = two.ev.filter(e => e.countOff);
    expect(co.map(e => [e.time, e.gain])).toEqual([[0, two.G.clickBeat], [1, two.G.click], [2, two.G.click], [3, two.G.click]]);   // 2/4: two measures
    expect(mains(two.ev)[0].time).toBe(4);                                               // one beat after the last click
    const four = await plan(page, ['q q q q', '4/4'], {bpm: 60});
    expect(four.ev.filter(e => e.countOff).length).toBe(4);
    expect(mains(four.ev)[0].time).toBe(4);
    const six = await plan(page, 'six8', {bpm: 60});
    expect(six.ev.filter(e => e.countOff).map(e => e.time)).toEqual([0, 1, 2, 3]);       // 6/8 counted in 2: two measures
    // the click track: every beat, each measure's downbeat accented
    const ck = await plan(page, ['q q q q | q q q q', '4/4'], {bpm: 120, click: true});
    const track = ck.ev.filter(e => e.track);
    expect(track.length).toBe(8);
    expect(track.map(e => e.down)).toEqual([true, false, false, false, true, false, false, false]);
    expect(track.map(e => e.gain)).toEqual(track.map(e => e.down ? ck.G.clickBeat : ck.G.click));
    expect((await plan(page, ['q q q q', '4/4'], {bpm: 120})).ev.filter(e => e.track)).toEqual([]);   // off by default
    // a pattern ending in a rest loops by its full length; rep 2 exactly one pattern later
    const rest = await plan(page, ['q q q qr', '4/4'], {bpm: 60, reps: 3, countOff: false});
    const r = mains(rest.ev);
    expect(r.map(e => [e.rep, e.time])).toEqual([[0, 0], [0, 1], [0, 2], [1, 4], [1, 5], [1, 6], [2, 8], [2, 9], [2, 10]]);
    expect(rest.endS).toBe(12);
    const fl = await plan(page, 'flamTap', {bpm: 97, reps: 2, countOff: false}), f = strokes(fl.ev);
    const rep0 = f.filter(e => e.rep === 0), rep1 = f.filter(e => e.rep === 1), len = 2 * 60 / 97;
    rep1.forEach((e, i) => expect(e.time - rep0[i].time).toBeCloseTo(len, 9));
    watch.check();
  });

  test('the OPEN–CLOSE–OPEN ramp: smooth both ways, bpmAt matches, ends on a whole repetition', async ({page}) => {
    const watch = await open(page);
    const r = await page.evaluate(([text, time]) => {
      const RP = Arcade.RudimentPlayer, ramp = {from: 60, to: 140, upS: 20, holdS: 5, downS: 20};
      const p = RP.plan(Arcade.Counting.parse(text, time), {ramp});
      const s = p.filter(e => e.kind !== 'click');
      return {t: s.map(e => e.time), rep: s.map(e => e.rep), gridS: p.gridS, endS: p.endS, reps: p.reps,
        bpm: s.map(e => p.bpmAt(e.time)), at: [0, 10, 20, 22, 25, 35, 45, 60].map(x => p.bpmAt(p.gridS + x)),
        beats: RP.rampMath(ramp).beatsAt(45)};
    }, EX.para);
    expect(r.at).toEqual([60, 100, 140, 140, 140, 100, 60, 60]);
    const gaps = r.t.slice(1).map((x, i) => x - r.t[i]);
    const upTo = r.t.findIndex(x => x - r.gridS >= 20), downFrom = r.t.findIndex(x => x - r.gridS >= 25);
    for (let i = 1; i < upTo - 1; i++) expect(gaps[i], `getting faster at ${i}`).toBeLessThan(gaps[i - 1]);
    for (let i = downFrom + 1; r.t[i + 1] - r.gridS <= 45; i++) expect(gaps[i], `slowing at ${i}`).toBeGreaterThan(gaps[i - 1]);
    // never a jump: each spacing is a sixteenth at a tempo between the tempos at its two ends
    gaps.forEach((g, i) => {
      const lo = Math.min(r.bpm[i], r.bpm[i + 1]), hi = Math.max(r.bpm[i], r.bpm[i + 1]);
      expect(g).toBeGreaterThanOrEqual(15 / hi - 1e-9); expect(g).toBeLessThanOrEqual(15 / lo + 1e-9);
    });
    // it ends at the end of the first whole repetition after the ramp is done
    expect(r.reps).toBe(Math.ceil(r.beats / 2));
    expect(r.rep[r.rep.length - 1]).toBe(r.reps - 1);
    expect(r.endS - r.gridS).toBeGreaterThanOrEqual(45);
    expect(r.endS - r.gridS - 45).toBeLessThan(2 * 60 / 60 + 1e-9);                     // less than one more pattern at 60
    watch.check();
  });
});

/* the live player on an OfflineAudioContext (it never runs: currentTime stays 0, so nothing is "late") with a test clock
   on performance.now(); every created source records its start and stop */
const LIVE = () => {
  window.__live = function (text, time, o = {}) {
    const ctx = new OfflineAudioContext(1, 48000 * 4, 48000), made = [];
    const orig = ctx.createBufferSource.bind(ctx);
    ctx.createBufferSource = () => { const s = orig(), st = s.start.bind(s), sp = s.stop.bind(s);
      const rec = {starts: [], stops: []}; made.push(rec);
      s.start = (t, ...a) => { rec.starts.push(t); rec.buffer = s.buffer; return st(t, ...a); }; s.stop = t => { rec.stops.push(t); try { sp(t); } catch (e) { /* once */ } }; return s; };
    const buf = id => { const b = ctx.createBuffer(1, 4800, 48000); b.__id = id; return b; };
    const buffers = o.noFiles ? {} : {stroke: buf('stroke'), accent: buf('accent'), grace: buf('grace'), buzz: buf('buzz'), click: buf('click')};
    const p0 = performance.now(), clock = {now: () => (performance.now() - p0) / 1000, audAt: p => (p - p0) / 1000, sample() {}};
    const got = {strokes: [], beats: [], ended: 0};
    const player = Arcade.RudimentPlayer.create(Object.assign({parsed: Arcade.Counting.parse(text, time), bpm: 200, reps: 1,
      audio: {ctx, out: ctx.destination}, buffers, clock,
      onStroke: e => got.strokes.push({n: e.n, s: e.s, kind: e.kind, time: e.time, heard: clock.now()}),
      onBeat: e => got.beats.push(e.time), onEnd: () => { got.ended++; }}, o));
    return {ctx, made, player, got, clock};
  };
};

test.describe('rudiment player: live', () => {
  test('every source starts at its stroke\'s time − 10 ms with the right buffer and gain; onStroke follows the plan', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page);
    await page.evaluate(LIVE);
    const r = await page.evaluate(async ([text, time]) => {
      const L = __live(text, time, {bpm: 200});
      if (!(await L.player.start())) return {refused: true};
      await new Promise(res => { const w = () => (L.got.ended ? res() : setTimeout(w, 30)); w(); });
      const log = L.player.state().log, p = Arcade.RudimentPlayer.plan(Arcade.Counting.parse(text, time), {bpm: 200});
      const t0 = log.find(e => e.kind === 'click').time;                                 // the first count-off click = plan time 0
      return {log, plan: p.map(e => ({time: e.time + t0, kind: e.kind, gain: e.gain, n: e.n, s: e.s, copy: e.copy})),
        vol: Object.fromEntries(Object.entries(Arcade.RudimentPlayer.SOUNDS).map(([k, n]) => [k, Arcade.Sounds && Arcade.Sounds.get(n) ? Arcade.Sounds.get(n).vol : 1])),
        made: L.made.map(m => ({start: m.starts[0], id: m.buffer && m.buffer.__id})), strokes: L.got.strokes, beats: L.got.beats.length, HIT: Arcade.RudimentPlayer.HIT_OFFSET_S};
    }, EX.flamAcc);
    expect(r.refused).toBeUndefined();
    expect(r.log.length).toBe(r.plan.length);
    r.log.forEach((e, i) => {
      const pl = r.plan[i], base = e.kind;
      expect(e.kind).toBe(pl.kind);
      expect(e.time).toBeCloseTo(pl.time, 9);
      expect(e.start).toBeCloseTo(pl.time - r.HIT, 9);                                   // the hit is 10 ms into the file
      expect(e.file).toBe('rudiment-' + base);
      expect(e.gain).toBeCloseTo(pl.gain * (r.vol[base] == null ? 1 : r.vol[base]), 9);
      expect(r.made[i]).toEqual({start: e.start, id: base});
    });
    // onStroke: every stroke, in the plan's order, heard at (or just after) its time
    expect(r.strokes.map(e => [e.n, e.s, e.kind])).toEqual(r.plan.filter(e => e.kind !== 'click' && !e.copy).map(e => [e.n, e.s, e.kind]));
    r.strokes.forEach(e => { expect(e.heard).toBeGreaterThanOrEqual(e.time - 1e-6); expect(e.heard - e.time).toBeLessThan(.25); });
    expect(r.beats).toBe(6);                                                             // onBeat: the 4 count-off clicks + the pattern's 2 beats (silent: the click is off)
    watch.check();
  });

  test('stop() fades everything within 30 ms; a hidden tab stops it; every file missing = the kit plays the same plan; a listening microphone refuses', async ({page}) => {
    const watch = await open(page);
    await page.evaluate(LIVE);
    const r = await page.evaluate(async ([para, buzz]) => {
      const out = {};
      // stop(): every source made so far gets stopped by now + 30 ms, onEnd fires once
      let L = __live(para[0], para[1], {bpm: 60, reps: Infinity});
      await L.player.start(); await new Promise(res => setTimeout(res, 120));
      L.player.stop();
      out.stop = {made: L.made.length, stops: L.made.map(m => Math.max(...m.stops)), now: L.ctx.currentTime, playing: L.player.playing(), ended: L.got.ended, sources: L.player.state().sources};
      // a hidden tab
      L = __live(para[0], para[1], {bpm: 60, reps: Infinity});
      await L.player.start();
      Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
      document.dispatchEvent(new Event('visibilitychange'));
      out.hidden = {playing: L.player.playing(), ended: L.got.ended};
      delete document.hidden;
      // every file missing: the kit, at the stroke times (no 10 ms offset: the kit's sounds start at once)
      L = __live(buzz[0], buzz[1], {bpm: 200, noFiles: true});
      await L.player.start();
      await new Promise(res => { const w = () => (L.got.ended ? res() : setTimeout(w, 30)); w(); });
      const log = L.player.state().log, p = Arcade.RudimentPlayer.plan(Arcade.Counting.parse(buzz[0], buzz[1]), {bpm: 200});
      const t0 = log[0].time;
      out.kit = {files: [...new Set(log.map(e => e.file))], same: log.length === p.length && log.every((e, i) => Math.abs(e.time - (p[i].time + t0)) < 1e-9 && e.start === e.time && e.kind === p[i].kind)};
      // a listening microphone: refused
      const had = Arcade.Pitch; Arcade.Pitch = Object.assign({}, had || {}, {listening: () => true});
      L = __live(para[0], para[1]);
      out.refused = await L.player.start();
      out.refusedPlaying = L.player.playing();
      Arcade.Pitch = had;
      return out;
    }, [EX.para, EX.buzz]);
    expect(r.stop.made).toBeGreaterThan(0);
    r.stop.stops.forEach(s => expect(s).toBeLessThanOrEqual(r.stop.now + .03 + 1e-9));
    expect([r.stop.playing, r.stop.ended, r.stop.sources]).toEqual([false, 1, 0]);
    expect(r.hidden).toEqual({playing: false, ended: 1});
    expect(r.kit).toEqual({files: ['kit'], same: true});
    expect([r.refused, r.refusedPlaying]).toEqual([false, false]);
    watch.check();
  });

  test('setBpm and setClick land on the next repetition, never mid-pattern', async ({page}) => {
    const watch = await open(page);
    await page.evaluate(LIVE);
    const r = await page.evaluate(async ([text, time]) => {
      const L = __live(text, time, {bpm: 240, reps: 3, countOff: false});
      await L.player.start();
      L.player.setBpm(120); L.player.setClick(true);
      await new Promise(res => { const w = () => (L.got.ended ? res() : setTimeout(w, 30)); w(); });
      const log = L.player.state().log.filter(e => e.kind !== 'click');
      const byRep = k => log.filter(e => e.rep === k).map(e => e.time);
      const gap = a => a.slice(1).map((x, i) => +(x - a[i]).toFixed(6));
      return {g0: gap(byRep(0)), g1: gap(byRep(1)), g2: gap(byRep(2)), clicks: [0, 1, 2].map(k => L.player.state().log.filter(e => e.kind === 'click' && e.rep === k).length)};
    }, ['q q', '2/4']);
    // rep 0 was already planned at 240 when the change came; the change lands at a repetition's start
    expect(r.g0).toEqual([.25]);
    expect(r.g2).toEqual([.5]);
    expect([[.25], [.5]]).toContainEqual(r.g1);
    expect(r.clicks[2]).toBe(2);
    watch.check();
  });
});

test.describe('rudiment player: the highlight', () => {
  for (const rolls of ['slash', 'written']) {
    test(`light() (${rolls}): each stroke lights its head and letter; a roll's note ${rolls === 'slash' ? 'stays lit for both strokes' : 'lights each stroke\'s own head'}`, async ({page}) => {
      const watch = await open(page);
      const r = await page.evaluate(([[text, time], rolls]) => {
        const C = Arcade.Counting, RS = Arcade.RhythmStaff, RP = Arcade.RudimentPlayer, p = C.parse(text, time);
        const host = document.createElement('div'); document.body.appendChild(host);
        const E = RS.engrave(p, {sticking: true, rolls}); host.innerHTML = E.svg;
        const h = RP.light(host, E), seen = [];
        RP.plan(p, {bpm: 60, countOff: false}).filter(e => e.kind !== 'click' && !e.copy).forEach(e => {
          h(e);
          const lit = [...host.querySelectorAll('.rp-now')];
          seen.push({n: e.n, s: e.s, heads: lit.filter(x => x.matches('g.rn, g.rs-grace')).map(x => x.id || ('grace' + x.dataset.n)), letters: lit.filter(x => x.matches('text.rs-hand')).map(x => x.textContent + x.dataset.s)});
        });
        h.clear();
        return {seen, left: host.querySelectorAll('.rp-now').length, color: (() => { h({n: 2, s: 0}); const el = host.querySelector('.rp-now'); return getComputedStyle(el).color; })(),
          token: getComputedStyle(document.documentElement).getPropertyValue('--rp-now').trim()};
      }, [EX.five, rolls]);
      const [a, b] = r.seen;                                                            // s/R: R then R
      expect([a.n, a.s, b.n, b.s]).toEqual([0, 0, 0, 1]);
      expect(a.heads.length).toBe(1); expect(b.heads.length).toBe(1);
      if (rolls === 'slash') { expect(b.heads).toEqual(a.heads); expect(b.letters).toEqual(a.letters); }
      else { expect(b.heads).not.toEqual(a.heads); expect(a.letters).toEqual(['R0']); expect(b.letters).toEqual(['R1']); }
      r.seen.forEach(x => expect(x.letters.length, `stroke ${x.n}/${x.s} has its letter`).toBe(1));
      expect(r.left).toBe(0);
      expect(r.token).not.toBe('');
      watch.check();
    });
  }
  test('light(): a flam\'s grace lights its grace group and its small letter, then its note', async ({page}) => {
    const watch = await open(page);
    const r = await page.evaluate(([text, time]) => {
      const C = Arcade.Counting, RS = Arcade.RhythmStaff, RP = Arcade.RudimentPlayer, p = C.parse(text, time);
      const host = document.createElement('div'); document.body.appendChild(host);
      const E = RS.engrave(p, {sticking: true}); host.innerHTML = E.svg;
      const h = RP.light(host, E), ev = RP.plan(p, {bpm: 60, countOff: false}).filter(e => e.kind !== 'click');
      h(ev[0]); const g = [...host.querySelectorAll('.rp-now')].map(x => x.getAttribute('class'));
      h(ev[1]); const m = [...host.querySelectorAll('.rp-now')].map(x => x.getAttribute('class'));
      return {g, m, kinds: [ev[0].kind, ev[1].kind]};
    }, EX.flamAcc);
    expect(r.kinds).toEqual(['grace', 'accent']);
    expect(r.g).toEqual(['rs-grace rp-now', 'rs-hand grace rp-now']);
    expect(r.m).toEqual(['rn rp-now', 'rs-hand rp-now']);
    watch.check();
  });
});

test('the five recordings decode and each hit is 10 ms in (± 3 ms)', async ({page}) => {
  const watch = await prepare(page);
  await page.goto('offline.html');
  const r = await page.evaluate(async () => {
    const ctx = new OfflineAudioContext(1, 1, 48000), out = {};
    for (const n of ['stroke', 'accent', 'grace', 'buzz', 'click']) {
      try {
        const buf = await ctx.decodeAudioData(await (await fetch(`shared/sounds/rudiment-${n}.m4a`)).arrayBuffer());
        const d = buf.getChannelData(0); let pk = 0; for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
        let i = 0; while (i < d.length && Math.abs(d[i]) < pk * .1) i++;
        out[n] = {hitMs: i / buf.sampleRate * 1000, len: buf.duration, peak: pk};
      } catch (e) { out[n] = {error: String(e && e.message || e)}; }
    }
    return out;
  });
  // the open-source Chromium the tests use has no AAC decoder: the .m4a files are checked in WebKit (as sounds.spec.js)
  test.skip(Object.values(r).every(x => x.error), 'this browser has no AAC decoder: checked in WebKit');
  for (const [n, x] of Object.entries(r)) {
    expect(x.error, n).toBeUndefined();
    expect(Math.abs(x.hitMs - 10), `${n}: its hit at ${x.hitMs.toFixed(1)} ms`).toBeLessThanOrEqual(3);
  }
  watch.check();
});

for (const [name, vp] of [['iPad', {width: 820, height: 1180}], ['Chromebook', {width: 1366, height: 768}]]) {
  test(`the Sound Board's RUDIMENT PLAYER opens, plays and stops with no errors (${name})`, async ({page}) => {
    await page.setViewportSize(vp);
    const watch = await prepare(page);
    await page.goto('sound-board/index.html');
    await page.waitForFunction(() => window.Arcade && Arcade.SoundBoard && Arcade.SoundBoard.rudiments);
    const sec = page.locator('.sb-sec[data-sec="rudiment-player"]');
    await sec.locator('> summary').click();
    await expect(sec.locator('.rp-card')).toHaveCount(8);
    await expect(sec.locator('.sb-count')).toHaveText('· 8 examples');
    const card = sec.locator('[data-rp="paradiddle"]');
    await expect(card.locator('svg.rs text.rs-hand')).toHaveCount(8);
    // nothing past the page's right edge
    const over = await page.evaluate(() => [...document.querySelectorAll('.rp-card')].filter(c => c.getBoundingClientRect().right > innerWidth + 1).length);
    expect(over).toBe(0);
    await card.locator('[data-bpm="140"]').click();
    await card.locator('.rp-click').click();
    await card.locator('.rp-play').click();
    await expect(card.locator('.rp-play')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForFunction(() => { const s = Arcade.SoundBoard.rudiments.state(); return s.playing === 'paradiddle' && s.player && s.player.playing; }, null, {polling: 100});
    // the strokes light as they sound (a test machine whose audio clock doesn't keep time, WebKit on CI, lights nothing)
    const moves = await page.evaluate(async () => { const c = new AudioContext(); const a = c.currentTime; await new Promise(r => setTimeout(r, 300)); const b = c.currentTime; c.close(); return b > a; });
    if (moves) {
      await page.waitForFunction(() => Arcade.SoundBoard.rudiments.state().cards.paradiddle.strokes.length >= 4, null, {polling: 100, timeout: 15000});
      await expect(card.locator('.rp-now').first()).toBeAttached();
      const s = (await page.evaluate(() => Arcade.SoundBoard.rudiments.state())).cards.paradiddle.strokes;
      expect(s.slice(0, 4).map(e => e.kind)).toEqual(['accent', 'stroke', 'stroke', 'stroke']);
    }
    // the view switch redraws written-out (the player keeps going); stop
    await card.locator('.rp-view').click();
    await expect(card.locator('.rp-view')).toHaveText('Rolls: written out');
    await card.locator('.rp-play').click();
    await expect(card.locator('.rp-play')).toHaveAttribute('aria-pressed', 'false');
    expect((await page.evaluate(() => Arcade.SoundBoard.rudiments.state())).playing).toBeNull();
    // the ramp card plays too, with its readout; another card's PLAY stops it
    const ramp = sec.locator('[data-rp="ramp"]');
    await ramp.locator('.rp-play').click();
    await page.waitForFunction(() => Arcade.SoundBoard.rudiments.state().playing === 'ramp', null, {polling: 100});
    await expect(ramp.locator('.rp-bpm')).toHaveText(/^\d+ BPM$/);
    await sec.locator('[data-rp="buzz"] .rp-play').click();
    await page.waitForFunction(() => Arcade.SoundBoard.rudiments.state().playing === 'buzz', null, {polling: 100});
    await expect(ramp.locator('.rp-play')).toHaveAttribute('aria-pressed', 'false');
    await sec.locator('[data-rp="buzz"] .rp-play').click();
    // search finds the section
    await page.locator('#search').fill('paradiddle');
    await expect(sec).toBeVisible();
    await expect(sec.locator('.rp-card:visible')).toHaveCount(2);
    watch.check();
  });
}
