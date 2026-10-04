/* LOST SIGNAL: THE FIRST NOTE IS ALWAYS NAMED (docs/games/lost-signal.md). Every level 1–8 and every DEEP SPACE SCAN
   round shows the first note's name in #first (never the static look); FIND THE SIGNAL is retired (the echo starts
   right after the transmission, no "Show me" button); every level card says "first note named"; a perfect transmission
   scores what the old rules gave with no find cost. The tone turn-taking itself is covered by game-runs.spec.js. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const URL = 'lost-signal/index.html?demo&nostart';
const store = () => device('trumpet', {gameData: {'lost-signal': {signalChecked: true}}});

async function open(page, fresh = true) {
  const watch = fresh ? await prepare(page, {store: store()}) : null;
  await page.goto(URL);
  await page.waitForFunction(() => Arcade.LostSignal && document.querySelectorAll('#levelGrid .lvl').length === 8);
  // every phase a transmission goes through, sampled while the test runs
  await page.evaluate(() => {
    window.__phases = new Set();
    setInterval(() => { const G = Arcade.LostSignal.state(); if (G && G.tx) window.__phases.add(G.tx.phase); }, 30);
  });
  return watch;
}
/** press the main button of whatever overlay is up (the level intro, the demo's microphone screen) until play shows */
async function intoPlay(page) {
  await expect.poll(() => page.evaluate(() => {
    if (!document.getElementById('play').hidden) return true;
    for (const ov of document.querySelectorAll('.overlay')) {
      if (ov.hidden || !ov.getClientRects().length) continue;
      const b = ov.querySelector('[data-act="go"]') || ov.querySelector('.btn-primary');
      if (b && b.getClientRects().length) { b.click(); break; }
    }
    return false;
  }), {timeout: 15_000}).toBe(true);
}
const first = page => page.evaluate(() => {
  const f = document.getElementById('first'), G = Arcade.LostSignal.state();
  return {aria: f.getAttribute('aria-label'), name: document.getElementById('firstName').textContent,
          static: f.classList.contains('static'), want: G && G.tx ? G.tx.pattern[0].label : null};
});
async function expectNamed(page) {
  await page.waitForFunction(() => { const G = Arcade.LostSignal.state(); return G && G.tx; });
  const f = await first(page);
  expect(f.static).toBe(false);
  expect(f.name).toBe(f.want);
  expect(f.aria).toBe(`First note: ${f.want}`);
}
/** wait for the student's turn (the demo answers only while the game listens) */
const ourTurn = page => page.waitForFunction(() => !!(Arcade.Pitch.demoTarget && Arcade.Pitch.demoTarget()), null, {timeout: 20_000});
/** echo the whole transmission right (Space = the note the game wants), up to its result */
async function echoAll(page) {
  await ourTurn(page);
  const n = await page.evaluate(() => Arcade.LostSignal.state().tx.pattern.length);
  for (let i = 0; i < n; i++) {
    await page.waitForFunction(() => !!Arcade.Pitch.demoTarget(), null, {timeout: 10_000});
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
  }
  await expect(page.locator('#txResult')).toBeVisible({timeout: 10_000});
}

test.describe('Lost Signal: the first note is always named', () => {
  test('the data: every level labels its first note, none searches, Endless names every round', async ({page}) => {
    await open(page);
    const d = await page.evaluate(() => ({
      levels: window.SIGNAL_LEVELS.map(L => [L.label, L.find]),
      rules: Object.keys(window.SIGNAL_RULES), labelRounds: window.SIGNAL_ENDLESS.labelRounds,
      cards: [...document.querySelectorAll('#levelGrid .lvl .d')].map(e => e.textContent),
      reveal: !!document.getElementById('revealBtn')}));
    expect(d.levels).toEqual(Array(8).fill([true, false]));
    expect(d.rules).not.toContain('findCost');
    expect(d.rules).not.toContain('findReveal');
    expect(d.labelRounds).toBeGreaterThanOrEqual(1e9);
    expect(d.cards).toHaveLength(8);
    d.cards.forEach(t => expect(t).toContain('first note named'));
    expect(d.reveal).toBe(false);
  });

  test('levels 1–8 name the first note; the echo follows the transmission (no FIND phase)', async ({page}) => {
    test.setTimeout(120_000);
    const watch = await open(page);
    for (let lv = 1; lv <= 8; lv++) {
      if (lv > 1) {   // a fresh level select (the phases seen so far are checked first)
        expect(await page.evaluate(() => [...window.__phases])).not.toContain('find');
        await open(page, false);
      }
      await page.locator(`#levelGrid .lvl[data-l="${lv}"]`).dblclick();
      await intoPlay(page);
      await expectNamed(page);
      if (lv === 5 || lv === 6) {   // the old FIND THE SIGNAL levels: straight to YOUR TURN · ECHO
        await ourTurn(page);
        expect(await page.evaluate(() => Arcade.LostSignal.state().tx.phase)).toBe('echo');
        await expect(page.locator('#status')).toHaveText('YOUR TURN · ECHO THE SIGNAL');
        await expectNamed(page);
      }
    }
    expect(await page.evaluate(() => [...window.__phases])).not.toContain('find');
    watch.check();
  });

  test('a perfect transmission on Static Storm scores as before (no find cost); a replay costs 15 %', async ({page}) => {
    test.setTimeout(90_000);
    await open(page);
    await page.locator('#levelGrid .lvl[data-l="5"]').dblclick();
    await intoPlay(page);
    await echoAll(page);
    // old rules: right × base × (1 − replayCost × replays) − tries × findCost, with tries 0 = 4 × 100
    expect(await page.evaluate(() => Arcade.LostSignal.state().score)).toBe(400);
    await expect(page.locator('#txLine')).toContainText('All 4 notes. +400');
    await page.locator('#txNext').click();
    await ourTurn(page);
    await expectNamed(page);
    await expect(page.locator('#replayBtn')).toBeVisible();
    await page.locator('#replayBtn').click();
    await echoAll(page);
    expect(await page.evaluate(() => Arcade.LostSignal.state().score)).toBe(400 + 340);
    expect(await page.evaluate(() => [...window.__phases])).not.toContain('find');
  });

  test('Deep Space Scan names the first note in rounds 1, 4 and 10', async ({page}) => {
    test.setTimeout(120_000);
    await open(page);
    await page.locator('.ls-endless').first().click();
    await page.locator('.ls-start').click();
    await intoPlay(page);
    await expectNamed(page);
    expect(await page.evaluate(() => Arcade.LostSignal.state().round)).toBe(1);
    for (const [from, to] of [[3, 4], [9, 10]]) {
      await echoAll(page);
      await page.evaluate(r => { Arcade.LostSignal.state().round = r; }, from);   // skip ahead: the next round is `to`
      await page.locator('#txNext').click();
      await page.waitForFunction(r => Arcade.LostSignal.state().round === r, to);
      await expectNamed(page);
    }
    expect(await page.evaluate(() => [...window.__phases])).not.toContain('find');
  });
});
