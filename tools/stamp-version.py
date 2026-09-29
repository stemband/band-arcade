#!/usr/bin/env python3
"""Stamps the site version into the files GitHub Pages will serve (run by .github/workflows/pages.yml on every
push to main, on the deploy's own copy: nothing is committed back to the repository).

    python3 tools/stamp-version.py <version>        e.g. the commit's short id: a1b2c3d

  - shared/version.js:  Arcade.VERSION = 'dev'  ->  '<version>'
  - every .html page:   each local .js / .css it loads gets ?v=<version>;
                        Arcade.checkVersion('dev') -> Arcade.checkVersion('<version>')
  - sw.js (the installable app's offline copy): VERSION = '<version>' and FILES = every file the site serves, with a
                        fingerprint of its contents (taken AFTER the stamps above) and 'p' (stored when the app
                        installs: pages, scripts, styles, fonts, the app's icons) or 'u' (stored the first time it's
                        used: sounds, pictures). An update downloads only the files whose fingerprint changed.
Mat never needs to run this. See shared/version.js and sw.js for why."""
import hashlib, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {'.git', '.github', 'node_modules', 'tests', 'tools'}
# files a student's browser never loads (docs, tooling) stay out of the offline copy
NOT_SERVED = {'.md', '.py', '.yml', '.yaml', '.txt', ''}
NOT_SERVED_NAMES = {'sw.js', 'CNAME', 'LICENSE', '.gitignore', '.nojekyll'}
AT_INSTALL = {'.html', '.js', '.css', '.woff2', '.webmanifest'}


def offline_files():
    files = {}
    for f in sorted(ROOT.rglob('*')):
        rel = f.relative_to(ROOT)
        if not f.is_file() or SKIP & set(rel.parts) or f.name in NOT_SERVED_NAMES or f.suffix.lower() in NOT_SERVED:
            continue
        when = 'p' if f.suffix.lower() in AT_INSTALL or rel.parts[:2] == ('shared', 'app') else 'u'
        files[rel.as_posix()] = [hashlib.sha1(f.read_bytes()).hexdigest()[:12], when]
    return files


def main(version):
    if not re.fullmatch(r'[A-Za-z0-9._-]{1,40}', version) or version == 'dev':
        sys.exit(f'bad version: {version!r}')
    vjs = ROOT / 'shared' / 'version.js'
    text, n = re.subn(r"window\.Arcade\.VERSION = '[^']*';", f"window.Arcade.VERSION = '{version}';", vjs.read_text(encoding='utf-8'), count=1)
    if n != 1:
        sys.exit('shared/version.js: VERSION line not found')
    vjs.write_text(text, encoding='utf-8')
    tag = re.compile(r'''(\s(?:src|href)=")(?![a-z]+:|//|#)([^"?#]+\.(?:js|css))(")''')
    pages = 0
    for page in sorted(ROOT.rglob('*.html')):
        if SKIP & set(page.relative_to(ROOT).parts):
            continue
        html = page.read_text(encoding='utf-8')
        out = tag.sub(lambda m: f'{m.group(1)}{m.group(2)}?v={version}{m.group(3)}', html)
        out = out.replace("Arcade.checkVersion('dev')", f"Arcade.checkVersion('{version}')")
        if out != html:
            page.write_text(out, encoding='utf-8')
            pages += 1
    sw = ROOT / 'sw.js'
    files = offline_files()
    text = sw.read_text(encoding='utf-8')
    text, a = re.subn(r"^const VERSION = '[^']*';", f"const VERSION = '{version}';", text, count=1, flags=re.M)
    text, b = re.subn(r"^const FILES = \{\};", lambda m: 'const FILES = ' + json.dumps(files, separators=(',', ':')) + ';', text, count=1, flags=re.M)
    if a != 1 or b != 1:
        sys.exit('sw.js: VERSION or FILES line not found')
    sw.write_text(text, encoding='utf-8')
    stored = sum(1 for v in files.values() if v[1] == 'p')
    print(f'version {version}: shared/version.js + {pages} pages stamped; sw.js lists {len(files)} files ({stored} stored at install)')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
