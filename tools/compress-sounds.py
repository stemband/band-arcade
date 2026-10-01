#!/usr/bin/env python3
"""Shrinks the sound files in shared/sounds/ (ffmpeg). Mat never needs to run this: every push to main that adds or
changes a sound runs it on that sound (.github/workflows/compress-sounds.yml) and commits the smaller file back.

    python3 tools/compress-sounds.py                  every sound above its target is re-encoded in place
    python3 tools/compress-sounds.py a.mp3 b.m4a      only these (names or paths; anything else is ignored)
    python3 tools/compress-sounds.py --changed-since <commit>   only the sounds added or changed since that commit
    --dry-run      shows what it would do (it really encodes, to a temporary folder, to report the real sizes)
    --check        like --dry-run, and exits 1 if any file would still be replaced (the tests run this)
    --force        also re-encode files it compressed before (after changing a target below)
    --verify       checks every sound against tests/fixtures/sound-durations.json: it decodes, its length is within
                   30 ms of the upload's, a music loop's first / last 20 ms still sound where the upload's did. Exits 1
                   on any problem.

A real run (not --dry-run / --check) also writes each sound it looked at into tests/fixtures/sound-durations.json:
the UPLOAD's length (measured before compressing; for music, whether its first and last 20 ms have sound) and a
fingerprint of the file as it is afterwards, so the tests can tell a processed sound from a brand-new upload.

WHAT IT KEEPS: the file name and type (.mp3 stays .mp3, .m4a stays .m4a), so no code or sounds.js changes; the length
(within 30 ms; nothing trimmed or faded); the loudness (never normalized: sfx.js's loudness cap does levels); a music
loop's seam (no new silence at either end). A file that would break any of these is left as it was, and reported.
It never makes a file bigger or "better" than its upload: a file at or below its target is skipped byte-for-byte, and
a new encode is kept only if it is at least 15 % smaller."""
import argparse, array, concurrent.futures, hashlib, json, math, os, pathlib, re, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOUNDS = ROOT / 'shared' / 'sounds'
FIXTURE = ROOT / 'tests' / 'fixtures' / 'sound-durations.json'   # every sound's uploaded length (the tests compare)

# ---- THE TARGETS (Mat: change these numbers if you want; kbps = kilobits per second) ---------------------------------
MUSIC_KBPS = 112          # music: a loop in sounds.js (loop: true), select-music-<game>, or anything over MUSIC_SECONDS.
                          # Stereo stays stereo. An iPad speaker or a Chromebook can't play the difference above this.
MUSIC_SECONDS = 20        # a sound longer than this counts as music
VOICE_KBPS = 64           # voice lines (voice: true in sounds.js): always made MONO
EFFECT_KBPS = 80          # every other sound effect: MONO when its left and right are (nearly) the same
STEREO_EFFECT_KBPS = 96   # an effect whose left and right really differ stays stereo, at this
SAME_CHANNELS = 0.98      # left/right correlation above this = "the same": the effect becomes mono
MAX_RATE = 44100          # Hz. Higher (48 kHz) is resampled to this; a lower rate (24 kHz) is kept, never raised
MIN_SAVING = 0.15         # a new encode replaces the file only if it is at least this much (15 %) smaller
RETRY = {64: 96, 80: 112, 96: 128, 112: 160}   # kbps: one step up, tried when a file at its target would change
OVER = 1.05               # "above its target" = more than 5 % over it (room for measuring a file's real bitrate)
LOWPASS_HZ = 19000       # music and effects keep their treble up to this (the encoders' own default cuts bright clicks
                          # and cymbals at 15-16 kHz, which makes them sound quieter); voices use the encoder's default
MAX_LENGTH_CHANGE = 0.030 # s: the length must stay within this (30 ms)
MAX_LOUDNESS_CHANGE = 1.0 # dB: the sound's total energy must stay within this (about the smallest change an ear notices;
                          # a lossy encoder always drops a little masked detail, more at low bitrates)
SILENCE = 0.0015          # a sample this quiet counts as silence (the same as sfx.js's loop trimming)
EDGE = 0.020              # s: a music loop's first / last 20 ms
MAX_NEW_SILENCE = 0.010   # s: a loop may gain at most 10 ms of silence at either end (sfx.js trims silence off a
                          # loop's ends, so more would shift its timing at the seam)

