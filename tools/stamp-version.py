#!/usr/bin/env python3
"""Stamps the site version into the files GitHub Pages will serve (run by .github/workflows/pages.yml on every
push to main, on the deploy's own copy: nothing is committed back to the repository).

    python3 tools/stamp-version.py <version>        e.g. the commit's short id: a1b2c3d

  - shared/version.js:  Arcade.VERSION = 'dev'  ->  '<version>'
  - every .html page:   each local .js / .css it loads gets ?v=<version>;
                        Arcade.checkVersion('dev') -> Arcade.checkVersion('<version>')
Mat never needs to run this. See shared/version.js for why."""
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SKIP = {'.git', '.github', 'node_modules'}


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
    print(f'version {version}: shared/version.js + {pages} pages stamped')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
