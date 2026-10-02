/* THE GAME RUNS: one entry per game, made from shared/games.js (tests/arcade.js), so a NEW GAME IS TESTED
   AUTOMATICALLY with the defaults below: open it in ?demo, select Level 1, START, tap Space (the demo's "right
   answer") until the results screen shows, then check its stars were saved.

   A game that needs other steps gets a small entry in STEPS (only what differs from the defaults):
     member    the instrument saved on the device (default 'trumpet')
     play      'tap' (Space taps) | 'hold' (Space held ~0.45 s, then let go) | async (page, t) => {…} (one step)
     every     ms between steps (default 350)
     setup     async page => {…} after the page opens, before the level is picked (a 2-player game's setup)
     start     async page => {…} instead of "select Level 1 + START"
     done      async page => bool: the level/match is over (default: #results shows)
     key       the progress key its stars are saved under (default: the game id); stars: false = none are saved
     store     extra saved data for the device before the page opens (merged into tests/helpers.js device()),
               or browserName => that data
     url       the address to open (default: <id>/index.html?demo&nostart)
     next      a button to press between rounds when it shows (e.g. "Next scroll" / "Try the same signal")
     limit     ms the whole level may take (default 70 s)
     endlessPlay  the step in its ENDLESS run (a game whose page has an Endless card is also run to GAME OVER):
               default 'wrong' (tap W = a wrong note, which costs a heart); 'idle' = do nothing (notes run out)
     skip      'chromium' | 'webkit': a reason not to run in that browser
     pause     false = no pause button during this run (the run pauses, opens Settings and resumes once otherwise)
     slow      true = its level takes about a minute of real time or more (a whole rhythm set, a match, a race):
               tagged @slow, so it runs only in the FULL job (docs/engine/testing.md "Keeping the tests fast");
               endlessSlow the same for its Endless run */
const fs = require('fs');
const path = require('path');
const {games} = require('./arcade');
const {ROOT} = require('./helpers');
/** does the game's page have an Endless card (shared/endless.js tile)? */
const hasEndless = id => { try { return /id="endlessTile"/.test(fs.readFileSync(path.join(ROOT, id, 'index.html'), 'utf8')); } catch (e) { return false; } };

/** click the first visible, enabled match (never waits: the step loop comes back) */
const click = sel => page => page.evaluate(sel => {
  const e = [...document.querySelectorAll(sel)].find(e => !e.disabled && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden');
  if (e) e.click();
  return !!e;
}, sel);
/** tap the element the demo marks as the right answer (answer pads, choice buttons, bell bars) */
const tapHint = sel => async page => {
  const h = page.locator(sel).first();
  if (await h.isVisible().catch(() => false)) await h.dispatchEvent('pointerdown').then(() => h.dispatchEvent('pointerup')).then(() => h.dispatchEvent('click')).catch(() => {});
};

/* Note Ninja: the demo writes the answer under the pad ("Answer: C♯"); keys 1/2/3 = ♭/♮/♯, then the letter */
async function ninjaAnswer(page) {
  const t = await page.locator('#demoAns').textContent().catch(() => '');
  const m = /Answer:\s*([A-G])([♭♯]?)/.exec(t || '');
  if (m) { if (m[2]) await page.keyboard.press(m[2] === '♭' ? '1' : '3'); await page.keyboard.press(m[1].toLowerCase()); }
  await page.waitForTimeout(250);
}
/* Button Masher: the demo marks the right keys (.hint, data-hint = how pressed); press them, then STRIKE */
async function masherCombo(page) {
  await page.evaluate(() => {
    const pad = document.getElementById('pad'); if (!pad) return;
    const keys = [...pad.querySelectorAll('.key')], hinted = keys.filter(k => k.dataset.hint);
    if (!hinted.length) return;
    for (let round = 0; round < 3; round++) {
      const wrong = keys.filter(k => (k.dataset.hint || '0') !== (k.dataset.state || '0'));
      if (!wrong.length) break;
      wrong.forEach(k => k.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true})));
    }
    const strike = document.getElementById('strikeBtn');
    if (strike && !strike.hidden) strike.click();
  });
  await page.waitForTimeout(450);
}
/* Dojo Duel: Player 1 answers every note (the notes are known to the test hook); Player 2 never does */
async function duelPoint(page) {
  await page.evaluate(() => {
    const s = Arcade.Duel.state();
    if (s && s.phase === 'play' && s.players[0].it && !s.players[0].stunned) Arcade.Duel.tap(0, s.players[0].it.letter, performance.now());
  });
  await page.waitForTimeout(300);
}
/* Arcade Quest (TEST ARENA): PLAY in the battle menu (Enter), hold the right note while the challenge listens */
async function questTurn(page) {
  const st = await page.evaluate(() => Arcade.Quest.battleState && Arcade.Quest.battleState());
  if (!st || st.state === 'menu') await page.keyboard.press('Enter');
  else { await page.keyboard.down('Space'); await page.waitForTimeout(500); await page.keyboard.up('Space'); }
  await page.waitForTimeout(250);
}