MARK = 'compressed by tools/compress-sounds.py'   # a file's comment tag: already done, never re-encoded (no
                                                 # generation loss); a new upload has no such tag


def run(cmd, binary=False):
    p = subprocess.run(cmd, capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf-8', 'replace').strip().splitlines()[-1:] or ['ffmpeg failed'])
    return p.stdout if binary else p.stdout.decode('utf-8', 'replace')


def sound_flags():
    """file name (no extension) -> {'loop', 'voice'} from shared/sounds.js (one entry per line)."""
    flags = {}
    for line in (ROOT / 'shared' / 'sounds.js').read_text(encoding='utf-8').splitlines():
        for m in re.finditer(r"\bfile:\s*'([^']+)'", line):
            f = flags.setdefault(m.group(1), set())
            if re.search(r'\bloop:\s*true\b', line):
                f.add('loop')
            if re.search(r'\bvoice:\s*true\b', line):
                f.add('voice')
    ids = re.findall(r"\bid:\s*'([a-z0-9-]+)'", (ROOT / 'shared' / 'games.js').read_text(encoding='utf-8'))
    for gid in ids:                       # optional per-game Select Player music (a loop); select-music-highway is not
        if 'select-music-' + gid != 'select-music-highway':
            flags.setdefault('select-music-' + gid, set()).add('loop')
    return flags


def probe(path):
    j = json.loads(run(['ffprobe', '-v', 'error', '-select_streams', 'a:0', '-show_entries',
                        'stream=codec_name,channels,sample_rate,bit_rate:format=duration,bit_rate:format_tags=comment', '-of', 'json', str(path)]))
    s, f = j['streams'][0], j['format']
    dur = float(f.get('duration') or 0)
    br = s.get('bit_rate') or f.get('bit_rate')
    if not br and dur:
        br = path.stat().st_size * 8 / dur
    return {'codec': s['codec_name'], 'channels': int(s['channels']), 'rate': int(s['sample_rate']),
            'kbps': float(br or 0) / 1000, 'duration': dur, 'done': (f.get('tags') or {}).get('comment') == MARK}


def decode(path, channels=None):
    """(samples as a list of channels of int16 arrays, sample rate): the whole file, as a browser would decode it."""
    info = probe(path)
    ch = channels or min(info['channels'], 2)
    raw = run(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:a:0', '-f', 's16le', '-ac', str(ch), '-'], binary=True)
    a = array.array('h')
    a.frombytes(raw[:len(raw) // (2 * ch) * 2 * ch])
    if sys.byteorder == 'big':
        a.byteswap()
    return [a[i::ch] for i in range(ch)], info['rate']


def loudness(path, length):
    """the sound's total energy in dB (its average level, plus its length, so a few ms of encoder silence don't count)"""
    out = subprocess.run(['ffmpeg', '-v', 'info', '-nostats', '-i', str(path), '-map', '0:a:0', '-af', 'volumedetect',
                          '-f', 'null', '-'], capture_output=True).stderr.decode('utf-8', 'replace')
    m = re.search(r'mean_volume:\s*(-?[\d.]+|-inf) dB', out)
    if not m or m.group(1) == '-inf' or length <= 0:
        return -120.0
    return float(m.group(1)) + 10 * math.log10(length)


def correlation(chans):
    """left/right correlation (1 = identical)."""
    if len(chans) < 2:
        return 1.0
    L, R = chans[0], chans[1]
    step = max(1, len(L) // 400000)            # long files: every n-th sample is plenty
    n = sl = sr = sll = srr = slr = 0
    for i in range(0, len(L), step):
        x, y = L[i], R[i]
        n += 1; sl += x; sr += y; sll += x * x; srr += y * y; slr += x * y
    if not n:
        return 1.0
    vl, vr = sll - sl * sl / n, srr - sr * sr / n
    if vl <= 0 and vr <= 0:
        return 1.0                             # both silent
    if vl <= 0 or vr <= 0:
        return 0.0                             # one side silent: real stereo (a mono mix would halve it)
    return (slr - sl * sr / n) / math.sqrt(vl * vr)


def edges(chans, rate):
    """silence at the start and end (s, up to 0.25 s), and whether the first / last 20 ms have any sound."""
    thr = SILENCE * 32768
    n = len(chans[0]) if chans else 0
    lim = min(n, int(rate * 0.25))
    loud = lambda i: any(abs(c[i]) > thr for c in chans)
    a = 0
    while a < lim and not loud(a):
        a += 1
    b = 0
    while b < lim and not loud(n - 1 - b):
        b += 1
    w = max(1, int(rate * EDGE))
    head = any(loud(i) for i in range(min(n, w)))
    tail = any(loud(i) for i in range(max(0, n - w), n))
    return {'lead': a / rate, 'trail': b / rate, 'head': head, 'tail': tail}


def measure(path):
    chans, rate = decode(path)
    n = len(chans[0]) if chans else 0
    return {'length': n / rate if rate else 0, **edges(chans, rate)}


def plan(path, flags):
    """what this file should become: kind, kbps, channels, rate; 'over' = above its target; 'done' = this script
    made it (its tag, at a bitrate this script would have chosen: an edited re-upload keeping the tag still counts as new)."""
    info = probe(path)
    f = flags.get(path.stem, set())
    if 'loop' in f or info['duration'] > MUSIC_SECONDS:
        kind, kbps, ch = 'music', MUSIC_KBPS, min(info['channels'], 2)
    elif 'voice' in f:
        kind, kbps, ch = 'voice', VOICE_KBPS, 1
    elif info['channels'] == 1:
        kind, kbps, ch = 'effect', EFFECT_KBPS, 1
    else:
        same = correlation(decode(path)[0]) > SAME_CHANNELS
        kind, kbps, ch = 'effect', EFFECT_KBPS if same else STEREO_EFFECT_KBPS, 1 if same else 2
    target = {'kind': kind, 'kbps': kbps, 'channels': ch, 'rate': min(info['rate'], MAX_RATE), 'info': info}
    target['over'] = info['kbps'] > kbps * OVER
    target['done'] = info['done'] and info['kbps'] <= RETRY.get(kbps, kbps) * OVER
    return target


def encode(src, dst, t):
    af = ['-af', 'pan=mono|c0=0.5*c0+0.5*c1'] if t['channels'] == 1 and t['info']['channels'] == 2 else \
         ['-ac', str(t['channels'])]
    cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-map', '0:a:0', '-map_metadata', '-1', '-metadata', f'comment={MARK}',
           '-fflags', '+bitexact', '-flags:a', '+bitexact', *af, '-ar', str(t['rate'])]
    if t['kind'] != 'voice' and t['rate'] / 2 > LOWPASS_HZ:
        cmd += ['-cutoff', str(LOWPASS_HZ)]
    if src.suffix.lower() == '.mp3':           # LAME, constant bitrate, with the gapless (delay/padding) header
        cmd += ['-c:a', 'libmp3lame', '-b:a', f"{t['kbps']}k", '-compression_level', '2', '-write_xing', '1',
                '-id3v2_version', '3', '-write_id3v1', '0']
    else:                                      # .m4a: AAC, with the edit list that hides the encoder's priming
        cmd += ['-c:a', 'aac', '-b:a', f"{t['kbps']}k", '-movflags', '+faststart']
    run(cmd + [str(dst)])


def try_file(path, flags, tmp, force=False):
    """re-encode one file into tmp; returns a report row (the new file is NOT put in place here)."""
    row = {'name': path.name, 'old': path.stat().st_size, 'new': None, 'kind': '?', 'from': 0, 'to': 0, 'action': ''}
    try:
        t = plan(path, flags)
    except Exception as e:  # noqa: BLE001 (a broken upload: reported, never touched)
        row['action'] = f'SKIPPED: cannot read it ({e})'
        return row
    row.update(kind=t['kind'], **{'from': t['info']['kbps'], 'to': t['kbps']})
    if not t['over'] or (t['done'] and not force):
        row['action'] = 'at target' if not t['over'] else 'done earlier'
        return row
    out, a, la, why = tmp / path.name, None, None, ''
    for kbps in (t['kbps'], RETRY.get(t['kbps'])):         # the target; if the sound would change, one step higher
        if not kbps or t['info']['kbps'] <= kbps * OVER:
            break
        try:
            encode(path, out, dict(t, kbps=kbps))
        except Exception as e:  # noqa: BLE001
            why = f'encoding failed ({e})'
            break
        row['new'], row['to'] = out.stat().st_size, kbps
        if row['new'] > row['old'] * (1 - MIN_SAVING):
            why = why or f'kept: only {100 - 100 * row["new"] / row["old"]:.0f} % smaller'
            break
        if a is None:
            a = measure(path)
            la = loudness(path, a['length'])
        b = measure(out)
        lb = loudness(out, b['length'])
        gap = [w for w in ('lead', 'trail') if b[w] > a[w] + MAX_NEW_SILENCE] + \
              [w for w in ('head', 'tail') if a[w] and not b[w]] if t['kind'] == 'music' else []
        if abs(a['length'] - b['length']) > MAX_LENGTH_CHANGE:
            why = f'length {a["length"]:.3f} s -> {b["length"]:.3f} s'
        elif la > -90 and abs(la - lb) > MAX_LOUDNESS_CHANGE:
            why = f'loudness {la:.1f} -> {lb:.1f} dB at {kbps} kbps'
        elif gap:
            why = f'the loop seam would change at {kbps} kbps (silence at the start/end {a["lead"] * 1000:.0f}/' \
                  f'{a["trail"] * 1000:.0f} ms -> {b["lead"] * 1000:.0f}/{b["trail"] * 1000:.0f} ms)'
        else:
            row['action'], row['tmp'] = 'compressed', out
            return row
    row['action'] = why if why.startswith('kept') else f'SKIPPED: {why}' if why else 'kept: no smaller step'
    return row


def sound_files(names):
    every = sorted(p for p in SOUNDS.iterdir() if p.is_file() and p.suffix.lower() in ('.mp3', '.m4a'))
    if names is None:
        return every
    # a bare name means shared/sounds/<name>; a path is taken from the repository root (or as given)
    want = {(SOUNDS / n if '/' not in n else ROOT / n if not pathlib.Path(n).is_absolute() else pathlib.Path(n)).resolve()
            for n in names}
    return [p for p in every if p.resolve() in want]


def changed_since(commit):
    """the sounds added or changed since a commit (None = it can't be told: every sound)."""
    if not commit or set(commit) == {'0'}:
        return None
    p = subprocess.run(['git', '-C', str(ROOT), 'diff', '--name-only', '-z', '--diff-filter=AMR', commit, 'HEAD', '--',
                        'shared/sounds/'], capture_output=True)
    if p.returncode:
        print(f'(could not compare with {commit}: every sound is checked)')
        return None
    return [n for n in p.stdout.decode('utf-8').split('\0') if n]


def sha(path):
    return hashlib.sha1(path.read_bytes()).hexdigest()[:12]


def load_fixture():
    return json.loads(FIXTURE.read_text(encoding='utf-8')) if FIXTURE.exists() else {}


def uploads(files, data, flags):
    """the fixture lines for these files, measured BEFORE compressing (what was uploaded). A file still exactly as
    recorded (the same fingerprint) keeps its line, so the length stays the upload's, not a re-encode's."""
    out = {}
    for p in files:
        e = data.get(p.name)
        if e and e.get('sha') == sha(p):
            out[p.name] = e
            continue
        try:
            m = measure(p)
        except Exception:  # noqa: BLE001 (a broken upload: no line, --verify reports it)
            continue
        e = {'length': round(m['length'], 4)}
        if plan(p, flags)['kind'] == 'music':
            e.update(head=m['head'], tail=m['tail'])
        out[p.name] = e
    return out


def save_fixture(data):
    present = {p.name for p in sound_files(None)}
    lines = [f'  {json.dumps(k)}: {json.dumps(v, sort_keys=True)}' for k, v in sorted(data.items()) if k in present]
    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text('{\n' + ',\n'.join(lines) + '\n}\n', encoding='utf-8')     # one line per sound


def verify():
    data = load_fixture()
    def one(p):
        e = data.get(p.name)
        try:
            m = measure(p)
        except Exception as x:  # noqa: BLE001
            return f'{p.name}: does not decode ({x})'
        if not m['length']:
            return f'{p.name}: decodes to nothing'
        if e is None or e.get('sha') != sha(p):
            return f'{p.name}: not processed yet (run python3 tools/compress-sounds.py "{p.name}")'
        if abs(m['length'] - e['length']) > MAX_LENGTH_CHANGE:
            return f'{p.name}: {m["length"]:.3f} s, the upload was {e["length"]:.3f} s'
        for w in ('head', 'tail'):
            if e.get(w) and not m[w]:
                return f'{p.name}: the loop\'s {"first" if w == "head" else "last"} 20 ms went silent (a gap at the seam)'
        return None
    files = sound_files(None)
    with concurrent.futures.ThreadPoolExecutor(os.cpu_count() or 2) as ex:
        bad = [r for r in ex.map(one, files) if r]
    for b in bad:
        print('PROBLEM:', b)
    print(f'{len(files)} sounds checked against {FIXTURE.relative_to(ROOT)}: {"OK" if not bad else f"{len(bad)} problem(s)"}')
    return not bad


def kb(n):
    return '' if n is None else f'{n / 1024:,.0f} KB' if n < 1024 * 1024 else f'{n / 1048576:.2f} MB'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('files', nargs='*')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--changed-since')
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--force', action='store_true', help='also re-encode files this script already compressed')
    args = ap.parse_args()
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        sys.exit('ffmpeg is not installed (it needs ffmpeg and ffprobe)')
    if args.verify:
        sys.exit(0 if verify() else 1)
    names = args.files or None
    if args.changed_since is not None:
        changed = changed_since(args.changed_since)
        names = changed if changed is not None else names
    files = sound_files(names)
    if not files:
        print('No sounds to compress.')
        return
    flags = sound_flags()
    replace = not (args.dry_run or args.check)
    data = load_fixture()
    if replace:
        data.update(uploads(files, data, flags))
    with tempfile.TemporaryDirectory() as td:
        tmp = pathlib.Path(td)
        with concurrent.futures.ThreadPoolExecutor(os.cpu_count() or 2) as ex:
            rows = list(ex.map(lambda p: try_file(p, flags, tmp, args.force), files))
        for r in rows:
            if r.get('tmp') and replace:
                os.replace(r['tmp'], SOUNDS / r['name'])
    w = max(len(r['name']) for r in rows)
    print(f'{"file":<{w}}  {"kind":<6} {"old":>9} {"new":>9}  {"kbps":>11}  result')
    for r in rows:
        done = r['action'] == 'compressed'
        rate = f'{r["from"]:.0f} -> {r["to"]}' if done else f'{r["from"]:.0f}'
        print(f'{r["name"]:<{w}}  {r["kind"]:<6} {kb(r["old"]):>9} {kb(r["new"] if done else None):>9}  {rate:>11}  '
              f'{r["action"] if replace or not done else "would compress"}')
    old = sum(r['old'] for r in rows)
    new = sum(r['new'] if r['action'] == 'compressed' else r['old'] for r in rows)
    n = sum(r['action'] == 'compressed' for r in rows)
    skipped = [r for r in rows if r['action'].startswith('SKIPPED')]
    print(f'\n{len(rows)} sounds: {kb(old)} -> {kb(new)} ({100 - 100 * new / old if old else 0:.0f} % smaller); '
          f'{n} {"compressed" if replace else "to compress"}, {len(skipped)} skipped')
    for r in skipped:
        print(f'  skipped {r["name"]}: {r["action"][9:]}')
    if replace:
        for p in files:
            if p.name in data:
                data[p.name]['sha'] = sha(p)                 # the file as it is now: what --verify and the tests expect
        save_fixture(data)
    if args.check and n:
        print(f'\nCHECK FAILED: {n} sound(s) are above their target (run python3 tools/compress-sounds.py).')
        sys.exit(1)


if __name__ == '__main__':
    main()
