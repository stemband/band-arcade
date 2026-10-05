/* PHONE WIDTH: nothing on any page or window is wider than a phone screen. Students play at home on phones; a panel
   wider than the screen is simply cut off by its overlay (the page doesn't scroll and its buttons may still fit), so
   the smoke test never saw Showtime's 457 px story window on a 390 px phone.

   SIZES: phone portrait 390 × 844 (@quick: QUICK CHECK, Chromium), small Android 360 × 740 and iPhone SE 375 × 667
   (FULL run); every size in Chromium AND WebKit; isMobile, touch, deviceScaleFactor 2, reduced motion (panels land at
   once, never caught halfway through their slide-in).

   WHAT IT OPENS (one test per page and size, the page reused between its windows):
   - every page in pages.js (its PRESS START screen first, then its open() steps), plus the floor's windows that need
     their own saved data (EXTRA below: the UNLOCKED! card, the event panel, the weekly champion, SAVE YOUR PROGRESS,
     the app's install help and BRING YOUR PROGRESS, Create Your Player, the floor's PRESS START);
   - every window the page can show, the REAL way where a button or demo hook exists (WINDOWS below: Settings, the
     Locker, the avatar creator, the avatar code, Backup Code, the Prize Counter's card and code, the leaderboard, the
     instrument check, a game's calibration / chart / garage / room check…);
   - every game: Level 1 the way `game starts` does (game-runs.spec.js), checking each window that opens on the way
     (intros, stories, "Turn on the microphone"), then PAUSE and SETTINGS from the pause menu;
   - THE RESULTS SCREEN (stars, score sheets, extras) and Endless GAME OVER: checked at these sizes at the end of every
     game run in game-runs.spec.js, where a real level has just filled them (no second run of each level here);
   - FALLBACK: every other .overlay / [role=dialog] in the page that is still closed is un-hidden directly, checked
     for its static layout and hidden again; the test's output lists those as "static only".
   Each window must pass helpers.js tooWide() (its exceptions and WIDE_OK are there), and its main button (the yellow
   .btn-primary, else its GO button, else its first button) must be reachable: scrolled into view it is fully on
   the screen and nothing covers its middle. See docs/engine/testing.md "PHONE WIDTH". */
const {test, expect} = require('@playwright/test');
const {prepare, device, tooWide, windowFits, PHONES, lastWeekKey} = require('./helpers');
const {PAGES} = require('./pages');
const {RUNS} = require('./games');

/** two animation frames: the layout after a click has settled (no sleeping) */
const frames = page => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const visible = page => async sel => page.locator(sel).first().isVisible().catch(() => false);

/** check the open window `sel` (helpers.js windowFits: tooWide inside it + its main button reachable), soft: every
    window of the page is reported. `how` = 'real' | 'static only' (a static window's buttons aren't wired up: its
    main button isn't checked). Returns the problems. */
async function checkWindow(page, info, label, sel, {main = null, how = 'real'} = {}) {
  const W = page.viewportSize().width;
  const bad = how === 'real' ? await windowFits(page, sel, {main}) : (await frames(page), await tooWide(page, {within: sel}));
  info.annotations.push({type: how, description: `${label} (${W} px)${bad.length ? ': TOO WIDE' : ''}`});
  if (bad.length) await page.screenshot({path: info.outputPath(`${label.replace(/[^\w]+/g, '-')}-${W}.png`)}).catch(() => {});
  expect.soft(bad, `${label} at ${W} px: too wide or its main button out of reach`).toEqual([]);
  await page.evaluate(sel => { const e = document.querySelector(sel); if (e) e.dataset.pwChecked = '1'; }, sel).catch(() => {});
  return bad;
}

