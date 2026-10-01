// THE DOCS STAY HEALTHY: CLAUDE.md is a short index (summary, hard rules, checklist, THE INDEX); every game and shared
// system has its own file in docs/games/ or docs/engine/. No browser needed: these read the files.
const {test, expect} = require('@playwright/test');
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const mdIn = dir => fs.readdirSync(path.join(ROOT, dir), {withFileTypes: true}).flatMap(f =>
  f.isDirectory() ? mdIn(dir + '/' + f.name) : f.name.endsWith('.md') ? [dir + '/' + f.name] : []);
const DOCS = [...mdIn('docs/engine'), ...mdIn('docs/games')];
// [text](target) links that point at local files (not http, not #anchors alone)
const links = text => [...text.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map(m => m[1])
  .filter(h => !/^[a-z]+:/i.test(h) && !h.startsWith('#')).map(h => h.split('#')[0]);

test('CLAUDE.md is at most 25 KB', () => {
  expect(fs.statSync(path.join(ROOT, 'CLAUDE.md')).size).toBeLessThanOrEqual(25 * 1024);
});

test('every game in shared/games.js has docs/games/<id>.md', () => {
  const src = read('shared/games.js');
  const list = src.slice(src.indexOf('Arcade.GAMES = ['), src.indexOf('Arcade.ALL_GAMES'));   // the games, not the zones
  const ids = [...list.matchAll(/^\s+id: '([a-z0-9-]+)'/gm)].map(m => m[1]);
  expect(ids).toContain('arcade-quest');
  const missing = ids.filter(id => !fs.existsSync(path.join(ROOT, 'docs/games', id + '.md')));
  expect(missing).toEqual([]);
});

test('CLAUDE.md\'s index lists every file in docs/engine/ and docs/games/, and every link in it is a real file', () => {
  const claude = read('CLAUDE.md');
  const linked = new Set(links(claude).map(h => path.normalize(h)));
  expect(DOCS.filter(f => !linked.has(path.normalize(f)))).toEqual([]);
  expect([...linked].filter(h => !fs.existsSync(path.join(ROOT, h)))).toEqual([]);
});

test('no broken links between the doc files', () => {
  const bad = [];
  for (const f of ['CLAUDE.md', ...DOCS]) {
    for (const h of links(read(f))) {
      if (!fs.existsSync(path.join(ROOT, path.dirname(f), h))) bad.push(`${f} → ${h}`);
    }
  }
  expect(bad).toEqual([]);
});
