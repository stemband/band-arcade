/* SAVE YOUR PROGRESS (shared/backup-nudge.js, the lobby's banner; shared/backup.js, the panel): when it nudges (new
   stars, days with progress, a new player, the days before a break), when it never does (no stars, under the thresholds,
   a game, PRESS START, pick mode, right after saving), "Not now" and the weekly limit, what counts as saved (Copy, SAVE
   TO FILE, a restored code; never just opening the panel), restoring from the file, the iPad Home Screen tip, the
   layout and reduced motion. `?demo&nostart&today=YYYY-MM-DD` pretends a date (2026-10-05 is a Monday). */
const fs = require('fs');
const {test, expect} = require('@playwright/test');
const {prepare, device, offscreen, saved, VIEWPORTS} = require('./helpers');

const THU = '2026-10-01', MON = '2026-10-05', TUE = '2026-10-06', NEXT_MON = '2026-10-12';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const lobby = (page, day = MON, q = '') => page.goto(`index.html?demo&nostart&today=${day}${q}`);
const ready = page => page.waitForFunction(() => window.Arcade && Arcade.BackupNudge && document.querySelector('#zones .zsign'));
const banner = page => page.locator('#saveNudge .bn-card');
const status = page => page.evaluate(() => Arcade.BackupNudge.status());
const record = async page => (((await saved(page)).gameData || {})['backup-nudge']) || {};
/** n stars on the device (any game: the nudge counts every star, allStars('*')) */
function stars(n) {
  const lv = {};
  for (let i = 1; n > 0; i++) { const s = Math.min(3, n); lv[i] = {stars: s, best: 100}; n -= s; }
  return {'note-storm': {zz: lv}};          // an instrument nobody plays here: no UNLOCKED! cards in the way
}
/** a trumpet player with `total` stars, last saved on `savedAt` with `atSave` stars (null = never saved), and stars
    earned on each of `days` */
function player({total = 0, savedAt = null, atSave = 0, days = [], nudge = {}} = {}) {
  const activity = {};
  days.forEach(d => { activity[d] = {s: 1, p: 1}; });
  return device('trumpet', {games: stars(total), activity,
    gameData: {'backup-nudge': Object.assign(savedAt ? {savedAt, starsAtSave: atSave} : {}, nudge)}});
}
/** n different days with stars, counting back from `last` */
const daysBefore = (last, n) => Array.from({length: n}, (_, i) => { const d = new Date(last + 'T12:00:00'); d.setDate(d.getDate() - i); return d.toISOString().slice(0, 10); });
/** Copy works the same in every browser (the clipboard asks permission differently in each) */
const fakeClipboard = page => page.addInitScript(() => {
  try { Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async t => { window.__copied = t; }}}); } catch (e) { /* */ }
});
/** the backup panel's restore reloads the page: wait for the new save to land (as tests/save.spec.js does) */
const restoredInto = (page, member) => expect.poll(() => page.evaluate(() => { const s = localStorage.getItem('bandarcade.v1'); return s && JSON.parse(s).player; }).catch(() => null), {timeout: 15_000}).toBe(member);