/** the page itself (no window open) */
async function checkPage(page, info, label) {
  await frames(page);
  const bad = await tooWide(page);
  info.annotations.push({type: 'page', description: label});
  if (bad.length) await page.screenshot({path: info.outputPath(`${label.replace(/[^\w]+/g, '-')}-page.png`)}).catch(() => {});
  expect.soft(bad, `${label}: too wide`).toEqual([]);
}

/** FALLBACK: every closed .overlay / [role=dialog] nobody opened the real way: un-hidden, checked, hidden again */
async function checkStatic(page, info) {
  const left = await page.evaluate(() => [...document.querySelectorAll('.overlay, [role="dialog"]')]
    .filter(e => !e.dataset.pwChecked && !e.getClientRects().length && !e.closest('[data-pw-checked]') && !e.parentElement.closest('.overlay, [role="dialog"]'))
    .map((e, i) => { e.dataset.pwStatic = i; return [i, (e.id ? '#' + e.id : '') + '.' + [...e.classList].join('.')]; }));
  for (const [i, name] of left) {
    const sel = `[data-pw-static="${i}"]`;
    const shown = await page.evaluate(sel => {
      const e = document.querySelector(sel);
      e.dataset.pwWas = JSON.stringify([e.hidden, e.style.display, e.style.zIndex]);
      e.hidden = false; e.style.zIndex = 9999;
      if (!e.getClientRects().length) e.style.display = e.classList.contains('overlay') ? 'grid' : 'block';
      return e.getClientRects().length > 0;
    }, sel);
    if (shown) await checkWindow(page, info, `${name} (static only)`, sel, {how: 'static only'});
    await page.evaluate(sel => { const e = document.querySelector(sel), [h, d, z] = JSON.parse(e.dataset.pwWas); e.hidden = h; e.style.display = d; e.style.zIndex = z; }, sel);
  }
}

/** open a window the real way, check it, close it */
async function win(page, info, w) {
  await w.open(page);
  await expect(page.locator(w.sel).first(), `${w.name} opens`).toBeVisible();
  await checkWindow(page, info, w.name, w.sel, {main: w.main});
  if (w.close) await w.close(page);
  else await page.keyboard.press('Escape');
  if (w.gone !== false) await expect(page.locator(w.sel).filter({visible: true}), `${w.name} closes`).toHaveCount(0);
}

/* ---------- the windows each page opens the real way ---------- */
const click = sel => page => page.locator(sel).filter({visible: true}).first().click();
const clickAll = (...sels) => async page => { for (const s of sels) await click(s)(page); };
/** click `btn`, then wait for window `sel`, past a listening game's "Turn on the microphone" card on the way
    (?demo's button stands in for the microphone) */
const through = (btn, sel) => async page => {
  await click(btn)(page);
  await expect.poll(async () => {
    if (await visible(page)(sel)) return true;
    const g = page.locator('.overlay:has(#micGateTitle) [data-act=go]').filter({visible: true});
    if (await g.count()) await g.first().click();
    return false;
  }, {timeout: 15_000}).toBe(true);
};
/** Settings: the top bar's speaker button (.snd-open: every game's top bar and the floor's #soundCtl) */
const SETTINGS = {name: 'Settings', open: async page => { const b = page.locator('.snd-open').filter({visible: true}).first(); await b.click(); },
  sel: '#uiSettings', main: '#uiSettings [data-act=done]', close: click('#uiSettings [data-act=done]')};
