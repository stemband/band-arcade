/* THE APP (shared/app.js, sw.js, manifest.webmanifest): installable, offline, never a stale or mixed version.
   The offline copy exists only on the DEPLOYED site, so the service-worker tests make two deployed copies of the site
   in a temporary folder (tools/stamp-version.py with the versions 'testv1' and 'testv2', exactly as the Pages deploy
   does), serve them from one address, and switch that address from the first to the second (a new deploy).
   Chromium only for those (Playwright's WebKit runs no service workers); the rest runs in both. */
const {test, expect} = require('@playwright/test');
const {spawn, execFileSync} = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {ROOT, prepare, device, LB_URL} = require('./helpers');

/* ---------- the app's parts in the repository's own ('dev') copy ---------- */
test.describe('app (dev copy)', () => {
  test('every page gets the manifest, the Home Screen icon and the iPad app tags; the icons exist', {tag: '@quick'}, async ({page, request}) => {
    const watch = await prepare(page);
    for (const p of ['index.html', 'ghost-notes/index.html', 'arcade-quest/index.html?nostart', 'note-checker/index.html']) {
      await page.goto(p);
      await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
      await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
      await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveCount(1);
      await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'black-translucent');
      expect(await page.evaluate(() => Arcade.App && Arcade.App.state().registered), 'no service worker in dev').toBe(false);
    }
    const man = await (await request.get('manifest.webmanifest')).json();
    expect(man).toMatchObject({name: 'Band Arcade', short_name: 'Band Arcade', display: 'standalone', start_url: './index.html', scope: './'});
    const icons = man.icons.map(i => i.src).concat('shared/app/apple-touch-icon.png');
    expect(man.icons.some(i => i.purpose === 'maskable')).toBe(true);
    for (const src of icons) expect((await request.get(src)).status(), src).toBe(200);
    watch.check();
  });

  test('the avatar card (shown inside other sites) gets no app tags', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('avatar-card/index.html');
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
    expect(await page.evaluate(() => !!(window.Arcade && Arcade.App))).toBe(false);
    watch.check();
  });

  test('INSTALL THE APP: hidden unless the teacher setting is on; then it shows the steps', async ({page}) => {
    const watch = await prepare(page);
    await page.goto('index.html');
    await expect(page.locator('.app-install')).toHaveCount(0);
    await page.route('**/shared/teacher-settings.js*', async route => {
      const body = (await (await route.fetch()).text()).replace('SHOW_INSTALL_PROMPT: false', 'SHOW_INSTALL_PROMPT: true');
      route.fulfill({status: 200, contentType: 'text/javascript', body});
    });
    await page.goto('index.html');
    await page.locator('#soundCtl .snd-btn').first().click();
    await page.locator('.app-install').click();
    await expect(page.locator('.app-panel')).toContainText('Install Band Arcade');
    await page.locator('.app-panel .app-close').click();
    await expect(page.locator('.app-panel')).toHaveCount(0);
    watch.check();
  });

  test('the app’s first launch: BRING YOUR PROGRESS takes a Backup Code, START FRESH goes on', async ({browser}) => {
    // a backup code from a device with progress
    const src = await browser.newPage();
    await prepare(src, {store: device('clarinet', {games: {'ghost-notes': {bb: {1: {stars: 3, best: 100}}}}})});
    await src.goto('index.html');
    const code = await src.evaluate(() => Arcade.Backup.fullEncode());
    await src.close();

    // a fresh Home Screen app (nothing saved): the panel comes after PRESS START, before CHOOSE YOUR INSTRUMENT
    const page = await browser.newPage();
    const watch = await prepare(page, {store: null, visit: false});
    await page.goto('index.html?standalone');
    await page.locator('#pressStart').click();
    await expect(page.locator('.app-welcome .app-panel')).toBeVisible();
    await page.locator('#appCode').fill('NOT A CODE');
    await page.locator('.app-restore').click();
    await expect(page.locator('.app-msg')).toContainText("doesn't look right");
    await page.locator('#appCode').fill(code);
    const reloaded = page.waitForEvent('load');                             // RESTORE saves, then reloads the page (0.7 s)
    await page.locator('.app-restore').click();
    await reloaded;
    await expect.poll(() => page.evaluate(() => window.Arcade && Arcade.store && Arcade.store.player), {timeout: 10_000}).toBe('clarinet');
    expect(await page.evaluate(() => Arcade.store.allStars('*'))).toBe(3);
    await expect(page.locator('.app-welcome')).toHaveCount(0);           // asked once
    watch.check();
    await page.close();

    const fresh = await browser.newPage();
    const watch2 = await prepare(fresh, {store: null, visit: false});
    await fresh.goto('index.html?standalone');
    await fresh.locator('#pressStart').click();
    await fresh.locator('.app-fresh').click();
    await expect(fresh.locator('#selectView')).toBeVisible();                // CHOOSE YOUR INSTRUMENT, as without the app
    await fresh.reload();
    await expect(fresh.locator('.app-welcome')).toHaveCount(0);
    watch2.check();
    await fresh.close();
  });

  test('in the app, a microphone that won’t start suggests the browser', async ({page}) => {
    const watch = await prepare(page);
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    });
    await page.goto('ghost-notes/index.html?standalone&nostart');
    await page.evaluate(() => Arcade.requireMic(() => {}));
    await page.locator('#micGateTitle ~ .acts [data-act="go"]').click();
    await expect(page.locator('.overlay .err')).toContainText('instead');
    watch.check();
  });
});