test.describe('Save your progress: when it nudges', () => {
  test('no nudge with 0 stars, or under the thresholds', async ({page}) => {
    const watch = await prepare(page, {store: player()});
    await lobby(page); await ready(page);
    await page.waitForTimeout(300);
    await expect(banner(page)).toHaveCount(0);
    expect((await status(page)).why).toBe('nothing new');
    // a new player one star short of firstAfterStars (10)
    await page.evaluate(s => localStorage.setItem('bandarcade.v1', JSON.stringify(s)), player({total: 9}));
    await lobby(page); await ready(page);
    await page.waitForTimeout(300);
    await expect(banner(page)).toHaveCount(0);
    expect((await status(page)).why).toBe('under the thresholds');
    // saved before: 24 new stars over 13 days (one short of each)
    await page.evaluate(s => localStorage.setItem('bandarcade.v1', JSON.stringify(s)), player({total: 54, savedAt: '2026-09-01', atSave: 30, days: daysBefore(MON, 13)}));
    await lobby(page); await ready(page);
    await page.waitForTimeout(300);
    await expect(banner(page)).toHaveCount(0);
    expect(await status(page)).toMatchObject({newStars: 24, days: 13, show: false});
    expect((await record(page)).shown || []).toEqual([]);
    watch.check();
  });

  test('nudges at `stars` new stars since the last backup', async ({page}) => {
    const watch = await prepare(page, {store: player({total: 55, savedAt: '2026-09-28', atSave: 30, days: [MON]})});
    await lobby(page); await ready(page);
    await expect(banner(page)).toBeVisible();
    await expect(page.locator('#saveNudge .bn-msg')).toHaveText(/^Save your progress! You've earned 25 ★\s*(stars)? since your last backup\.$/);
    expect(await page.locator('#saveNudge .bn-msg [aria-hidden="true"]').textContent()).toBe('★');   // read aloud as "25 stars"
    await expect(page.locator('#saveNudge .bn-save')).toHaveText(/Save now/i);
    await expect(page.locator('#saveNudge .bn-later')).toHaveText(/Not now/i);
    await expect(page.locator('#saveNudge')).toHaveAttribute('role', 'status');
    expect((await record(page)).shown).toEqual([MON]);
    // it never takes the focus from the lobby
    expect(await page.evaluate(() => !!document.activeElement.closest('#saveNudge'))).toBe(false);
    watch.check();
  });

  test('nudges at `days` days with progress since the last backup', async ({page}) => {
    const watch = await prepare(page, {store: player({total: 30, savedAt: '2026-09-01', atSave: 30, days: daysBefore(MON, 14)})});
    await lobby(page); await ready(page);
    await expect(banner(page)).toContainText("You've played on 14 days since your last backup.");
    expect(await status(page)).toMatchObject({kind: 'stars', days: 14, newStars: 0});
    watch.check();
  });

  test('a new player at `firstAfterStars`', async ({page}) => {
    const watch = await prepare(page, {store: player({total: 10, days: [MON]})});
    await lobby(page); await ready(page);
    await expect(banner(page)).toContainText('Keep your stars safe: make a Backup Code.');
    expect((await status(page)).kind).toBe('new');
    // Chromium and WebKit on a computer: no iPad tip
    await expect(page.locator('#saveNudge .bn-tip')).toHaveCount(0);
    watch.check();
  });

  test('on a break date and the school day before, with any unsaved progress', async ({page}) => {
    const one = player({total: 31, savedAt: '2026-11-10', atSave: 30});
    const watch = await prepare(page, {store: one});
    await lobby(page, '2026-11-20'); await ready(page);
    for (const day of ['2026-11-20', '2026-11-19', '2026-12-17', '2026-12-18']) {      // Fri break, the Thursday before
      await page.evaluate(s => localStorage.setItem('bandarcade.v1', JSON.stringify(s)), one);
      await lobby(page, day); await ready(page);
      await expect(banner(page), day).toContainText('Break is coming! Save your progress so nothing gets lost.');
    }
    // the school day before a Monday break is the Friday before it
    expect(await page.evaluate(() => Arcade.BackupNudge.nextSchoolDay('2026-11-20'))).toBe('2026-11-23');
    // two days before: nothing (1 new star is under the thresholds)
    await page.evaluate(s => localStorage.setItem('bandarcade.v1', JSON.stringify(s)), one);
    await lobby(page, '2026-11-18'); await ready(page);
    await page.waitForTimeout(300);
    await expect(banner(page)).toHaveCount(0);
    // a break with nothing new since the last backup: nothing
    await page.evaluate(s => localStorage.setItem('bandarcade.v1', JSON.stringify(s)), player({total: 30, savedAt: '2026-11-10', atSave: 30}));
    await lobby(page, '2026-11-20'); await ready(page);
    await page.waitForTimeout(300);
    await expect(banner(page)).toHaveCount(0);
    watch.check();
  });
});

test.describe('Save your progress: never in the way', () => {
  test('not in a game, not on PRESS START, not in pick mode; then it shows in the lobby', async ({page}) => {
    const store = Object.assign(player({total: 40, days: [MON]}), {avatarOffered: true});     // no "Create your player?" in the way
    const watch = await prepare(page, {store, visit: false});
    // pick mode after PRESS START with an instrument saved = the teacher setting "ask every time" (shared/teacher-settings.js)
    await page.route(/shared\/teacher-settings\.js/, async route => {
      const r = await route.fetch();
      await route.fulfill({response: r, body: (await r.text()).replace('ASK_INSTRUMENT_EVERY_TIME: false', 'ASK_INSTRUMENT_EVERY_TIME: true')});
    });
    await page.goto(`ghost-notes/index.html?demo&today=${MON}`);
    await page.waitForFunction(() => window.Arcade && Arcade.store);
    await page.waitForTimeout(300);
    await expect(page.locator('.bn-card')).toHaveCount(0);
    await page.goto(`index.html?demo&today=${MON}`);
    await expect(page.locator('#pressStart')).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(banner(page)).toHaveCount(0);
    await page.locator('#pressStart').click();
    await expect(page.locator('#selectView')).toBeVisible();          // pick mode (CHOOSE YOUR INSTRUMENT)
    await page.waitForTimeout(1500);
    await expect(banner(page)).toHaveCount(0);
    expect((await record(page)).shown || []).toEqual([]);           // nothing counted while it couldn't be seen
    // pick mode's UNLOCKED! card (stars earned before) is a panel too: still no banner while it's open
    const card = page.locator('.sk-catchup');
    if (await card.isVisible()) { await expect(banner(page)).toHaveCount(0); await card.locator('[data-close]').click(); }
    await page.locator('#continueBtn').click();
    await expect(page.locator('#lobby')).toBeVisible();
    await expect(banner(page)).toBeVisible({timeout: 5000});
    watch.check();
  });

  test('"Not now" snoozes `snoozeDays`', async ({page}) => {
    const watch = await prepare(page, {store: player({total: 12, days: [THU]})});
    await lobby(page, THU); await ready(page);
    await page.locator('#saveNudge .bn-later').click();
    await expect(banner(page)).toHaveCount(0);
    expect((await record(page)).snoozeUntil).toBe(MON);              // Thursday + 4 days
    for (const day of [THU, '2026-10-02', '2026-10-04']) {
      await lobby(page, day); await ready(page);
      await page.waitForTimeout(300);
      await expect(banner(page), day).toHaveCount(0);
    }
    await lobby(page, MON); await ready(page);
    await expect(banner(page)).toBeVisible();
    watch.check();
  });

  test('at most `maxPerWeek` a week (weeks start Monday)', async ({page}) => {
    const watch = await prepare(page, {store: player({total: 12, days: [MON]})});
    await lobby(page, MON); await ready(page);
    await expect(banner(page)).toBeVisible();
    await page.reload(); await ready(page);
    await expect(banner(page)).toBeVisible();                        // the same day: still there until saved or "Not now"
    await lobby(page, TUE); await ready(page);
    await page.waitForTimeout(300);
    await expect(banner(page)).toHaveCount(0);
    expect((await status(page)).why).toBe('this week');
    await lobby(page, NEXT_MON); await ready(page);
    await expect(banner(page)).toBeVisible();
    expect((await record(page)).shown).toEqual([MON, NEXT_MON]);
    watch.check();
  });
});

test.describe('Save your progress: what counts as saved', () => {
  test('SAVE NOW opens the panel with the code ready; Done without copying is not saved; Copy is', {tag: '@quick'}, async ({page}) => {
    await fakeClipboard(page);
    const watch = await prepare(page, {store: player({total: 40, days: [MON]})});
    await lobby(page); await ready(page);
    await page.locator('#saveNudge .bn-save').click();
    const panel = page.locator('.bk-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.bk-last')).toHaveText('Never saved on this device');
    await expect(panel.locator('.bk-code')).toHaveValue(/^BKP/);
    await expect(panel.locator('.bk-copy')).toBeFocused();
    await expect(panel).toContainText('Where to keep it: Paste it into a Google Doc or an email to yourself on your school account.');
    // opening the panel (and making the code) without copying: not saved
    await panel.locator('.bk-close').click();
    expect((await record(page)).savedAt).toBeUndefined();
    await expect(banner(page)).toBeVisible();
    // Copy: saved, the banner goes, a toast says so
    await page.locator('#saveNudge .bn-save').click();
    await expect(panel.locator('.bk-code')).toHaveValue(/^BKP/);
    await panel.locator('.bk-copy').click();
    await expect(page.locator('.ui-toast')).toHaveText('Saved! Keep that code somewhere safe 💾');
    await expect(panel.locator('.bk-last')).toHaveText('Last saved: Oct 5');
    expect(await page.evaluate(() => window.__copied)).toMatch(/^BKP/);
    expect(await record(page)).toMatchObject({savedAt: MON, starsAtSave: 40});
    await panel.locator('.bk-close').click();
    await expect(banner(page)).toHaveCount(0);
    // right after saving: no nudge, today or tomorrow
    await lobby(page, TUE); await ready(page);
    await page.waitForTimeout(300);
    await expect(banner(page)).toHaveCount(0);
    expect((await status(page)).why).toBe('nothing new');
    watch.check();
  });

  test('SAVE TO FILE downloads a .txt with the code and marks it saved; restoring that file = typing the code', async ({page, browser}) => {
    const watch = await prepare(page, {store: player({total: 40, days: [MON]})});
    await lobby(page); await ready(page);
    await page.locator('#saveNudge .bn-save').click();
    const panel = page.locator('.bk-panel');
    await expect(panel.locator('.bk-code')).toHaveValue(/^BKP/);
    const code = await panel.locator('.bk-code').inputValue();
    const [dl] = await Promise.all([page.waitForEvent('download'), panel.locator('.bk-file').click()]);
    expect(dl.suggestedFilename()).toBe(`band-arcade-backup-${MON}.txt`);
    const file = await dl.path();
    const text = fs.readFileSync(file, 'utf8');
    expect(text.replace(/\s/g, '')).toContain(code.replace(/\s/g, ''));
    expect(text).toContain('Made: Monday, October 5, 2026');
    expect(text).toContain('Instrument: Trumpet');
    expect(text).toMatch(/1\. .+\r?\n2\. .+\r?\n3\. .+Restore/);
    expect(await page.evaluate(([t, c]) => Arcade.Backup.clean(Arcade.Backup.codeInFile(t)) === Arcade.Backup.clean(c), [text, code])).toBe(true);
    await expect(panel.locator('.bk-len')).toHaveText(/Downloaded!/);
    expect(await record(page)).toMatchObject({savedAt: MON, starsAtSave: 40});
    await panel.locator('.bk-close').click();
    await expect(banner(page)).toHaveCount(0);

    // a wiped device restores from the file (Open a backup file) and from the typed code: the same progress either way
    const results = [];
    for (const how of ['file', 'typed']) {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      const w = await prepare(p, {store: device('clarinet')});
      await lobby(p, TUE); await ready(p);
      await p.evaluate(() => Arcade.Backup.open());
      if (how === 'file') await p.locator('.bk-pick').setInputFiles(file);
      else { await p.locator('.bk-in').fill(code); await p.locator('.bk-restore').click(); }
      await p.locator('#uiConfirm [data-act=yes]').click();
      await restoredInto(p, 'trumpet');
      const s = await saved(p);
      results.push({games: s.games, nudge: s.gameData['backup-nudge']});
      w.check(how);
      await ctx.close();
    }
    expect(results[0].games).toEqual(results[1].games);
    expect(results[0].games['note-storm'].zz['1']).toEqual({stars: 3, best: 100});
    // a restored code counts as just saved: today, with the star total
    expect(results[0].nudge).toMatchObject({savedAt: TUE, starsAtSave: 40});
    expect(results[1].nudge).toMatchObject({savedAt: TUE, starsAtSave: 40});
    watch.check();
  });

  test('a file that holds no code gets the same message as a typo', async ({page}, info) => {
    const watch = await prepare(page, {store: player({total: 3})});
    await lobby(page); await ready(page);
    await page.evaluate(() => Arcade.Backup.open());
    const f = info.outputPath('not-a-backup.txt');
    fs.writeFileSync(f, 'my grocery list');
    await page.locator('.bk-pick').setInputFiles(f);
    await expect(page.locator('.bk-msg')).toHaveText("That code doesn't look right. Check each letter.");
    expect((await record(page)).savedAt).toBeUndefined();
    watch.check();
  });
});