const BADGE = '#avBadge .avb-btn';
const FLOOR = [
  SETTINGS,
  {name: 'Backup Code', open: clickAll('#soundCtl .snd-btn', '#uiSettings .bk-btn'), sel: '.bk-overlay', main: '.bk-overlay .bk-make',
    close: async page => { await click('.bk-close')(page); await click('#uiSettings [data-act=done]')(page); }},
  {name: 'the avatar badge menu', group: 'the avatar', open: click(BADGE), sel: '#avBadge .avb-menu', main: '#avBadge .avb-menu button', gone: false},
  {name: 'the Locker', group: 'the avatar', open: async page => { if (!await visible(page)('#avBadge .avb-menu')) await click(BADGE)(page); await click('#avBadge .avb-locker')(page); },
    sel: '#locker', main: '#lkDone', close: click('#lkDone')},
  {name: 'Share your avatar (avatar code)', group: 'the avatar creator and code', open: async page => { await click(BADGE)(page); await click('#avBadge .avb-share')(page); },
    sel: '.acode-ov', close: click('.acode-ov [data-close]')},
  {name: 'the avatar creator', group: 'the avatar creator and code', open: async page => { await click(BADGE)(page); await click('#avBadge .avb-edit')(page); },
    sel: '.av-creator', main: '.av-creator .avc-save', close: click('.av-creator .avc-cancel')},
  {name: 'the Prize Counter', group: 'the Prize Counter', open: click('#prizeSign'), sel: '#prizes', close: click('#prizes .pz-x')},
  {name: "the Prize Counter's prize card", group: 'the Prize Counter', open: async page => { await page.evaluate(() => Arcade.Tokens && Arcade.Tokens.add(2000)); await click('#prizeSign')(page); await click('#prizes .pz-wall .pz-prize')(page); },
    sel: '#pzCard', close: click('#pzCard [data-c=close]')},
  {name: "the Prize Counter's code", group: "the Prize Counter's code", open: async page => { if (!await visible(page)('#prizes')) await click('#prizeSign')(page); await click('#prizes .pz-codebtn')(page); }, sel: '.pz-code-ov',
    close: async page => { await click('.pz-code-ov [data-c=back]')(page); await click('#prizes .pz-x')(page); }},
  // phones: TUNE UP / LEADERBOARD move into the badge's menu (top-bar.spec.js)
  {name: 'the leaderboard', group: 'the leaderboard', open: async page => { if (await visible(page)('#lbBtn')) await click('#lbBtn')(page); else { await click(BADGE)(page); await click('#avBadge .avb-lb')(page); } },
    sel: '#lbView', close: click('#lbView .lb-x')},
];
const WINDOWS = {
  'lobby': FLOOR,
  // the instrument check: a snare player taps a game that doesn't suit the snare (top-bar.spec.js)
  'All Games': [{name: 'the instrument check (#fitDlg)', member: 'snare', open: click('#allGrid .gcard[data-game="scale-trainer"]'), sel: '#fitDlg', main: '#fitSwitch', close: click('#fitClose')}],
  'Choose Your Instrument': [{name: 'Backup Code (Choose Your Instrument)', open: click('#backupBtn'), sel: '.bk-overlay', main: '.bk-overlay .bk-make', close: click('.bk-close')}],
  'Note Checker (tool)': [SETTINGS,
    {name: 'the room check', open: async page => { await page.evaluate(() => Arcade.RoomCheck.open()); }, sel: '.rc-ov:not(.rc-offer-ov)'},
    {name: 'the room check offer', open: page => page.evaluate(() => { Arcade.store.gameData('mic').offered = '2000-01-01'; Arcade.Pitch._room({loudAt: Date.now()}); Arcade.Pitch.demoReady = true; Arcade.requireMic(() => {}); }),
      sel: '.rc-offer-ov', close: click('.rc-offer-ov [data-act=later]')}],
  'Music Highway': [{name: 'the timing check (#calPanel)', open: through('#calBtn', '#calPanel'), sel: '#calPanel', main: '#calGo', close: click('#calSkip')},
    {name: 'the headphones check (#hpPanel)', open: through('#hpBtn', '#hpPanel'), sel: '#hpPanel', main: '#hpGo', close: click('#hpCancel')}],
  'Rhythm Dojo': [{name: 'the timing check (#calPanel)', open: through('#calBtn', '#calPanel'), sel: '#calPanel', main: '#calGo', close: click('#calSkip')}],
  'Button Masher': [{name: 'the fingering chart (#chart)', open: click('#chartBtn'), sel: '#chart', main: '#chartClose', close: click('#chartClose')}],
  'Lost Signal': [{name: 'the signal check (#check)', open: async page => { if (!await visible(page)('#check')) await click('#checkBtn')(page); }, sel: '#check', main: '#checkPlay', close: click('#checkSkip')}],
  // the avatar badge's menu in a game's top bar (phones: it spans the screen)
  'Ghost Notes': [{name: "the avatar badge menu (a game's top bar)", open: click('.avb .avb-btn'), sel: '.avb .avb-menu', main: '.avb .avb-menu button', gone: false}],
  'Showtime Malfunction': [{name: 'the story (#story)', open: click('#storyBtn'), sel: '#story', main: '#storyGo', close: click('#storyGo')},
    {name: 'the Malfunction Files (#files)', open: click('#filesBtn'), sel: '#files', main: '#filesClose', close: click('#filesClose')}],
  'Sustain Speedway': [{name: 'the garage', open: click('#garageBtn'), sel: '.sw-garage-ov', main: '#gDone', close: click('#gDone')}],
  'Arcade Quest': [{name: "Arcade Quest's band", open: questPanel(() => Arcade.Quest.talk.band()), sel: '.q-overlay', close: closeQuest},
    {name: "Arcade Quest's charms", open: questPanel(() => Arcade.Quest.talk.charms()), sel: '.q-overlay', close: closeQuest},
    {name: "Arcade Quest's save code", open: questPanel(() => { const Q = Arcade.Quest; Q.save.get(); Q.save.write(); Q.talk.showCode(); }), sel: '.q-overlay', close: closeQuest}],
};
function questPanel(fn) {
  return async page => {
    await page.waitForFunction(() => window.Arcade && Arcade.Quest && Arcade.Quest.talk);
    await page.evaluate(src => { (0, eval)('(' + src + ')')(); }, fn.toString());     // (never waits for the panel's promise)
    await expect.poll(async () => { if (await page.locator('.q-wpanel .q-btn').count()) return true; await page.keyboard.press('Enter'); return false; }, {timeout: 15_000}).toBe(true);
  };
}
function closeQuest(page) { return page.evaluate(() => document.querySelectorAll('.q-wpanel').forEach(p => p.closest('.q-overlay').remove())); }

