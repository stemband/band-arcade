/* THE DEPLOY PIPELINE, for the tests: the same steps .github/workflows/pages.yml runs on the published copy, on a copy
   of the site in another folder (the repository itself is never touched):
     1. python3 tools/stamp-version.py --stamp-only <version>      the version into version.js and every page
     2. python3 tools/minify-site.py                                every served .js / .css made smaller (esbuild)
     3. python3 tools/stamp-version.py --fingerprints-only <version> sw.js's FILES (fingerprints of the MINIFIED files)
   Keep it in step with pages.yml.

     node deploy.js <folder> <version>      a published copy in <folder> (tests.yml's "built" job serves it:
                                            ARCADE_SITE=<folder> npx playwright test)
   app.spec.js uses copySite() + deploy() for its two versions. */
const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ESBUILD = path.join(__dirname, 'node_modules', '.bin', 'esbuild');

/** copy the site (not .git, tests or node_modules); linkSounds: shared/sounds/ is a link to the repository's (faster) */
function copySite(dir, {linkSounds = false} = {}) {
  fs.cpSync(ROOT, dir, {recursive: true, filter: s => !/[\\/](\.git|tests|node_modules)$/.test(s) && !(linkSounds && /[\\/]shared[\\/]sounds$/.test(s))});
  if (linkSounds) fs.symlinkSync(path.join(ROOT, 'shared/sounds'), path.join(dir, 'shared/sounds'));
  return dir;
}

/** the deploy's three steps on the copy in dir; returns minify-site.py's report */
function deploy(dir, version) {
  const run = args => execFileSync('python3', args, {cwd: dir, stdio: 'pipe', encoding: 'utf8'});
  run([path.join(dir, 'tools/stamp-version.py'), '--stamp-only', version]);
  const report = run([path.join(dir, 'tools/minify-site.py'), '--root', dir].concat(fs.existsSync(ESBUILD) ? ['--esbuild', ESBUILD] : []));
  run([path.join(dir, 'tools/stamp-version.py'), '--fingerprints-only', version]);
  return report;
}

module.exports = {copySite, deploy};

if (require.main === module) {
  const [dir, version] = process.argv.slice(2);
  if (!dir || !version) { console.error('node deploy.js <folder> <version>'); process.exit(1); }
  fs.rmSync(dir, {recursive: true, force: true});
  copySite(path.resolve(dir));
  process.stdout.write(deploy(path.resolve(dir), version));
}