/* ---------- the offline copy (a deployed copy of the site) ---------- */
test.describe('app (deployed copy: the service worker)', () => {
  test.describe.configure({mode: 'serial'});
  test.use({serviceWorkers: 'allow'});
  test.skip(({browserName}) => browserName !== 'chromium', 'Playwright’s WebKit runs no service workers');

  let tmp, server, base;
  const copy = (version, mark) => {
    const dir = path.join(tmp, version);
    fs.cpSync(ROOT, dir, {recursive: true, filter: s => !/[\\/](\.git|tests|node_modules)$/.test(s) && !/[\\/]shared[\\/]sounds$/.test(s)});
    fs.symlinkSync(path.join(ROOT, 'shared/sounds'), path.join(dir, 'shared/sounds'));
    if (mark) fs.appendFileSync(path.join(dir, 'shared/games.js'), `\nwindow.__deployMark = '${mark}';\n`);
    execFileSync('python3', [path.join(dir, 'tools/stamp-version.py'), version], {stdio: 'pipe'});
    // python's test server answers "not modified" by the second: the later deploy's files get later times (GitHub
    // Pages compares contents: ETags)
    const later = new Date(Date.now() + 60_000 * (version === 'testv2' ? 2 : 0));
    const touch = d => fs.readdirSync(d, {withFileTypes: true}).forEach(e => {
      const f = path.join(d, e.name);
      if (e.isSymbolicLink()) return;
      if (e.isDirectory()) touch(f); else fs.utimesSync(f, later, later);
    });
    touch(dir);
    return dir;
  };
  const serve = version => { const link = path.join(tmp, 'site'); try { fs.unlinkSync(link); } catch (e) { /* first time */ } fs.symlinkSync(path.join(tmp, version), link); };

  let port;
  const start = async () => {
    server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', path.join(tmp, 'site')], {stdio: 'pipe'});
    server.stdout.resume(); server.stderr.resume();                  // (its request log is not needed)
    for (let i = 0; i < 50; i++) { try { await fetch(base + 'index.html'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  };
  /** really offline: the site's server is gone (the browser's offline switch doesn't reach a service worker) */
  const stop = async ctx => {
    if (server) { server.kill(); server = null; }
    await new Promise(r => setTimeout(r, 300));
    if (ctx) await ctx.setOffline(true);
  };
  test.beforeAll(async ({}, info) => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arcade-app-'));
    copy('testv1', 'v1'); copy('testv2', 'v2'); serve('testv1');
    port = 8390 + info.workerIndex;
    base = `http://127.0.0.1:${port}/`;
    await start();
  });
  test.afterAll(() => { if (server) server.kill(); if (tmp) fs.rmSync(tmp, {recursive: true, force: true}); });

  /** a browser with the trumpet saved (games open straight away) */
  const newCtx = async browser => {
    const ctx = await browser.newContext({serviceWorkers: 'allow'});
    await ctx.addInitScript(store => { try { if (!localStorage.getItem('bandarcade.v1')) localStorage.setItem('bandarcade.v1', JSON.stringify(store)); } catch (e) { /* offline.html */ } }, device());
    return ctx;
  };
  const ready = page => page.waitForFunction(() => navigator.serviceWorker.controller && navigator.serviceWorker.controller.state === 'activated', null, {timeout: 60_000});
  const cacheInfo = page => page.evaluate(async () => {
    const names = await caches.keys(), out = {names, keys: []};
    const c = names.length ? await caches.open(names[names.length - 1]) : null;
    if (c) out.keys = (await c.keys()).map(r => new URL(r.url).pathname);
    return out;
  });

  test('installs, stores the pages and engine, and plays offline', async ({browser}) => {
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + 'index.html?demo&nostart');
    await ready(page);
    const info = await cacheInfo(page);
    expect(info.names).toEqual(['band-arcade-testv1']);
    for (const f of ['/index.html', '/ghost-notes/index.html', '/shared/pitch.js', '/shared/theme.css', '/offline.html', '/manifest.webmanifest']) expect(info.keys, f).toContain(f);
    expect(info.keys.some(k => k.startsWith('/shared/sounds/')), 'sounds wait until they are used').toBe(false);

    await stop(ctx);
    await page.goto(base + 'ghost-notes/index.html?demo&nostart');
    await expect(page.locator('#topbar')).toBeVisible();
    expect(await page.evaluate(() => [Arcade.VERSION, !!Arcade.requireInstrument, window.__deployMark])).toEqual(['testv1', true, 'v1']);
    await page.goto(base + 'index.html?demo&nostart');
    await expect(page.locator('.fbar')).toBeVisible();
    if (LB_URL) {                                                    // the scoreboard is another site: offline = "taking a break"
      await page.evaluate(() => Arcade.store.gameData('leaderboard').grade = 6);
      await page.locator('#lbBtn').click();
      await expect(page.locator('.lb-view')).toContainText('taking a break');
    }
    await page.goto(base + 'never-made/index.html');
    await expect(page.locator('h1')).toHaveText("You're offline");
    await expect(page.locator('body')).toContainText("Games you've played before still work!");
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('a new version: banner on an older open page, never a mixed page, old caches deleted', async ({browser}) => {
    serve('testv1');
    if (!server) await start();
    const ctx = await newCtx(browser);
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + 'index.html?demo&nostart');
    await ready(page);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());   // the load's own check is done

    serve('testv2');                                                    // a new deploy
    // a file this old page loads now still comes from ITS version
    expect(await page.evaluate(async () => (await (await fetch(Arcade.v(Arcade.ROOT + 'shared/games.js'))).text()).includes("__deployMark = 'v1'"))).toBe(true);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());   // (the app also checks on its own)
    await expect(page.locator('.app-update')).toHaveText('New version ready — tap to update', {timeout: 60_000});

    // a page opened now is entirely the new version (pages are always checked with the server)
    const other = await ctx.newPage();
    await other.goto(base + 'ghost-notes/index.html?demo&nostart');
    expect(await other.evaluate(() => [Arcade.VERSION, Arcade.pageVersion, window.__deployMark])).toEqual(['testv2', 'testv2', 'v2']);
    const srcs = await other.evaluate(() => [...document.querySelectorAll('script[src^="../"], link[rel=stylesheet][href^="../"]')].map(e => e.getAttribute('src') || e.getAttribute('href')).filter(s => !s.includes('version.js?t=')));   // (version.js is always fetched fresh)
    expect(srcs.length).toBeGreaterThan(5);
    for (const s of srcs) expect(s, 'every file of the page is the new version').toMatch(/\?v=testv2$/);
    await expect(other.locator('.app-update')).toHaveCount(0);
    await other.close();

    await page.locator('.app-update').click();                          // the tap: the new version takes over, reload
    await page.waitForFunction(() => window.Arcade && Arcade.VERSION === 'testv2' && window.__deployMark === 'v2', null, {timeout: 30_000});
    await expect.poll(async () => (await cacheInfo(page)).names, {timeout: 30_000}).toEqual(['band-arcade-testv2']);
    const info = await cacheInfo(page);
    expect(info.keys).toContain('/shared/pitch.js');
    await expect(page.locator('.app-update')).toHaveCount(0);

    await stop(ctx);                                                    // and the new version works offline
    await page.goto(base + 'note-storm/index.html?demo&nostart');
    expect(await page.evaluate(() => [Arcade.VERSION, window.__deployMark])).toEqual(['testv2', 'v2']);
    expect(errors).toEqual([]);
    await ctx.close();
  });
});
