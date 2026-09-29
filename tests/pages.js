/* Every page of the arcade, for the smoke test. Games and zones come from shared/games.js (tests/arcade.js), so a new
   game or zone is covered without touching this file. `open(page)` = extra steps after loading. */
const {games, zones} = require('./arcade');

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
  ...games.map(g => ({name: g.tool ? `${g.name} (tool)` : g.name, url: `${g.id}/index.html`, game: g})),
  {name: 'Sound Board', url: 'sound-board/index.html'},
  {name: 'Art Board', url: 'art-board/index.html'},
  {name: 'Song Board', url: 'music-highway/songs.html'},
  {name: 'Counting Board', url: 'rhythm-dojo/counting.html'},
  {name: 'avatar card', url: 'avatar-card/index.html'},
  {name: 'UI gallery', url: 'docs/gallery.html'},
  {name: 'old Select Player address', url: 'select-player/index.html?game=note-storm'},
];
module.exports = {PAGES};
