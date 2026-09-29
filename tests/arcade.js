/* Reads the arcade's own game list (shared/games.js) in Node, so the tests follow the site: a new game is tested
   automatically. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {ROOT} = require('./helpers');

function load() {
  const window = {Arcade: {}};
  const ctx = vm.createContext({window, document: {currentScript: null}, location: {search: '?demo'}, console});
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/games.js'), 'utf8'), ctx, {filename: 'shared/games.js'});
  const A = window.Arcade;
  return {games: A.GAMES.map(g => Object.assign({}, g)), zones: A.ZONES.map(z => z.id)};
}
module.exports = load();
