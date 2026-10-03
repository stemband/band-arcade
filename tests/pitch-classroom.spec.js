/* CLASSROOM MODE + THE ROOM CHECK (shared/pitch.js ROOM, shared/onsets.js, shared/room-check.js; docs/engine/pitch.md).
   THE CROWD TEST (Chromium only, like pitch.spec.js): tests/crowd.js builds a band room (this student at level L,
   5–10 other students at 0.25–0.4 L together, a little noise) and runs it through the detector's own frame loop on a
   fake clock (Pitch._feed: the analysis, the hold, the room floor; Pitch._envFeed: attacks; Onsets.analyse: the snare).
   With Classroom mode ON the crowd alone never counts, this student's notes do; with it OFF the crowd DOES make
   false notes (the test bites). The rest (Auto, the teacher setting, suppression, the room check, the offer, Settings)
   runs in both browsers. Each crowd row is printed (`npx playwright test pitch-classroom --project=chromium`): the PR's table. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');
const {crowdSim, snareSim} = require('./crowd');

const MEMBERS = ['flute', 'clarinet', 'altosax', 'trumpet', 'horn', 'trombone', 'tuba', 'bells'];

async function open(page, member, url = 'note-checker/index.html?demo&nostart') {
  const watch = await prepare(page, {store: device(member)});
  await page.goto(url);
  await page.evaluate(src => { window.crowdSim = eval('(' + src[0] + ')'); window.snareSim = eval('(' + src[1] + ')'); }, [crowdSim.toString(), snareSim.toString()]);
  return watch;
}
/* the crowd test's counts: notes held while the target wasn't playing that note = false; target notes never held = missed */
function score(r) {
  const during = h => r.target.find(n => h.t >= n.from && h.t <= n.to + 0.15);
  return {
    falseNotes: r.held.filter(h => { const n = during(h); return !n || n.pc !== h.pc; }).length,
    missed: r.target.filter(n => !r.held.some(h => h.t >= n.from && h.t <= n.to + 0.15 && h.pc === n.pc)).length,
    notes: r.target.length,
  };
}