/* Blocktave: CHAPTER 1 through the game's own demo hooks (the real mining, crafting and building code): mine maple and
   cork, craft Maple Planks and the Wooden Mallet (each a performance card, answered right), mine 10 Tone Ore, then
   build a shelter with a door. The chapter's results screen shows when its 3rd milestone is done. One action a step. */
async function blocktaveStep(page) {
  await page.evaluate(() => {
    const B = Arcade.Blocktave, d = B.demo, s = B.state();
    if (s.screen !== 'world') return;
    if (Arcade.BlocktaveCard.current) { d.answer(); return; }
    if (s.held) return;                                   // a first-time card: the run's dismiss() closes it
    if (s.drops.length) return;                           // mined loot lands beside the player: wait for the pickup
    const inv = s.inv || {}, go = k => { const t = d.find(k); if (t) { d.standBy(t.x, t.y); d.mine(t.x, t.y); } };
    if (!inv.mallet1 && !inv.mallet2) {
      if (!inv.cork) return go('cork');
      if ((inv.planks || 0) >= 2) return d.craft('wooden-mallet');
      if (inv.maple) return d.craft('maple-planks');
      return go('maple');
    }
    if (d.stats().ore < 10) return go('toneOre');
    d.shelter();
  });
  await page.waitForTimeout(600);
}

