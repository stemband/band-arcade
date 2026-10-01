#!/usr/bin/env python3
"""MINIFIES THE PUBLISHED COPY of the site (run by .github/workflows/pages.yml on every deploy, on the deploy's own
copy, between tools/stamp-version.py --stamp-only and --fingerprints-only: nothing is committed back).

    python3 tools/minify-site.py [--root DIR] [--esbuild PATH]

THE REPOSITORY IS NEVER MINIFIED. Mat edits and double-click tests the plain files exactly as before; only the copy
GitHub Pages serves is made smaller, so a student's browser has less JavaScript to parse (the slow part on a school
Chromebook or an older iPad: GitHub Pages already gzips what goes over the wire).

  - every served .js and .css is minified IN PLACE, one file at a time (esbuild's transform mode): same names, same
    folders, same script tags, same load order. NEVER bundled and never given a module format, so each classic
    script's top-level names stay as they are (the files share globals) and document.currentScript still works.
  - JS: --minify --target=safari15,chrome100 (the oldest browsers the arcade supports: iPad Safari 15, school
    Chromebooks) --legal-comments=none, plus a SOURCE MAP <file>.map next to it with a sourceMappingURL line, so an
    error from a student's device still shows the real file and line in DevTools (the map holds the original source).
    The .map files are left out of the app's offline copy (stamp-version.py's NOT_SERVED).
  - CSS: --minify --loader=css (no source map: the CSS isn't where errors come from).
  - NEVER TOUCHED: sw.js (stamp-version.py writes its VERSION / FILES lines afterwards), shared/vendor/ (three.js is
    minified already), *.min.js, the HTML pages and their inline scripts, JSON and every other file, the folders that
    aren't served (tests, tools, .github, .git, node_modules), and any file whose FIRST LINE is /* keep-unminified */
    (featured.js, leaderboard-config.js, teacher-settings.js: Mat may fix them live in GitHub's editor, and the
    deployed copy should read the same).
  - SAFETY: if esbuild fails on a file, that file stays as it is, a warning is printed and the deploy goes on. If
    esbuild can't be found or installed at all, nothing is minified (a warning) and the deploy goes on. Never a broken
    site.
  - THE REPORT in the workflow's log: each file's size before -> after, the totals, and the lobby's (index.html's
    scripts + the 4 files version.js loads) total.
esbuild: --esbuild PATH, else $ESBUILD, else tests/node_modules/.bin/esbuild when it is the pinned version, else it's
installed (npm, the pinned version below) into a temporary folder. Mat never needs to run this."""
import argparse, base64, json, os, pathlib, re, shutil, subprocess, sys, tempfile

ESBUILD_VERSION = '0.28.2'                     # pinned (tests/package.json pins the same one)
JS_TARGET = 'safari15,chrome100'
KEEP = '/* keep-unminified */'
SKIP = {'.git', '.github', 'node_modules', 'tests', 'tools'}
NEVER = {'sw.js'}
# the lobby's own scripts beyond its <script> tags: version.js (its document.write) and what checkVersion adds
LOBBY_EXTRA = ['shared/version.js', 'shared/ui-kit.js', 'shared/tokens.js', 'shared/app.js']


def find_esbuild(root, given):
    for cand in [given, os.environ.get('ESBUILD'), str(root / 'tests' / 'node_modules' / '.bin' / 'esbuild'),
                 str(pathlib.Path(__file__).resolve().parent.parent / 'tests' / 'node_modules' / '.bin' / 'esbuild')]:
        if cand and pathlib.Path(cand).exists():
            ver = subprocess.run([cand, '--version'], capture_output=True, text=True).stdout.strip()
            if ver == ESBUILD_VERSION or cand == given:
                if ver != ESBUILD_VERSION:
                    print(f'::warning::esbuild {ver} (pinned: {ESBUILD_VERSION})')
                return cand, None
    if not shutil.which('npm'):
        return None, None
    tmp = tempfile.mkdtemp(prefix='arcade-esbuild-')
    r = subprocess.run(['npm', 'install', '--no-save', '--no-audit', '--no-fund', '--prefix', tmp, f'esbuild@{ESBUILD_VERSION}'],
                       capture_output=True, text=True)
    exe = pathlib.Path(tmp) / 'node_modules' / '.bin' / 'esbuild'
    if r.returncode != 0 or not exe.exists():
        print(r.stderr[-2000:], file=sys.stderr)
        return None, tmp
    return str(exe), tmp


def targets(root):
    for f in sorted(root.rglob('*')):
        rel = f.relative_to(root)
        if not f.is_file() or f.is_symlink() or SKIP & set(rel.parts) or f.suffix.lower() not in ('.js', '.css'):
            continue
        if rel.as_posix() in NEVER or rel.parts[:2] == ('shared', 'vendor') or f.name.endswith('.min.js'):
            continue
        yield f, rel


