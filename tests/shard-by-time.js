/* SHARDS OF EQUAL TIME (tests.yml's FULL jobs). Playwright's own --shard cuts the test list into chunks of equal COUNT,
   in file order, so the slow files that sit together (Sustain Speedway's, Showtime's…) all landed on one machine, which
   then finished minutes after the others. This writes a --test-list for shard i of n with about the same TIME in each:
   every test's time from test-times.json (the last measured run; a new test gets its file's average), the longest
   first onto the least loaded shard.

     node shard-by-time.js <project> <i> <n> [more `playwright test` filters, e.g. --grep-invert @quick] > shard.txt
     npx playwright test --project=<project> --test-list shard.txt

   test-times.json is refreshed by hand from a CI run's report (ci-summary.js writes test-times.json next to the merged
   results); a stale file only makes the shards a little uneven, never skips a test: every listed test lands in exactly
   one shard. Test tooling only. */
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const [project, i, n, ...filters] = process.argv.slice(2);
if (!project || !(+i >= 1) || !(+n >= +i)) { console.error('usage: node shard-by-time.js <project> <i> <n> [filters…]'); process.exit(2); }

const list = JSON.parse(execFileSync('npx', ['playwright', 'test', '--list', '--reporter=json', `--project=${project}`, ...filters],
  {cwd: __dirname, encoding: 'utf8', maxBuffer: 64 << 20, env: Object.assign({}, process.env, {PLAYWRIGHT_JSON_OUTPUT_NAME: ''})}));

/** every test: [file, ...describe titles, title] (the --test-list form, without the project) */
const tests = [];
(function walk(suites, file, titles) {
  for (const s of suites || []) {
    const f = file || s.file, t = file ? [...titles, s.title] : [];
    for (const spec of s.specs || []) tests.push([f, ...t, spec.title]);
    walk(s.suites, f, t);
  }
})(list.suites, null, []);

const key = t => t.join(' › ');
let times = {};
try { times = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-times.json'), 'utf8'))[project] || {}; } catch (e) { /* none yet: by count */ }
const byFile = {};
for (const [k, s] of Object.entries(times)) { const f = k.split(' › ')[0]; (byFile[f] = byFile[f] || []).push(s); }
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
const guess = t => times[key(t)] ?? (byFile[t[0]] ? avg(byFile[t[0]]) : 8);

const load = Array.from({length: +n}, () => ({s: 0, tests: []}));
for (const t of [...tests].sort((a, b) => guess(b) - guess(a) || key(a).localeCompare(key(b)))) {
  const m = load.reduce((a, b) => (b.s < a.s ? b : a));
  m.s += guess(t); m.tests.push(t);
}
const mine = load[+i - 1];
console.error(`shard ${i}/${n} (${project}): ${mine.tests.length} of ${tests.length} tests, ~${Math.round(mine.s / 60)} test-minutes (the shards: ${load.map(l => Math.round(l.s / 60)).join(' / ')})`);
process.stdout.write(mine.tests.map(t => `[${project}] › ${key(t)}`).join('\n') + '\n');