const STEPS = {
  'ghost-notes': {play: 'hold'},
  'note-storm': {play: 'hold', endlessPlay: 'idle'},
  'note-ninja': {play: ninjaAnswer, endlessPlay: async page => {     // a wrong letter costs a heart
    const t = await page.locator('#demoAns').textContent().catch(() => '');
    const m = /Answer:\s*([A-G])/.exec(t || ''); await page.keyboard.press(m && m[1] === 'A' ? 'b' : 'a'); await page.waitForTimeout(400); }},
  'chime-heist': {member: 'bells', play: tapHint('.bar.hint'), every: 300},
  'ancient-ninja-scrolls': {play: async page => { await click('#goTrain')(page); await click('.choice.hint')(page); await page.waitForTimeout(150); await click('#nextBtn')(page); await page.waitForTimeout(200); }},
  'button-masher': {play: masherCombo, slow: true},
  'neon-face-off': {store: {opponent: 'cpu'}, start: click('#startBtn'), play: 'hold', every: 150, key: 'neon-face-off', limit: 120_000, slow: true},
  'dojo-duel': {start: click('#goBtn'), play: duelPoint, stars: false, limit: 90_000, slow: true,
    done: page => page.evaluate(() => { const s = Arcade.Duel.state(); return !!s && !s.running && s.players.some(p => p.score > 0); })},
  // Music Highway judges timing to the millisecond, so the test uses the game's own autoPlay hook (every note on time,
  // through the real judging) instead of key presses; calibrated already, so the first song doesn't ask for it
  // WebKit on a test machine with no sound card says its audio is running but its clock never moves, so there the song
  // plays with SOUND OFF (the game then runs on its performance.now() clock, as on a muted iPad)
  // (the first song of a play session always starts with the timing check: this run counts as already checked)
  'music-highway': {store: browser => Object.assign({gameData: {'music-highway': {calib: {speaker: {ms: 0}, headphones: {ms: 0}}}}}, browser === 'webkit' ? {sfx: false} : {}), limit: 120_000,
    setup: page => page.evaluate(() => { Arcade.session.mark('mh-calibrated-speaker'); Arcade.session.mark('mh-calibrated-headphones'); }),
    play: async page => { await page.evaluate(() => { const H = Arcade.Highway; if (!window.__auto && H.state().phase !== 'menu') { window.__auto = true; H.autoPlay(0); } }); await page.waitForTimeout(400); }},
  // Rhythm Dojo judges timing too: TAP mode (no microphone), calibrated already, every rhythm performed on time by the
  // game's own autoPlay hook (through the real judging); NEXT between rhythms. WebKit: SOUND OFF (see Music Highway).
  // Its Dojo Marathon: nothing played, so every rhythm misses and costs a life.
  'rhythm-dojo': {store: browser => Object.assign({gameData: {'rhythm-dojo': {mode: 'tap', calib: {clap: {ms: 0}, tap: {ms: 0}}}}}, browser === 'webkit' ? {sfx: false} : {}),
    next: '#rdNext', limit: 150_000, endlessPlay: 'idle', slow: true,
    play: async page => {
      await page.evaluate(() => { const D = Arcade.RhythmDojo; if (!window.__auto) { window.__auto = true; D.autoPlay(0, {persist: true}); } if (D.state().phase === 'study') document.getElementById('rdGo').click(); });
      await page.waitForTimeout(400);
    }},
  // Scale Trainer: Space = the next note of the scale (four scales in a row: about 100 notes on level 1)
  'scale-trainer': {every: 200, limit: 90_000},
  'sustain-speedway': {play: async page => { await page.keyboard.down('Space'); await page.waitForTimeout(1500); }, limit: 150_000, slow: true},
  // 5 animatronics walk in one at a time: about a minute. THE ENCORE: nobody plays, so 3 machines reach the front (~45 s)
  'showtime-malfunction': {limit: 120_000, endlessPlay: 'idle', slow: true, endlessSlow: true},
  'lost-signal': {store: {gameData: {'lost-signal': {signalChecked: true}}}, next: '#txNext', limit: 100_000, slow: true},   // level 1 takes about a minute
  'vanishing-ink': {next: '#rrNext', limit: 100_000, slow: true},
  // Blocktave: chapter 1 (above); its Survival Nights run: every step a creature's bump costs a heart (the demo hook)
  'blocktave': {play: blocktaveStep, every: 600, limit: 100_000, key: 'blocktave',
    endlessPlay: async page => { await page.evaluate(() => { const B = Arcade.Blocktave; if (B.state().screen === 'world' && !B.state().held) B.demo.hurt(1); }); await page.waitForTimeout(400); }},
  'arcade-quest': {url: 'arcade-quest/index.html?demo&test', store: {gameData: {'arcade-quest': {settings: {textSpeed: 'instant', dodge: 'easy', assist: true}}}}, start: async page => { await page.waitForTimeout(1200); await page.keyboard.press('Enter'); },
    play: questTurn, stars: false, limit: 150_000, pause: false, slow: true,   // a battle waits for you: no pause there
    done: page => page.evaluate(() => { const Q = Arcade.Quest, b = Q.battleState && Q.battleState(), s = Q.save.get();
      return (!!b && (b.state === 'friend' || b.state === 'fading')) || (s.battles || 0) > 0 || (s.roster || []).length > 0; })},
};

/** the list the game-run spec walks: every game except tools, with its steps */
const RUNS = games.filter(g => !g.tool).map(g => Object.assign({id: g.id, name: g.name, maxStars: g.maxStars, member: 'trumpet', play: 'tap', every: 350,
  key: g.id, stars: g.maxStars > 0, limit: 70_000, endless: hasEndless(g.id), endlessPlay: 'wrong'}, STEPS[g.id] || {}));

module.exports = {RUNS, STEPS, click, tapHint};
