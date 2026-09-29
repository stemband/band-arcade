/* NEON FACE-OFF: THE WRONG-NOTE MESSAGE ("That's D. Look again!") names the note the ACTIVE player really played, as
   written on THEIR part, and nothing that isn't them can trigger it.
   A tone microphone: getUserMedia gives a marked stream, and the page's AudioContext turns it into an oscillator with a
   few harmonics (window.__tone(soundingMidi | null)), so pitch.js's real analysis hears known pitches.
   - wrong notes: a B♭ instrument against a concert-pitch one, E♭ against F, the same instrument twice, and the CPU;
     First 5, a key-signature scale (spelled with the key's own accidentals) and Chromatic;
   - the other player's note still ringing into this player's turn (with SOUND OFF, so no hit sound mutes the mic)
     never shows a message: shared/pitch.js used to forget a ringing note when a turn reset the detector (setRange),
     so it counted as a brand new note, spelled for the wrong player. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

async function toneMic(page) {
  await page.addInitScript(() => {
    const fake = async () => { const s = new MediaStream(); s.__fake = true; return s; };
    const put = o => { try { Object.defineProperty(o, 'getUserMedia', {value: fake, configurable: true, writable: true}); } catch (e) { /* not ours */ } };
    if (window.MediaDevices) put(MediaDevices.prototype);
    if (navigator.mediaDevices) put(navigator.mediaDevices);
    const AC = window.AudioContext, real = AC.prototype.createMediaStreamSource;
    AC.prototype.createMediaStreamSource = function (s) {
      if (!s || !s.__fake) return real.call(this, s);
      const out = this.createGain(), osc = this.createOscillator(), g = this.createGain(), ctx = this;
      const re = new Float32Array(9), im = new Float32Array(9);
      [0, 1, .6, .4, .25, .15, .1, .06, .04].forEach((a, i) => { im[i] = a; });
      osc.setPeriodicWave(this.createPeriodicWave(re, im)); g.gain.value = 0; osc.connect(g); g.connect(out); osc.start();
      window.__tone = midi => {
        if (midi == null) g.gain.setValueAtTime(0, ctx.currentTime);
        else { osc.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), ctx.currentTime); g.gain.setValueAtTime(.3, ctx.currentTime); }
      };
      return out;
    };
  });
}
async function startMatch(page, p1, p2, notes, extra = {}) {
  const watch = await prepare(page, {store: device(p1, Object.assign({opponent: p2, modes: {'neon-face-off:p1': {notes, order: 'random'}, 'neon-face-off:p2': {notes, order: 'random'}}}, extra)), mic: true});
  await toneMic(page);
  await page.goto('neon-face-off/index.html?nostart');
  await page.locator('#startBtn').click();
  const go = page.locator('[data-act=go]:visible');
  if (await go.count()) await go.first().click();
  return watch;
}
/** the next human turn that is live: {active, member, sounds, target, pool} (null if none came) */
const liveTurn = page => page.waitForFunction(() => {
  const F = Arcade.FaceOff, s = F.state();
  if (!s || !s.live || s.active === null || F.P[s.active].cpu) return null;
  const p = F.P[s.active];
  return {active: s.active, member: p.member.id, sounds: p.member.sounds, lo: p.member.soundLow, hi: p.member.soundHigh,
    target: {label: p.target.label, sounding: p.target.sounding, pc: p.target.pc},
    pool: p.seq.pool.map(it => ({label: it.label, sounding: it.sounding, pc: it.pc}))};
}, null, {timeout: 20000}).then(h => h.jsonValue(), () => null);
const status = (page, i) => page.evaluate(i => document.querySelector('#side' + (i + 1) + ' .s-status').textContent, i);
const PC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
const pcOf = name => { const m = /^([A-G])([♯♭]*)$/.exec(name); if (!m) return null; let p = PC[m[1]]; for (const c of m[2]) p += c === '♯' ? 1 : -1; return (p + 12) % 12; };
const mod12 = n => ((n % 12) + 12) % 12;