test.describe('Classroom mode: the crowd test', () => {
  test.skip(({browserName}) => browserName !== 'chromium', 'the synthetic-audio tests run in Chromium only');

  for (const member of MEMBERS) {
    test(`${member}: the crowd never counts in Classroom mode, the student's notes do`, async ({page}) => {
      const watch = await open(page, member);
      const run = o => page.evaluate(o => crowdSim(o), Object.assign({member, crowd: 0.4, check: true}, o));
      const alone = {targetNotes: 0, start: 0, seconds: 30, seed: 11};
      const onAlone = await run(Object.assign({classroom: 'on'}, alone));
      const offAlone = await run(Object.assign({classroom: 'off'}, alone));
      const target = {targetNotes: 10, start: 3, noteS: 1, gapS: 0.5, seconds: 20, seed: 101};
      const on = score(await run(Object.assign({classroom: 'on'}, target)));
      const off = score(await run(Object.assign({classroom: 'off'}, target)));
      console.log(`CROWD ${member.padEnd(9)} crowd alone 30 s: OFF ${offAlone.held.length} false notes, ON ${onAlone.held.length} · ` +
        `with the student: OFF ${off.falseNotes} false / ${off.missed} missed of ${off.notes}, ON ${on.falseNotes} false / ${on.missed} missed of ${on.notes}`);
      expect(onAlone.held, 'Classroom mode ON: no crowd note ever counts (30 s of crowd alone)').toEqual([]);
      // the test bites: with Classroom mode OFF the same crowd makes false notes (bells listen above the crowd's range)
      if (member !== 'bells') expect(offAlone.held.length, 'Classroom mode OFF: the crowd makes false notes').toBeGreaterThan(0);
      expect(on.missed, 'Classroom mode ON: the student\'s held notes count').toBeLessThanOrEqual(2);
      watch.check();
    });

    test(`${member}: the crowd's attacks never count as tongued notes in Classroom mode`, async ({page}) => {
      const watch = await open(page, member);
      const run = o => page.evaluate(o => crowdSim(o), Object.assign({member, crowd: 0.4, check: true, attacks: true, crowdShort: true}, o));
      const alone = {targetNotes: 0, start: 0, seconds: 30, seed: 17};
      const onAlone = await run(Object.assign({classroom: 'on'}, alone));
      const offAlone = await run(Object.assign({classroom: 'off'}, alone));
      const r = await run({classroom: 'on', targetNotes: 30, start: 4, noteS: 0.25, gapS: 0.08, seconds: 16, seed: 23});
      const got = r.target.filter(n => r.attacks.some(a => a.t >= n.from - 0.01 && a.t <= n.from + 0.08)).length;
      console.log(`ATTACKS ${member.padEnd(9)} crowd alone 30 s: OFF ${offAlone.attacks.length}, ON ${onAlone.attacks.length} · the student's tongued notes ON ${got}/${r.target.length}`);
      expect(onAlone.attacks, 'Classroom mode ON: no crowd attack counts').toEqual([]);
      expect(offAlone.attacks.length, 'Classroom mode OFF: the crowd\'s attacks count (the test bites)').toBeGreaterThan(0);
      expect(got, 'Classroom mode ON: the student\'s tongued notes count').toBeGreaterThanOrEqual(member === 'bells' ? 18 : 22);
      watch.check();
    });
  }

  test('the snare: other drums never count as hits in Classroom mode (Onsets), this student\'s do', async ({page}) => {
    const watch = await open(page, 'snare', 'rhythm-dojo/index.html?demo');
    const run = o => page.evaluate(o => snareSim(o), Object.assign({crowd: 0.4, check: true}, o));
    const onAlone = await run({classroom: 'on', targetHits: 0, start: 0, seconds: 30, seed: 51});
    const offAlone = await run({classroom: 'off', targetHits: 0, start: 0, seconds: 30, seed: 51});
    const r = await run({classroom: 'on', targetHits: 40, start: 3, every: 0.3, seconds: 16, seed: 91});
    const got = r.hits.filter(h => r.onsets.some(o => Math.abs(o.time - h) < 0.03)).length;
    console.log(`SNARE crowd alone 30 s: OFF ${offAlone.onsets.length} hits, ON ${onAlone.onsets.length} · the student's hits ON ${got}/${r.hits.length}`);
    expect(onAlone.onsets).toEqual([]);
    expect(offAlone.onsets.length).toBeGreaterThan(0);
    expect(got).toBeGreaterThanOrEqual(36);
    watch.check();
  });

  test('Classroom mode OFF changes nothing: the same readings whatever the room floor', {tag: '@quick'}, async ({page}) => {
    const watch = await open(page, 'trumpet');
    const res = await page.evaluate(() => {
      const P = Arcade.Pitch, sr = 44100, N = 4096, out = [];
      P.setInstrument(Arcade.groupFor('trumpet')); P.setRange(null); P.setClassroom('off');
      const tone = (midi, amp) => { const f = 440 * Math.pow(2, (midi - 69) / 12), b = new Float32Array(N); for (let i = 0; i < N; i++) b[i] = amp * (Math.sin(2 * Math.PI * f * i / sr) + .6 * Math.sin(4 * Math.PI * f * i / sr)); return b; };
      for (const floor of [null, 0.001, 0.05, 0.5]) {
        P._room(null); if (floor != null) P._room({floor, auto: true});
        out.push([58, 60, 62, 65].map(m => { const r = P._analyse(tone(m, .02), sr).reading; return r ? r.note : null; }).join(','));
      }
      return {out, on: P.classroom()};
    });
    expect(res.on).toBe(false);
    expect(new Set(res.out).size, res.out.join(' | ')).toBe(1);
    expect(res.out[0]).toBe('58,60,62,65');
    watch.check();
  });
});