test.describe('Save your progress: the iPad Home Screen tip', () => {
  test.use({userAgent: IPAD, hasTouch: true});
  test('iPad, not installed: the new-player and break nudges add the tip (SHOW ME HOW = the install steps); installed: no tip', async ({page}) => {
    const watch = await prepare(page, {store: player({total: 12, days: [MON]})});
    await lobby(page); await ready(page);
    await expect(banner(page)).toBeVisible();
    await expect(page.locator('#saveNudge .bn-tip')).toHaveText('Tip: Add Band Arcade to your Home Screen so iPad keeps your progress.');
    await page.locator('#saveNudge .bn-how').click();
    await expect(page.locator('.app-panel')).toContainText('Add to Home Screen');
    await page.locator('.app-panel .app-close').click();
    // the regular "N stars" nudge: no tip
    await page.evaluate(s => localStorage.setItem('bandarcade.v1', JSON.stringify(s)), player({total: 60, savedAt: '2026-09-28', atSave: 30, days: [MON]}));
    await lobby(page); await ready(page);
    await expect(banner(page)).toContainText("You've earned 30");
    await expect(page.locator('#saveNudge .bn-tip')).toHaveCount(0);
    // the installed app (standalone): no tip
    await page.evaluate(s => localStorage.setItem('bandarcade.v1', JSON.stringify(s)), player({total: 12, days: [MON]}));
    await lobby(page, MON, '&standalone'); await ready(page);
    await expect(banner(page)).toBeVisible();
    await expect(page.locator('#saveNudge .bn-tip')).toHaveCount(0);
    watch.check();
  });
});