/* ---------- the floor's windows that need their own saved data ---------- */
const WEEK = lastWeekKey();
const today = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const EXTRA = [
  {name: "the floor's PRESS START", url: 'index.html', visit: false, sel: '#pressStart', main: '#pressStart'},
  {name: 'UNLOCKED! (the lobby queue)', url: 'index.html?demo&nostart', store: device('trumpet', {avatarOffered: true, items: {owned: {'effect:spookyglow': true}}}),
    sel: '.sk-catchup', main: '.sk-catchup .sk-u-equip'},
  {name: 'the seasonal event panel', url: 'index.html?demo&nostart&season=spooky&today=2026-10-15',
    store: device('trumpet', {avatarOffered: true, gameData: {seasons: {claimed: {'spooky@2026-10-01': 1}}}}),
    open: async page => { await page.waitForFunction(() => Arcade.SeasonLobby); await closeCatchup(page); await click('.ev-banner')(page); }, sel: '.ev-overlay'},
  {name: 'the weekly champion', url: 'index.html?nostart',
    store: device('trumpet', {avatarOffered: true, gameData: {leaderboard: {grade: 7, on: true, pid: 'abc123' + 'x'.repeat(18), champCheckedWeek: WEEK, awards: {[WEEK]: {stars: {value: 9, claimed: false}}}}}}),
    sel: '.ch-ov', main: '.ch-ov .ch-claim'},
  {name: 'SAVE YOUR PROGRESS', url: 'index.html?demo&nostart&today=2026-10-01',
    store: device('trumpet', {avatarOffered: true, games: {'note-storm': {zz: {1: {stars: 3, best: 100}, 2: {stars: 3, best: 100}, 3: {stars: 3, best: 100}, 4: {stars: 3, best: 100}}}}, activity: {'2026-10-01': {s: 1, p: 1}}}),
    sel: '#saveNudge .bn-card', main: '#saveNudge .bn-save'},
  {name: 'Create Your Player (the offer)', url: 'index.html?game=ghost-notes&demo&nostart', store: device('trumpet'), sel: '.avc-offer', main: '.avc-offer [data-yes]'},
  // Tune Up's UNLOCKED! card: the 5th full HOLD IT ring of the day (tuneup.spec.js)
  {name: "Tune Up's reward (the Golden Tuning Fork)", url: 'note-checker/index.html?demo&nostart&tool=tuner', store: device('trumpet', {gameData: {tuneup: {holds: {[today()]: 4}}}}),
    open: async page => {
      await expect.poll(async () => {
        const g = page.locator('.overlay:has(#micGateTitle) [data-act=go]').filter({visible: true});
        if (await g.count()) await g.first().click();
        return page.evaluate(() => { const T = Arcade.TuneUp.tuner; if (T.state().filled) { Arcade.Pitch.demoNote = null; return true; } Arcade.Pitch.demoNote = T.state().target + .02; return false; });
      }, {timeout: 20_000}).toBe(true);
    }, sel: '.tu-reward-ov', main: '.tu-reward-ov .sk-u-equip'},
  {name: 'INSTALL THE APP', url: 'index.html', install: true, open: clickAll('#soundCtl .snd-btn', '.app-install'), sel: '.app-overlay', main: '.app-panel .app-close'},
  {name: 'BRING YOUR PROGRESS', url: 'index.html?standalone', store: null, visit: false, open: click('#pressStart'), sel: '.app-overlay.app-welcome', main: '.app-welcome .app-restore'},
];
/** the lobby queue's UNLOCKED! card (if it has one) out of the way */
async function closeCatchup(page) {
  await expect.poll(() => page.evaluate(() => { const s = Arcade.Lobby.queue.state(); return s.current === 'unlocked' || !s.waiting.includes('unlocked'); })).toBe(true);
  const ok = page.locator('.sk-catchup [data-close]');
  if (await ok.count()) await ok.click();
}

