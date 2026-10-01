/* Every page of the arcade, for the smoke test. Games and zones come from shared/games.js (tests/arcade.js), so a new
   game or zone is covered without touching this file. `open(page)` = extra steps after loading. */
const {games, zones} = require('./arcade');
const {VIEWPORTS} = require('./helpers');

const PAGES = [
  {name: 'lobby', url: 'index.html'},
  ...zones.map(z => ({name: `zone ${z}`, url: `index.html#zone=${z}`})),
  {name: 'All Games', url: 'index.html#all-games'},
  {name: 'Full Arcade', url: 'index.html#full-arcade'},
  {name: 'Choose Your Instrument', url: 'index.html?game=ghost-notes'},
  {name: 'pick mode', url: 'index.html?pick'},
  {name: 'leaderboard screen', url: 'index.html', open: async page => {
    await page.locator('#lbBtn').click();
    await page.locator('.lb-g').first().click();          // "What grade are you in?"
    await page.getByText('Resets every Monday', {exact: false}).first().waitFor();
  }},
  {name: 'Prize Counter', url: 'index.html', open: async page => {
    await page.locator('#prizeSign').click();
    await page.locator('#prizes .pz-prize').first().waitFor();
  }},
  // the SEASONAL SHELF (a Spooky Season preview), at iPad sizes and on a phone
  {name: 'Prize Counter: seasonal shelf', url: 'index.html?season=spooky',
    sizes: [...Object.entries(VIEWPORTS).slice(0, 2), ['phone', {width: 390, height: 844}]], open: async page => {
      await page.locator('#prizeSign').click();
      await page.locator('#prizes .pz-s-season .pz-prize').first().waitFor();
    }},
  ...games.map(g => ({name: g.tool ? `${g.name} (tool)` : g.name, url: `${g.id}/index.html`, game: g})),
  // TUNE UP's other two tools (the Note Checker tab is the tool's own entry above)
  {name: 'Tune Up: Tuner', url: 'note-checker/index.html?tool=tuner'},
  {name: 'Tune Up: Metronome', url: 'note-checker/index.html?tool=metronome', open: async page => {
    await page.locator('#mtLad summary').click();                  // the Tempo Ladder's settings open too
  }},
  {name: 'Sound Board', url: 'sound-board/index.html'},
  {name: 'Art Board', url: 'art-board/index.html'},
  {name: 'Song Board', url: 'music-highway/songs.html'},
  {name: 'Counting Board', url: 'rhythm-dojo/counting.html'},
  {name: 'avatar card', url: 'avatar-card/index.html'},
  {name: 'UI gallery', url: 'docs/gallery.html'},
  {name: 'old Select Player address', url: 'select-player/index.html?game=note-storm'},
];
module.exports = {PAGES};