def minify(esbuild, f, rel):
    """minify f in place; returns (before, after) bytes, or (before, None) when it's kept as it is"""
    src = f.read_bytes()
    if src.lstrip().startswith(KEEP.encode()):
        return len(src), 'keep'
    js = f.suffix.lower() == '.js'
    args = [esbuild, '--minify', '--legal-comments=none', '--log-level=error', f'--sourcefile={rel.as_posix()}']
    if js:
        args += ['--loader=js', f'--target={JS_TARGET}', '--sourcemap=inline', '--sources-content=true']
    else:
        args += ['--loader=css', '--target=safari15,chrome100']
    r = subprocess.run(args, input=src, capture_output=True)
    if r.returncode != 0 or (not r.stdout.strip() and src.strip()):
        print(f'::warning file={rel.as_posix()}::not minified (esbuild failed), published as it is: '
              f'{r.stderr.decode("utf-8", "replace").strip()[:500]}')
        return len(src), None
    out = r.stdout
    if js:
        # the map comes inline (stdin has no file to put it next to): take it out and write it as <file>.map
        text = out.decode('utf-8')
        m = re.search(r'\n//# sourceMappingURL=data:application/json;base64,([A-Za-z0-9+/=]+)\s*$', text)
        code = (text[:m.start()] if m else text).rstrip('\n')
        if m:
            smap = json.loads(base64.b64decode(m.group(1)))
            # DevTools lists the original under "original source" (its text is inside the map: nothing is fetched)
            smap['sources'] = [f'original-source:///{rel.as_posix()}']
            (f.parent / (f.name + '.map')).write_text(json.dumps(smap, separators=(',', ':')), encoding='utf-8')
            code += f'\n//# sourceMappingURL={f.name}.map'
        out = (code + '\n').encode('utf-8')
    f.write_bytes(out)
    return len(src), len(out)


def lobby_scripts(root):
    page = root / 'index.html'
    if not page.exists():
        return []
    srcs = re.findall(r'<script src="(?![a-z]+:|//)([^"?#]+\.js)', page.read_text(encoding='utf-8'))
    return [s for s in LOBBY_EXTRA if (root / s).exists()] + [s for s in srcs if s not in LOBBY_EXTRA]


def kb(n):
    return f'{n / 1024:7.1f} KB'


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--root', default=str(pathlib.Path(__file__).resolve().parent.parent))
    ap.add_argument('--esbuild')
    a = ap.parse_args()
    root = pathlib.Path(a.root).resolve()
    if (root / 'shared' / 'version.js').read_text(encoding='utf-8').find("window.Arcade.VERSION = 'dev';") >= 0:
        print('::warning::shared/version.js still says VERSION = \'dev\': run tools/stamp-version.py --stamp-only first '
              '(minifying anyway)')
    esbuild, tmp = find_esbuild(root, a.esbuild)
    if not esbuild:
        print(f'::warning::esbuild {ESBUILD_VERSION} could not be found or installed: the site is published unminified')
        return
    sizes, failed, kept = {}, [], []
    try:
        for f, rel in targets(root):
            before, after = minify(esbuild, f, rel)
            if after == 'keep':
                kept.append(rel.as_posix()); after = before
            elif after is None:
                failed.append(rel.as_posix()); after = before
            sizes[rel.as_posix()] = (before, after)
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)
    print(f'esbuild {ESBUILD_VERSION}: {len(sizes)} files')
    for rel, (b, n) in sorted(sizes.items(), key=lambda kv: -kv[1][0]):
        note = '  (kept: keep-unminified)' if rel in kept else '  (NOT MINIFIED: esbuild failed)' if rel in failed else ''
        print(f'  {rel:<52} {kb(b)} -> {kb(n)}{note}')
    for kind in ('.js', '.css'):
        b = sum(v[0] for k, v in sizes.items() if k.endswith(kind)); n = sum(v[1] for k, v in sizes.items() if k.endswith(kind))
        print(f'TOTAL {kind:<4} {kb(b)} -> {kb(n)}  ({100 - 100 * n / max(b, 1):.0f} % smaller)')
    lobby = [s for s in lobby_scripts(root) if s in sizes]
    b = sum(sizes[s][0] for s in lobby); n = sum(sizes[s][1] for s in lobby)
    print(f'THE LOBBY (index.html: {len(lobby)} scripts at load) {kb(b)} -> {kb(n)}')
    if failed:
        print(f'::warning::{len(failed)} file(s) published unminified: {", ".join(failed)}')


if __name__ == '__main__':
    main()