/* ---------- a game's Level 1: the windows on the way in, PAUSE, SETTINGS, and the windows a level opens ---------- */
const IN_LEVEL = {
  'blocktave': [{name: "Blocktave's inventory (#inv)", open: click('#invBtn'), sel: '#inv', close: click('#invClose')},
    {name: "Blocktave's crafting (#craft)", open: click('#craftBtn'), sel: '#craft', main: '#perform', close: click('#craftClose')}],
};
const LEAVE = ['results', 'uiPause', 'uiSettings', 'uiConfirm', 'ending', 'finale', 'files'];
async function level(page, info, R) {
  if (R.setup) await R.setup(page);
  if (R.start) await R.start(page);
  else { await page.locator('.ls-card:not(.ls-endless)').first().click(); await page.locator('.ls-start').click(); }
  const seen = new Set();
  await expect.poll(async () => {
    // a window on the way in (an intro, a story, "Turn on the microphone"): checked once, then its main button
    const ov = await page.evaluate(leave => {
      const o = [...document.querySelectorAll('.overlay')].find(o => !o.hidden && !leave.includes(o.id) && o.getClientRects().length && getComputedStyle(o).display !== 'none');
      if (!o) return null;
      o.dataset.pwWay = o.dataset.pwWay || String(Math.random()).slice(2, 8);
      return [o.dataset.pwWay, o.id || o.querySelector('[id$=Title]') && o.querySelector('[id$=Title]').id || o.className];
    }, LEAVE);
    if (ov) {
      const sel = `[data-pw-way="${ov[0]}"]`;
      if (!seen.has(ov[1])) { seen.add(ov[1]); await checkWindow(page, info, `on the way into Level 1: ${ov[1]}`, sel); }
      await page.locator(`${sel} [data-act="go"], ${sel} .btn-primary, ${sel} button.btn`).filter({visible: true}).first().click().catch(() => {});
      return false;
    }
    if (await page.locator('#uiPauseBtn').isVisible().catch(() => false)) return true;
    if (typeof R.play === 'function') await R.play(page);
    return false;
  }, {message: `${R.name}: the level never started`, timeout: 30_000, intervals: [100, 250, 500]}).toBe(true);
  // THE PLAY SCREEN itself (a wide canvas that can't work in portrait goes in WIDE_OK with its reason)
  await checkPage(page, info, `${R.name}: the play screen`);
  await page.locator('#uiPauseBtn').click();
  await expect(page.locator('#uiPause')).toBeVisible();
  await checkWindow(page, info, 'the pause menu', '#uiPause');
  await page.locator('#uiPause [data-act=settings]').click();
  await expect(page.locator('#uiSettings')).toBeVisible();
  await checkWindow(page, info, 'Settings (from the pause menu)', '#uiSettings', {main: '#uiSettings [data-act=done]'});
  await page.locator('#uiSettings [data-act=done]').click();
  if (!IN_LEVEL[R.id]) return;
  await page.locator('#uiPause [data-act=resume]').click();
  for (const x of IN_LEVEL[R.id]) await win(page, info, x);
}