test.describe('Neon Face-Off: the wrong-note message', () => {
  test.skip(({browserName}) => browserName === 'webkit', 'WebKit on the test machine has no running audio clock (the tone microphone is silent)');

  const CASES = [
    ['trumpet', 'flute', 'first5'],       // B♭ vs concert
    ['clarinet', 'trombone', 'F'],        // B♭ vs concert (bass clef), a key-signature scale
    ['altosax', 'horn', 'Bb'],            // E♭ vs F, a key-signature scale
    ['flute', 'altosax', 'chrom'],        // concert vs E♭, chromatic
    ['clarinet', 'clarinet', 'Eb'],       // the same instrument twice
    ['horn', 'cpu', 'first5'],            // vs the CPU
  ];
  for (const [p1, p2, notes] of CASES) {
    test(`${p1} vs ${p2}, ${notes}: it names the note played, as written for the active player`, async ({page}) => {
      test.setTimeout(90_000);
      const watch = await startMatch(page, p1, p2, notes);
      // every status line either side shows, as it is shown (the match moves on by itself: a slow test machine can see a
      // goal clear the line before a poll would read it)
      await page.evaluate(() => {
        window.__msgs = [];
        [1, 2].forEach(n => new MutationObserver(() => {
          const t = document.querySelector('#side' + n + ' .s-status').textContent;
          if (/^That's/.test(t)) window.__msgs.push({side: n - 1, text: t});
        }).observe(document.querySelector('#side' + n + ' .s-status'), {childList: true, characterData: true, subtree: true}));
      });
      const seen = new Set();
      for (let k = 0; k < 14 && seen.size < (p2 === 'cpu' ? 1 : 2); k++) {
        const t = await liveTurn(page);
        if (!t) break;
        await page.waitForTimeout(250);                                             // a player's reaction time
        // a wrong note: in a key-signature scale, one of its own notes with an accidental when there is one (the name
        // must use the key's spelling); else three half steps away, inside the instrument's range
        const inKey = t.pool.find(it => it.pc !== t.target.pc && /[♯♭]/.test(it.label)) || t.pool.find(it => it.pc !== t.target.pc);
        const scale = notes !== 'first5' && notes !== 'chrom';
        const wrong = scale && inKey ? inKey.sounding : (t.target.sounding + 3 <= t.hi ? t.target.sounding + 3 : t.target.sounding - 3);
        const from = await page.evaluate(() => window.__msgs.length);
        await page.evaluate(m => window.__tone(m), wrong);
        const got = await page.waitForFunction(([from, side]) => window.__msgs.slice(from).find(m => m.side === side) || null, [from, t.active], {timeout: 4000})
          .then(h => h.jsonValue(), () => null);
        await page.evaluate(() => window.__tone(null));
        if (got) {
          const named = /^That's (.+)\. Look again!$/.exec(got.text)[1];
          expect(pcOf(named), `${t.member} played sounding ${wrong}: "${got.text}"`).toBe(mod12(wrong + t.sounds));   // the WRITTEN note, for THIS player
          if (scale && inKey && inKey.sounding === wrong) expect(named).toBe(inKey.label);                          // the key's own spelling
          seen.add(t.active);
        }
        // then the right note, so the rally goes on to the other player
        await page.waitForTimeout(200);
        await page.evaluate(m => window.__tone(m), t.target.sounding);
        await page.waitForFunction(i => { const s = Arcade.FaceOff.state(); return s.active !== i || s.state !== 'travel' && s.state !== 'serve'; }, t.active, {timeout: 5000}).catch(() => {});
        await page.evaluate(() => window.__tone(null));
        await page.waitForTimeout(250);
      }
      // (each message was checked above as it came)
      expect(await page.evaluate(() => window.__msgs.length)).toBeGreaterThan(0);
      expect(seen.size).toBe(p2 === 'cpu' ? 1 : 2);
      watch.check();
    });
  }

  for (const notes of ['first5', 'F']) {
    test(`the other player's note still ringing never shows "That's …" (sound off, ${notes})`, async ({page}) => {
      test.setTimeout(90_000);
      const watch = await startMatch(page, 'trumpet', 'flute', notes, {sfx: false});
      let turns = 0;
      for (let k = 0; k < 8 && turns < 4; k++) {
        const t = await liveTurn(page);
        if (!t) break;
        await page.evaluate(m => window.__tone(m), t.target.sounding);                     // the right note…
        const moved = await page.waitForFunction(i => Arcade.FaceOff.state().active === 1 - i, t.active, {timeout: 6000}).then(() => true, () => false);
        if (!moved) { await page.evaluate(() => window.__tone(null)); continue; }
        await page.waitForTimeout(900);                                                     // …held on into the other player's turn
        expect(await status(page, 1 - t.active), `${t.member}'s ringing note on the other side`).not.toMatch(/That's/);
        await page.evaluate(() => window.__tone(null));
        await page.waitForTimeout(300);
        turns++;
      }
      expect(turns).toBeGreaterThanOrEqual(3);
      watch.check();
    });
  }
});
