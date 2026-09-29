/* THE SOUND BOARD's collapsible sections (sound-board/index.html): every section a <details> that starts collapsed,
   its summary with the count and a warning badge, EXPAND ALL / COLLAPSE ALL, the search (opens the matching sections,
   hides the rest, "No sounds match", clearing it restores what was open), open sections remembered for the session,
   and sound-board/index.html#<sound> opening that sound's row. */
const {test, expect} = require('@playwright/test');
const {prepare, device} = require('./helpers');

const st = page => page.evaluate(() => Arcade.SoundBoard.state());
async function open(page, hash = '') {
  await page.goto('sound-board/index.html' + hash);
  await page.waitForFunction(() => window.Arcade && Arcade.SoundBoard);
}

test.describe('sound board sections', () => {
  test('every section starts collapsed, with its sound count; each summary is a real toggle', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await open(page);
    const s = await st(page);
    expect(s.sections.slice(0, 2)).toEqual(['music', 'rooms']);
    expect(s.sections.length).toBeGreaterThan(8);
    expect(s.open).toEqual([]);
    expect(await page.locator('.sb-sec .sb-row:visible').count()).toBe(0);
    const sum = page.locator('.sb-sec[data-sec="showtime-malfunction"] > summary');
    await expect(sum).toContainText(/Showtime Malfunction/i);
    await expect(sum.locator('.sb-count')).toHaveText(/^· \d+ sounds$/);
    // keyboard: focus the summary, Enter opens it
    await sum.focus(); await page.keyboard.press('Enter');
    expect((await st(page)).open).toEqual(['showtime-malfunction']);
    await expect(page.locator('.sb-sec[data-sec="showtime-malfunction"] .sb-row').first()).toBeVisible();
    // the warning badge: from the rows' statuses (the same classes RELOAD ALL SOUNDS sets): 2 missing, 1 too long
    await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.sb-sec[data-sec="showtime-malfunction"] [data-status]')];
      rows.forEach((el, i) => { el.className = 'sb-status ' + (i < 2 ? 'generated' : i === 2 ? 'file too-long' : 'file'); });
      Arcade.SoundBoard.badges();
    });
    await expect(sum.locator('.sb-badge')).toHaveText('⚠ 2 missing, 1 too long');
    watch.check();
  });

  test('EXPAND ALL / COLLAPSE ALL; the open sections are remembered for the session', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await open(page);
    await page.locator('#openAll').click();
    let s = await st(page);
    expect(s.open).toEqual(s.sections);
    await page.locator('#closeAll').click();
    expect((await st(page)).open).toEqual([]);
    await page.locator('.sb-sec[data-sec="music"] > summary').click();
    await page.locator('.sb-sec[data-sec="rhythm-dojo"] > summary').click();
    await page.reload();
    await page.waitForFunction(() => window.Arcade && Arcade.SoundBoard);
    expect((await st(page)).open.sort()).toEqual(['music', 'rhythm-dojo']);
    watch.check();
  });

  test('SEARCH opens the matching sections, hides the rest, says when nothing matches, and clearing restores', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await open(page);
    await page.locator('.sb-sec[data-sec="music"] > summary').click();
    await page.locator('#search').fill('scare');
    let s = await st(page);
    expect(s.open).toContain('showtime-malfunction');
    expect(s.open).not.toContain('music');
    expect(s.hidden).toContain('music');
    await expect(page.locator('.sb-row[data-n="scare-sting-1"]')).toBeVisible();
    expect(await page.locator('.sb-sec[data-sec="showtime-malfunction"] .sb-row:visible').evaluateAll(rs => rs.every(r => r.dataset.q.includes('scare')))).toBe(true);
    await expect(page.locator('.sb-sec[data-sec="showtime-malfunction"] .sb-count')).toHaveText(/^· \d+ of \d+ sounds$/);
    // by what it's for: "countdown"
    await page.locator('#search').fill('countdown');
    s = await st(page);
    expect(s.open.length).toBeGreaterThan(0);
    expect(s.none).toBe(false);
    // nothing matches
    await page.locator('#search').fill('zzqqxx');
    s = await st(page);
    expect([s.open, s.none]).toEqual([[], true]);
    await expect(page.locator('#none')).toHaveText('No sounds match');
    // cleared: back to what was open before, everything shown
    await page.locator('#search').fill('');
    s = await st(page);
    expect([s.open, s.hidden, s.none]).toEqual([['music'], [], false]);
    watch.check();
  });

  test('sound-board/index.html#<sound> opens its section and scrolls to its row, highlighted', async ({page}) => {
    const watch = await prepare(page, {store: device('trumpet')});
    await open(page, '#scare-sting-2');
    expect((await st(page)).open).toEqual(['showtime-malfunction']);
    const row = page.locator('#groups .sb-row[data-n="scare-sting-2"]');
    await expect(row).toBeInViewport();
    expect((await st(page)).hit).toBe('scare-sting-2');
    // a hash change on the page works too
    await page.evaluate(() => { location.hash = '#rd-woodblock'; });
    await expect(page.locator('#groups .sb-row[data-n="rd-woodblock"]')).toBeInViewport();
    expect((await st(page)).open).toContain('rhythm-dojo');
    watch.check();
  });
});
