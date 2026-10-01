#!/usr/bin/env python3
"""ONE-TIME CHECK for the CLAUDE.md split (not part of the regular tests).

CLAUDE.md used to hold everything (~344 KB). It was split into a short CLAUDE.md (summary, hard rules, checklist,
index) + docs/engine/*.md + docs/games/*.md, MOVING the text word for word. This script proves nothing was lost:
every sentence of the OLD CLAUDE.md (read from git) must appear somewhere in the new CLAUDE.md + docs/**/*.md.

The only wording that changed is the cross-references between sections, now links to the new files: those edits
are listed in LINK_EDITS below and applied to the old text before comparing. Headings are not compared.

    python3 tools/check-docs-split.py [old revision]      (default: 91fc3ed, the commit before the split)

Prints every missing sentence and exits 1 if there is any; "0 missing" = the split is complete.
"""
import re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REV = sys.argv[1] if len(sys.argv) > 1 else '91fc3ed'

# old wording → the new wording (only the links between files changed)
LINK_EDITS = [
    ("(its lit sign's scene: see MARQUEES)", "(its lit sign's scene: see MARQUEES in [backgrounds-cabinets-marquees.md](backgrounds-cabinets-marquees.md))"),
    ('`MANOR_COLLECTION` list, see THE PRIZE COUNTER)', '`MANOR_COLLECTION` list, see THE PRIZE COUNTER in [prize-counter.md](prize-counter.md))'),
    ('see THE BAND NINJA CONNECTION)', 'see THE BAND NINJA CONNECTION in [band-ninja.md](band-ninja.md))'),
    ('THE AUDITION table for Scale Trainer, see its section)', 'THE AUDITION table for Scale Trainer, see its section in [scale-trainer.md](../games/scale-trainer.md))'),
    ('see SEASONAL EVENTS)', 'see SEASONAL EVENTS in [seasons.md](seasons.md))'),
    ('with no `data-zone`, see THE PRIZE COUNTER)', 'with no `data-zone`, see THE PRIZE COUNTER in [prize-counter.md](prize-counter.md))'),
    ('see THE LEADERBOARD)', 'see THE LEADERBOARD in [leaderboard.md](leaderboard.md))'),
    ('see TUNE UP (TOOLBOX) below', 'see TUNE UP (TOOLBOX) in [note-checker.md](../games/note-checker.md)'),
    ('the AVATAR BADGE (below:', 'the AVATAR BADGE ([avatars.md](avatars.md):'),
    ('THE LOCKER (see below)', 'THE LOCKER (see [avatars.md](avatars.md))'),
    ('a gift or a ladder step: see THE PRIZE COUNTER)', 'a gift or a ladder step: see THE PRIZE COUNTER in [prize-counter.md](prize-counter.md))'),
    ('EXCEPT NOTE STORM, which never pauses (see its section)', 'EXCEPT NOTE STORM, which never pauses (see its section: [note-storm.md](../games/note-storm.md))'),
    ('select-level (see above)', 'select-level (see [page-flow.md](page-flow.md) and [press-start-and-level-select.md](press-start-and-level-select.md))'),
    ('LOST SIGNAL ONLY, see Hard rules)', 'LOST SIGNAL ONLY, see the Hard rules in [CLAUDE.md](../../CLAUDE.md))'),
    ('(shared/tokens.js, see THE PRIZE COUNTER)', '(shared/tokens.js, see THE PRIZE COUNTER in [prize-counter.md](../engine/prize-counter.md))'),
    ('see AVATARS above)', 'see AVATARS in [avatars.md](../engine/avatars.md))'),
    ('PATTERNS / ECHO above)', 'PATTERNS / ECHO in [patterns-and-echo.md](../engine/patterns-and-echo.md))'),
    ('(the Hard-rules exception)', '(the Hard-rules exception, [CLAUDE.md](../../CLAUDE.md))'),
    ('THE UI KIT (every game below uses it the same way, see Engine API)', 'THE UI KIT (every game in docs/games/ uses it the same way, see [ui-kit.md](../engine/ui-kit.md))'),
    ('RHYTHMS AND COUNTING above)', 'RHYTHMS AND COUNTING in [rhythm.md](../engine/rhythm.md))'),
    ('the PROGRESS KEYS table above', 'the PROGRESS KEYS table in [notes-and-scales.md](notes-and-scales.md)'),
    ('(shared/marquees.js MARQUEES below:', '(shared/marquees.js MARQUEES in [docs/engine/backgrounds-cabinets-marquees.md](docs/engine/backgrounds-cabinets-marquees.md):'),
]

norm = lambda s: re.sub(r'\s+', ' ', s).strip()


def sentences(text):
    out = []
    for line in text.split('\n'):
        if not line.strip() or line.lstrip().startswith('#'):
            continue
        out += [s for s in re.split(r'(?<=[.!?])\s+(?=[A-Z`"(*\[])', line) if s.strip()]
    return [norm(s) for s in out]


old = subprocess.run(['git', 'show', f'{REV}:CLAUDE.md'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
for a, b in LINK_EDITS:
    assert old.count(a) >= 1, f'link edit not found in the old text: {a}'
    old = old.replace(a, b)

new = norm('\n'.join(p.read_text(encoding='utf8') for p in [ROOT / 'CLAUDE.md', *sorted((ROOT / 'docs').rglob('*.md'))]))
old_s = sentences(old)
missing = [s for s in old_s if s not in new]
for s in missing:
    print('MISSING:', s[:200])
print(f'{len(old_s)} sentences checked, {len(missing)} missing')
sys.exit(1 if missing else 0)