test.describe('Classroom mode: Auto, the teacher setting, suppression', () => {
  /* the room's loudness frame by frame (white noise at an RMS), through the real frame loop on a fake clock */
  const feed = (page, steps) => page.evaluate(steps => {
    const P = Arcade.Pitch, sr = 44100, buf = new Float32Array(4096); let s = 7;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - .5; };
    window.__t = window.__t || 1e6;
    const log = [];
    for (const [rms, secs, mark] of steps) {
      for (let k = 0; k < secs * 25; k++) {
        for (let i = 0; i < buf.length; i++) buf[i] = rnd() * rms * 3.46;
        window.__t += 40; P._feed(buf, sr, window.__t);
        if (mark && (k + 1) % 25 === 0) log.push([mark, (k + 1) / 25, P.classroom(), +P.state().floor.toFixed(4)]);
      }
    }
    return log;
  }, steps);

  test('Auto turns on after 3 s of a loud room, off after 10 s quiet, and never flips at the edge', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('note-checker/index.html?demo&nostart');
    await page.evaluate(() => { const P = Arcade.Pitch; P.setInstrument(Arcade.groupFor('trumpet')); P._room(null); P.setClassroom('auto'); });
    const R = await page.evaluate(() => Arcade.Pitch.ROOM);
    const loud = await feed(page, [[0.02, 8, 'loud']]);
    // the first floor is taken after ~1 s of frames, then 3 s above autoOn: never on in the first 3 s, on by 5 s
    expect(loud.filter(x => x[1] <= 3).every(x => !x[2]), JSON.stringify(loud)).toBe(true);
    expect(loud.find(x => x[1] === 5)[2], JSON.stringify(loud)).toBe(true);
    // a level between autoOff and autoOn: it stays on (no flipping at the edge)…
    const mid = (R.autoOn + R.autoOff) / 2;
    const edge = await feed(page, [[mid, 30, 'edge']]);
    expect(edge.every(x => x[2]), JSON.stringify(edge)).toBe(true);
    // …off only after 10 s below autoOff (the floor falls in ~1 s)
    const quiet = await feed(page, [[0.001, 16, 'quiet']]);
    expect(quiet.filter(x => x[1] <= 10).every(x => x[2]), JSON.stringify(quiet)).toBe(true);
    expect(quiet[quiet.length - 1][2], JSON.stringify(quiet)).toBe(false);
    // and from off, the edge level never turns it on
    const edge2 = await feed(page, [[mid, 30, 'edge']]);
    expect(edge2.every(x => !x[2]), JSON.stringify(edge2)).toBe(true);
    watch.check();
  });

  test('a game\'s own sound (suppressed) never raises the room floor', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('note-checker/index.html?demo&nostart');
    await page.evaluate(() => { const P = Arcade.Pitch; P.setInstrument(Arcade.groupFor('trumpet')); P._room(null); P.setClassroom('auto'); });
    await feed(page, [[0.002, 4]]);
    const before = await page.evaluate(() => Arcade.Pitch.state().floor);
    await page.evaluate(() => { Arcade.Pitch.suppressedUntil = window.__t + 6000; });
    await feed(page, [[0.05, 5]]);                                  // loud, but all of it inside the suppression
    const after = await page.evaluate(() => ({floor: Arcade.Pitch.state().floor, on: Arcade.Pitch.classroom()}));
    expect(after.floor).toBeCloseTo(before, 5);
    expect(after.on).toBe(false);
    await page.evaluate(() => { Arcade.Pitch.suppressedUntil = 0; });
    watch.check();
  });

  test('the teacher setting: \'off\' ignores Auto and the device choice, \'on\' forces it', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('note-checker/index.html?demo&nostart');
    const r = await page.evaluate(() => {
      const P = Arcade.Pitch, T = Arcade.TEACHER, out = {};
      P._room(null); P._room({floor: 0.03, auto: true});
      T.CLASSROOM_MODE = 'off'; P.setClassroom('on'); out.off = [P.classroom(), P.classroomSetting()];
      P.setClassroom('auto'); out.offAuto = P.classroom();
      T.CLASSROOM_MODE = 'on'; P.setClassroom('off'); P._room({auto: false}); out.on = [P.classroom(), P.classroomSetting()];
      T.CLASSROOM_MODE = 'auto'; out.device = [P.classroom(), P.classroomSetting()];
      P.setClassroom('on'); out.deviceOn = P.classroom();
      P.setClassroom('auto'); out.autoQuiet = P.classroom(); P._room({auto: true}); out.autoLoud = P.classroom();
      return out;
    });
    expect(r.off).toEqual([false, {mode: 'off', by: 'teacher'}]);
    expect(r.offAuto).toBe(false);
    expect(r.on).toEqual([true, {mode: 'on', by: 'teacher'}]);
    expect(r.device).toEqual([false, {mode: 'off', by: 'device'}]);
    expect([r.deviceOn, r.autoQuiet, r.autoLoud]).toEqual([true, false, true]);
    watch.check();
  });

  test('the ?demo keys still work in both modes', {tag: '@quick'}, async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('note-checker/index.html?demo&nostart');
    await page.evaluate(() => { const P = Arcade.Pitch; P.setInstrument(Arcade.groupFor('trumpet')); P.demoReady = true; P.onHeld((pc, t, note) => { window.__held = note; }); });
    for (const mode of ['off', 'on']) {
      await page.evaluate(mode => { const P = Arcade.Pitch; P.setClassroom(mode); window.__held = null; P.demoNote = 60; }, mode);
      await expect.poll(() => page.evaluate(() => window.__held), {message: `a ?demo note counts with Classroom mode ${mode}`}).toBe(60);
      expect(await page.evaluate(() => Arcade.Pitch.classroom())).toBe(mode === 'on');
      await page.evaluate(() => { Arcade.Pitch.demoNote = null; });
      await expect.poll(() => page.evaluate(() => Arcade.Pitch.heldPc())).toBe(null);
    }
    watch.check();
  });
});

