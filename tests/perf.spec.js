/* PAGE WEIGHT AND LOAD TIME (Chromium).
   THE LOBBY'S JAVASCRIPT BUDGET: on a PUBLISHED copy (stamped + minified by deploy.js, as the Pages deploy does:
   tests.yml's "built" job), the JavaScript the lobby loads before it's ready stays under LOBBY_JS_BUDGET. Over it = a
   change put a big script back into index.html's list or made a heavy one load at startup: load a rarely used
   feature on demand instead (Arcade.need; docs/engine/version-and-app.md "ON-DEMAND SCRIPTS"). On the repository's
   own unminified copy ('dev') this check is skipped (those files aren't what students load).
   THE MEASUREMENT (PERF=1 only, like Blocktave's frame rate): the lobby and Music Highway on a slow school device,
   4× CPU throttle + "Fast 3G" + an empty cache, ?demo&nostart: script requests, JS decoded (and gzipped, as GitHub
   Pages sends it), the main thread's script time, and the time until the zone signs are on screen and answer taps
   (lobby.js's performance.mark('lobby-ready')). Printed in the log; compare a copy of main with this branch's
   published copy: ARCADE_SITE=<folder> PERF=1 npx playwright test perf --project=chromium --workers=1 */
const {test, expect} = require('@playwright/test');
const zlib = require('zlib');
const {prepare} = require('./helpers');

// measured on the published copy (2026-10): 617 KB of JavaScript at load (1320 KB before minifying + on-demand). The
// budget = that + 10 %.
const LOBBY_JS_BUDGET = 680 * 1024;
const PERF = !!process.env.PERF;
const FAST_3G = {offline: false, latency: 562.5, downloadThroughput: 1.6 * 1024 * 1024 / 8 * 0.9, uploadThroughput: 750 * 1024 / 8 * 0.9};

/** every script the page has loaded so far: its address (without ?v=), decoded size and bytes on the wire */
const scripts = page => page.evaluate(() => performance.getEntriesByType('resource')
  .filter(e => e.initiatorType === 'script' || /\.js(\?|$)/.test(e.name))
  .map(e => ({url: e.name, path: new URL(e.name).pathname.replace(/^\//, ''), decoded: e.decodedBodySize, transfer: e.transferSize})));
const kb = n => `${(n / 1024).toFixed(1)} KB`;
const lobbyReady = page => page.waitForFunction(() => {
  const m = performance.getEntriesByName('lobby-ready')[0];
  if (m) return m.startTime;
  // (a copy from before the mark existed: the moment the signs are there)
  return document.querySelector('#zones .zsign') && !document.getElementById('lobby').hidden ? performance.now() : 0;
}, null, {polling: 'raf', timeout: 120_000}).then(h => h.jsonValue());

test.describe('page weight', () => {
  test.skip(({browserName}) => browserName !== 'chromium', 'resource sizes and throttling: Chromium');

  test('the published lobby loads less JavaScript than its budget', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('index.html?demo&nostart');
    await lobbyReady(page);
    test.skip(await page.evaluate(() => Arcade.VERSION === 'dev'), 'the repository copy is not minified: run it on a published copy (ARCADE_SITE)');
    const list = (await scripts(page)).sort((a, b) => b.decoded - a.decoded);
    const total = list.reduce((n, s) => n + s.decoded, 0);
    const top = list.slice(0, 8).map(s => `${s.path} ${kb(s.decoded)}`).join(', ');
    expect(total, `the lobby loads ${kb(total)} of JavaScript at startup (budget ${kb(LOBBY_JS_BUDGET)}). Biggest: ${top}. ` +
      'Load a rarely used feature on demand (Arcade.need) instead of adding it to index.html.').toBeLessThanOrEqual(LOBBY_JS_BUDGET);
    // the on-demand scripts are NOT loaded until they're used
    for (const f of ['shared/prizes.js', 'shared/locker.js', 'shared/avatar-creator.js', 'shared/backup.js', 'leaderboard-screen.js', 'arcade3d.js', 'shared/vendor/three.min.js']) {
      expect(list.map(s => s.path), `${f} waits until it's opened`).not.toContain(f);
    }
    watch.check();
  });

  for (const [name, url] of [['the lobby', 'index.html?demo&nostart'], ['Music Highway', 'music-highway/index.html?demo&nostart']]) {
    test(`measure: ${name} on a slow school device (PERF=1)`, async ({browser}) => {
      test.skip(!PERF, 'only with PERF=1 (alone on the machine: --workers=1)');
      test.setTimeout(240_000);
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await prepare(page);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', {cacheDisabled: true});
      await cdp.send('Network.emulateNetworkConditions', FAST_3G);
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
      await cdp.send('Performance.enable');
      await page.goto(url, {waitUntil: 'commit'});
      const ready = url.startsWith('index') ? await lobbyReady(page)
        : await page.waitForFunction(() => document.readyState === 'complete' && document.getElementById('topbar') && performance.now(), null, {polling: 'raf', timeout: 120_000}).then(h => h.jsonValue());
      const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
      const list = await scripts(page);
      let gz = 0;
      for (const s of list) { const r = await page.request.get(s.url); gz += zlib.gzipSync(await r.body(), {level: 6}).length; }
      const decoded = list.reduce((n, s) => n + s.decoded, 0);
      const version = await page.evaluate(() => Arcade.VERSION);
      const line = `${name} [${version}]: ${list.length} scripts, JS ${kb(decoded)} decoded / ≈ ${kb(gz)} gzipped; ` +
        `script time ${(m.ScriptDuration * 1000).toFixed(0)} ms, main thread busy ${(m.TaskDuration * 1000).toFixed(0)} ms; ready at ${(ready / 1000).toFixed(2)} s`;
      console.log(line);
      test.info().annotations.push({type: 'perf', description: line});
      await ctx.close();
    });
  }
});