test.describe('Save your progress: the banner', () => {
  test("fits at phone, iPad and Chromebook sizes, under Today's Practice, CONTINUE and ASSIGNED", async ({page}) => {
    const store = player({total: 12, days: [MON]});
    store.gameData.floor = {last: 'note-storm'};
    const watch = await prepare(page, {store});
    for (const [name, size] of Object.entries(Object.assign({phone: {width: 390, height: 844}}, VIEWPORTS))) {
      await page.setViewportSize(size);
      await lobby(page); await ready(page);
      await expect(banner(page), name).toBeVisible();
      const box = await page.evaluate(() => {
        const n = document.getElementById('saveNudge'), r = n.querySelector('.bn-card').getBoundingClientRect();
        const cards = document.getElementById('lobbyCards'), z = document.getElementById('zones').getBoundingClientRect();
        const btns = [...n.querySelectorAll('button')].map(b => b.getBoundingClientRect());
        return {after: cards.nextElementSibling === n, below: r.top >= cards.getBoundingClientRect().bottom - 1, aboveZones: r.bottom <= z.top + 1,
          practice: !!cards.querySelector('#practiceCard'), cont: !!cards.querySelector('.lc-continue'), assigned: !!cards.querySelector('.lc-assigned'),
          left: r.left, right: r.right, W: innerWidth, minH: Math.min(...btns.map(b => b.height)),
          btnsIn: btns.every(b => b.left >= r.left - 1 && b.right <= r.right + 1), h: r.height};
      });
      expect(box, name).toMatchObject({after: true, below: true, aboveZones: true, practice: true, cont: true, assigned: true, btnsIn: true});
      expect(box.left, name).toBeGreaterThanOrEqual(-1);
      expect(box.right, name).toBeLessThanOrEqual(box.W + 1);
      expect(box.minH, name).toBeGreaterThanOrEqual(48);
      if (name !== 'phone') expect(box.h, `${name}: slim`).toBeLessThan(110);
      expect(await offscreen(page), name).toEqual([]);
    }
    // the buttons are reachable with the keyboard
    await page.locator('#saveNudge .bn-save').focus();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement.classList.contains('bn-later'))).toBe(true);
    watch.check();
  });

  test('it fades in once; no motion under reduced motion', async ({page}) => {
    const watch = await prepare(page, {store: player({total: 12, days: [MON]})});
    await lobby(page); await ready(page);
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#saveNudge .bn-card')).animationName)).toBe('bn-fade');
    // drawn again (the lobby redraws): no second fade
    await page.evaluate(() => { document.getElementById('saveNudge').querySelector('.bn-card').dataset.kind = 'x'; Arcade.BackupNudge.refresh(); });
    await expect(page.locator('#saveNudge .bn-card')).not.toHaveClass(/bn-in/);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.reload(); await ready(page);
    await expect(banner(page)).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('#saveNudge .bn-card')).animationName)).toBe('none');
    watch.check();
  });
});