/** the games and tools in ?demo (its button stands in for the microphone, so the windows behind it open; every level
    unlocked: the fullest level select); the floor and the docs as they are */
const demoUrl = u => /^(index\.html|docs\/)/.test(u) ? u : u.replace(/^([^?#]*)(\?[^#]*)?/, (m, a, q) => `${a}${q ? q + '&' : '?'}demo`);

/* ---------- the tests ---------- */
for (const [size, w, h] of PHONES) {
  test.describe(`phone width (${size})`, () => {
    test.use({viewport: {width: w, height: h}, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce'});
    const tag = size === '390 × 844' ? {tag: '@quick'} : {};

    for (const P of PAGES) {
      test(`phone width: ${P.name} and its windows (${size})`, tag, async ({page}, info) => {
        const extra = (WINDOWS[P.name] || []).filter(x => !x.group);
        const member = (extra.find(x => x.member) || {}).member || P.member;
        const watch = await prepare(page, member ? {store: device(member)} : undefined);
        const url = demoUrl(P.url);
        await page.goto(url, {waitUntil: 'networkidle'});
        // a game's PRESS START screen: the first window, checked, then tapped
        const ps = page.locator('.ps-screen');
        if (await ps.isVisible().catch(() => false)) {
          await checkWindow(page, info, 'PRESS START', '.ps-screen', {main: '.ps-screen'});
          await ps.tap({position: {x: 20, y: 200}});
          await expect(ps).toBeHidden();
        }
        // the leaderboard screen: on a phone its button is in the badge's menu
        if (P.open && P.name === 'leaderboard screen') await FLOOR.find(x => x.name === 'the leaderboard').open(page).then(() => page.locator('.lb-g').first().click());
        else if (P.open) await P.open(page);
        await checkPage(page, info, P.name);
        // the windows already open after loading (Choose Your Instrument's Create Your Player offer…)
        // (one this page's WINDOWS open and close the real way is left to them: Lost Signal's signal check)
        const open = await page.evaluate(own => [...document.querySelectorAll('.overlay, [role="dialog"]')].filter(e => e.getClientRects().length && !e.parentElement.closest('.overlay, [role="dialog"]') && !(own && e.matches(own)))
          .map((e, i) => { e.dataset.pwOpen = i; return [i, (e.id ? '#' + e.id : '') + '.' + [...e.classList].join('.')]; }), extra.map(x => x.sel).join(', '));
        for (const [i, name] of open) {
          const sel = `[data-pw-open="${i}"]`;
          await checkWindow(page, info, `open on arrival: ${name}`, sel);
          // closed with Esc, else its GO button ("Turn on the microphone": ?demo's button stands in for it; without
          // ?demo it shows its "no microphone" help: checked too), else its Cancel
          await page.keyboard.press('Escape');
          const go = page.locator(`${sel} [data-act="go"], ${sel} .btn-primary`).filter({visible: true}).first();
          if (await page.locator(sel).isVisible() && await go.count()) {
            await go.click();
            if (await page.locator(sel).isVisible()) {
              await checkWindow(page, info, `open on arrival: ${name}, after its button`, sel);
              await page.locator(`${sel} [data-act="cancel"], ${sel} .btn-secondary`).filter({visible: true}).first().click();
            }
          }
          await expect(page.locator(sel)).toBeHidden();
        }
        // a phone held upright: Chime Heist covers its page with "Turn your device sideways" (its play screen
        // needs the width); only its static windows can be checked behind that cover
        if (await page.locator('.rotate').isVisible().catch(() => false)) {
          info.annotations.push({type: 'covered', description: 'the page shows "Turn your device sideways" in portrait'});
          await checkStatic(page, info);
          watch.check(`on ${url}`);
          return;
        }
        for (const x of extra) await win(page, info, x);
        if (P.game && !P.game.tool && !extra.some(x => x === SETTINGS)) await win(page, info, SETTINGS);
        await checkStatic(page, info);
        watch.check(`on ${url}`);
      });
    }

    // a page's other windows, a group a test (the floor's: the avatar, its creator and code, the Prize Counter, its code, the leaderboard)
    for (const P of PAGES) {
      const groups = [...new Set((WINDOWS[P.name] || []).map(x => x.group).filter(Boolean))];
      for (const g of groups) {
        test(`phone width: ${P.name}: ${g} (${size})`, tag, async ({page}, info) => {
          const watch = await prepare(page, P.member ? {store: device(P.member)} : undefined);
          const url = demoUrl(P.url);
          await page.goto(url);
          for (const x of WINDOWS[P.name].filter(x => x.group === g)) await win(page, info, x);
          watch.check(`on ${url}`);
        });
      }
    }

    for (const X of EXTRA) {
      test(`phone width: ${X.name} (${size})`, tag, async ({page}, info) => {
        const watch = await prepare(page, {store: X.store === undefined ? device('trumpet', {avatarOffered: true}) : X.store, visit: X.visit !== false});
        if (X.install) await page.route('**/shared/teacher-settings.js*', async route => {
          const body = (await (await route.fetch()).text()).replace('SHOW_INSTALL_PROMPT: false', 'SHOW_INSTALL_PROMPT: true');
          route.fulfill({status: 200, contentType: 'text/javascript', body});
        });
        await page.goto(X.url);
        if (X.open) await X.open(page);
        await expect(page.locator(X.sel).first(), `${X.name} opens`).toBeVisible({timeout: 15_000});
        await checkWindow(page, info, X.name, X.sel, {main: X.main});
        watch.check(`on ${X.url}`);
      });
    }

    for (const R of RUNS.filter(r => r.pause !== false)) {
      test(`phone width: ${R.name}'s Level 1, its pause menu and settings (${size})`, tag, async ({page, browserName}, info) => {
        test.skip(R.skip === browserName, `not in ${browserName}`);
        const watch = await prepare(page, {store: device(R.member, typeof R.store === 'function' ? R.store(browserName) : R.store)});
        await page.goto(R.url || `${R.id}/index.html?demo&nostart`);
        test.skip(await page.locator('.rotate').isVisible().catch(() => false), 'the game asks for a phone turned sideways (its own cover)');
        await level(page, info, R);
        watch.check();
      });
    }
  });
}