test.describe('THE ROOM CHECK', () => {
  test.describe.configure({timeout: 60_000});
  /* the check on a ?demo page: Pitch.demoRoom = the room, demoNote/demoLevel = the student's note */
  async function runCheck(page, {room = 0.01, own = 0.06, snare = false} = {}) {
    await page.evaluate(room => { Arcade.Pitch.demoRoom = room; Arcade.Pitch.demoNote = null; Arcade.RoomCheck.open(); }, room);
    const gate = page.locator('#micGateTitle');
    if (await gate.isVisible().catch(() => false)) await page.getByRole('button', {name: 'Turn on microphone'}).click();
    await expect(page.locator('.rc-panel .rc-big')).toContainText('Stay quiet for 3 seconds');
    await expect(page.locator('.rc-panel .rc-big')).toContainText(snare ? 'Hit your drum 4 times' : 'Play your FIRST note', {timeout: 6000});
    if (!snare) await expect(page.locator('.rc-staff svg')).toBeVisible();
    await page.evaluate(([own, snare]) => {
      const P = Arcade.Pitch; P.demoLevel = own;
      if (!snare) { P.demoNote = 60; return; }
      for (let k = 0; k < 6; k++) { setTimeout(() => { P.demoNote = 60; }, k * 450); setTimeout(() => { P.demoNote = null; }, k * 450 + 160); }
    }, [own, snare]);
    await expect(page.locator('.rc-panel[data-result]')).toBeVisible({timeout: 8000});
    await page.evaluate(() => { Arcade.Pitch.demoNote = null; Arcade.Pitch.demoLevel = null; });
    return page.evaluate(() => Arcade.RoomCheck.state());
  }

  test('the ratio, the result, the move-closer advice, saving and stale after 7 days', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('note-checker/index.html?demo&nostart');
    let st = await runCheck(page, {room: 0.01, own: 0.06});
    expect(st.ratio).toBe(6);
    await expect(page.locator('.rc-panel .rc-big')).toHaveText('Great! Your instrument is 6× louder than the room. Classroom mode is ready.');
    expect(st.saved).toMatchObject({ratio: 6, member: 'trumpet', own: 0.06, floor: 0.01});
    expect(st.stale).toBe(false);
    await page.getByRole('button', {name: 'Done'}).click();
    await expect(page.locator('.rc-panel')).toHaveCount(0);
    // a room almost as loud as the student
    st = await runCheck(page, {room: 0.02, own: 0.03});
    expect(st.ratio).toBe(1.5);
    await expect(page.locator('.rc-panel .rc-big')).toContainText('The room is almost as loud as you. Move the device closer');
    await expect(page.getByRole('button', {name: 'Try again'})).toBeVisible();
    await page.getByRole('button', {name: 'Done'}).click();
    // saved per device + instrument, never in the Backup Code; stale after 7 days; another instrument has none
    const r = await page.evaluate(() => {
      const A = Arcade, d = A.store.gameData('mic'), out = {};
      out.inBackup = !!(A.store.exportAll().gameData || {}).mic;
      d.room.at = A.store.dayKey(new Date(Date.now() - 6 * 864e5)); out.six = A.RoomCheck.stale(A.RoomCheck.saved());
      d.room.at = A.store.dayKey(new Date(Date.now() - 7 * 864e5)); out.seven = A.RoomCheck.stale(A.RoomCheck.saved());
      out.stillUsed = A.Pitch.roomCheck() && A.Pitch.roomCheck().own;
      const copy = A.store.exportAll(); A.store.importAll(copy); out.keptAfterRestore = !!A.store.gameData('mic').room;
      d.room.member = 'flute'; out.otherInstrument = A.RoomCheck.saved();
      return out;
    });
    expect(r).toEqual({inBackup: false, six: false, seven: true, stillUsed: 0.03, keptAfterRestore: true, otherInstrument: null});
    watch.check();
  });

  test('the snare: "Hit your drum 4 times"', async ({page}) => {
    const watch = await prepare(page, {store: device('snare')});
    await page.goto('note-checker/index.html?demo&nostart');
    const st = await runCheck(page, {room: 0.01, own: 0.08, snare: true});
    expect(st.saved).toMatchObject({member: 'snare', own: 0.08});
    expect(st.ratio).toBe(8);
    watch.check();
  });

  test('the once-a-day offer: only in a loud room, never twice a day, never with a fresh check', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('note-checker/index.html?demo&nostart');
    const ask = () => page.evaluate(() => { window.__ran = 0; Arcade.Pitch.demoReady = true; Arcade.requireMic(() => { window.__ran++; }); return {ran: window.__ran, offer: Arcade.RoomCheck.state().offerShowing}; });
    // a quiet room: no offer
    expect(await ask()).toEqual({ran: 1, offer: false});
    // a loud room (Auto's rule): the card, and the game starts after Not now
    await page.evaluate(() => Arcade.Pitch._room({loudAt: Date.now()}));
    expect(await ask()).toEqual({ran: 0, offer: true});
    await expect(page.locator('.rc-offer')).toContainText('Loud room!');
    await expect(page.locator('.rc-offer')).toContainText('A quick room check helps the game hear YOU.');
    await page.getByRole('button', {name: 'Not now'}).click();
    expect(await page.evaluate(() => window.__ran)).toBe(1);
    // never twice a day (also after a reload: it's saved)
    expect(await ask()).toEqual({ran: 1, offer: false});
    await page.reload();
    await page.evaluate(() => Arcade.Pitch._room({loudAt: Date.now()}));
    expect(await ask()).toEqual({ran: 1, offer: false});
    // the next day it comes back; CHECK NOW runs the check, then the game
    await page.evaluate(() => { Arcade.store.gameData('mic').offered = '2000-01-01'; });
    expect(await ask()).toEqual({ran: 0, offer: true});
    await page.getByRole('button', {name: 'Check now'}).click();
    await expect(page.locator('.rc-panel .rc-big')).toContainText('Stay quiet');
    await page.locator('.rc-panel').getByRole('button', {name: 'Cancel'}).click();
    expect(await page.evaluate(() => window.__ran)).toBe(1);
    // a fresh check: no offer (a stale one: the offer again)
    const fresh = await page.evaluate(() => {
      const d = Arcade.store.gameData('mic'); d.offered = '2000-01-01';
      d.room = {floor: .01, own: .05, ratio: 5, at: Arcade.store.dayKey(), member: 'trumpet'};
      return Arcade.RoomCheck.due();
    });
    expect(fresh).toBe(false);
    const staleDue = await page.evaluate(() => { Arcade.store.gameData('mic').room.at = '2000-01-01'; return Arcade.RoomCheck.due(); });
    expect(staleDue).toBe(true);
    watch.check();
  });

  test('Settings: Classroom mode Auto / On / Off (saved, the teacher wins), the chip, the tip, ?teacher', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await page.goto('note-checker/index.html?demo&nostart&teacher');
    await page.evaluate(() => Arcade.UI.settings.open());
    const set = page.locator('#uiSettings');
    await expect(set.locator('[data-cm=auto]')).toHaveAttribute('aria-pressed', 'true');
    await expect(set.locator('[data-note=room]')).toHaveText('Tip: in a loud room, keep the device close to your instrument.');
    await expect(set.locator('[data-room-chip]')).toBeHidden();
    await set.locator('[data-cm=on]').click();
    await expect(set.locator('[data-cm=on]')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => [Arcade.store.gameData('mic').classroom, Arcade.Pitch.classroom()])).toEqual(['on', true]);
    await expect(set.locator('[data-note=teacher]')).toContainText('Classroom mode ON (set to On)');
    await expect(set.locator('[data-room-last]')).toHaveText('Not checked yet on this device.');
    await set.getByRole('button', {name: 'Done'}).click();
    // the teacher's 'off' wins: the choice is shown but can't be changed
    await page.evaluate(() => { Arcade.TEACHER.CLASSROOM_MODE = 'off'; Arcade.UI.settings.open(); });
    await expect(set.locator('[data-cm=off]')).toHaveAttribute('aria-pressed', 'true');
    await expect(set.locator('[data-cm=on]')).toBeDisabled();
    await expect(set.locator('[data-note=room]')).toContainText('Your teacher set this to Off.');
    // the room check from Settings opens on top
    await page.evaluate(() => { Arcade.TEACHER.CLASSROOM_MODE = 'auto'; });
    await set.getByRole('button', {name: 'Room check'}).click();
    const gate = page.locator('#micGateTitle');
    if (await gate.isVisible().catch(() => false)) await page.getByRole('button', {name: 'Turn on microphone'}).click();
    await expect(page.locator('.rc-panel')).toBeVisible();
    expect(await page.evaluate(() => +getComputedStyle(document.querySelector('.rc-ov')).zIndex > +getComputedStyle(document.querySelector('#uiSettings')).zIndex)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('.rc-panel')).toHaveCount(0);
    watch.check();
  });

  test('Tune Up\'s mic block: the Room check button and the last check', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet', {gameData: {mic: {room: {floor: .01, own: .05, ratio: 5, at: '2026-01-02', member: 'trumpet'}}}})});
    await page.goto('note-checker/index.html?demo&nostart');
    await expect(page.locator('#roomLast')).toContainText('Last check: 5× louder than the room');
    await expect(page.locator('#roomBtn')).toBeVisible();
    watch.check();
  });
});
