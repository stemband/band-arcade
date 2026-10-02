/* THE RUN SUMMARY AND THE TIME BUDGET (tests.yml runs it after the tests; or by hand:
   `node ci-summary.js results.json`). It reads Playwright's JSON report and writes, to the GitHub run summary
   ($GITHUB_STEP_SUMMARY) or the terminal:
     - the total test time per browser and the 10 slowest tests;
     - every test that NEEDED A RETRY (flaky: passed only on its second try). CI allows one retry, so a flaky test
       doesn't turn the check red, but it is listed here every time: fix its cause (a race, a real clock), don't hide it;
     - THE TIME BUDGET: a test over BUDGET_S seconds that isn't tagged @slow FAILS the check, with a message saying
       how to fix it (speed it up: the test clock, a demo jump, a state wait; or tag it @slow, which runs it only in
       the FULL job, never in QUICK CHECK).
   docs/engine/testing.md "Keeping the tests fast" has the rules. Test tooling only (tests/). */
const fs = require('fs');

const BUDGET_S = 60;
const file = process.argv[2] || 'results.json';
if (!fs.existsSync(file)) { console.log(`no report at ${file}`); process.exit(0); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));

/* every test × project with its final result */
const rows = [];
(function walk(suites, fileName) {
  for (const s of suites || []) {
    const f = s.file || fileName;
    for (const spec of s.specs || []) {
      for (const t of spec.tests || []) {
        const res = t.results || [];
        if (!res.length) continue;
        const last = res[res.length - 1];
        rows.push({
          file: f, line: spec.line, title: spec.title, tags: spec.tags || [], project: t.projectName,
          status: t.status,                                 // expected | unexpected | flaky | skipped
          seconds: (last.duration || 0) / 1000, tries: res.length,
          total: res.reduce((a, r) => a + (r.duration || 0), 0) / 1000,
        });
      }
    }
    walk(s.suites, f);
  }
})(report.suites);

const ran = rows.filter(r => r.status !== 'skipped');
const name = r => `${r.file}:${r.line} › ${r.title}`;
const fmt = s => s >= 60 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${s.toFixed(1)} s`;
const out = [];

out.push('## Tests: time and steadiness', '');
const projects = [...new Set(ran.map(r => r.project))].sort();
out.push('| Browser | Tests | Total test time | Failed | Needed a retry |', '|---|---|---|---|---|');
for (const p of projects) {
  const mine = ran.filter(r => r.project === p);
  out.push(`| ${p} | ${mine.length} | ${fmt(mine.reduce((a, r) => a + r.total, 0))} | ${mine.filter(r => r.status === 'unexpected').length} | ${mine.filter(r => r.status === 'flaky').length} |`);
}
if (report.stats && report.stats.duration) out.push('', `Wall-clock time of the run (all shards merged): ${fmt(report.stats.duration / 1000)}.`);

out.push('', '### The 10 slowest tests', '', '| Time | Browser | Test |', '|---|---|---|');
for (const r of [...ran].sort((a, b) => b.seconds - a.seconds).slice(0, 10))
  out.push(`| ${fmt(r.seconds)} | ${r.project} | ${name(r)}${r.tags.includes('slow') ? ' `@slow`' : ''} |`);

const flaky = ran.filter(r => r.status === 'flaky');
out.push('', '### Needed a retry (flaky)', '');
if (!flaky.length) out.push('None. 🎉');
else {
  out.push('These failed once and passed on the retry. Fix the cause (a race, a real clock, a fixed sleep): a retry only hides it.', '');
  for (const r of flaky) out.push(`- **${r.project}** ${name(r)}`);
}

const over = ran.filter(r => r.status !== 'unexpected' && r.seconds > BUDGET_S && !r.tags.includes('slow'));
out.push('', `### Time budget: ${BUDGET_S} s a test`, '');
if (!over.length) out.push(`Every test is under ${BUDGET_S} s (or tagged \`@slow\`).`);
else {
  out.push(`❌ These took over ${BUDGET_S} s. Make them faster (the test clock \`page.clock\`, a demo jump flag, wait for a state instead of a sleep: docs/engine/testing.md "Keeping the tests fast"), or, if the test really is about a long run, tag it \`{tag: '@slow'}\` (it then runs only in the FULL job, never in QUICK CHECK).`, '');
  for (const r of over) out.push(`- ${fmt(r.seconds)} **${r.project}** ${name(r)}`);
}

const text = out.join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
console.log(text);
for (const r of flaky) console.log(`::warning file=tests/${r.file},line=${r.line}::Needed a retry (flaky) in ${r.project}: ${r.title}`);
for (const r of over) console.log(`::error file=tests/${r.file},line=${r.line}::${fmt(r.seconds)} in ${r.project}: over the ${BUDGET_S} s budget. Speed it up or tag it @slow.`);
process.exit(over.length ? 1 : 0);
