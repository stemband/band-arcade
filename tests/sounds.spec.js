// THE SOUND FILES still play after compression (tools/compress-sounds.py): every file in shared/sounds/ decodes in the
// browser, and a file the compressor has processed (its fingerprint matches fixtures/sound-durations.json) is as long
// as its upload was, within 30 ms (0.08 s in a browser that keeps MP3 encoder padding: WebKit); a music loop's first and last 20 ms are not silent when the upload's weren't (no gap
// at the seam). A brand-new upload the compressor hasn't reached yet (a different fingerprint) only has to decode.
// The exact checks with ffmpeg (every file, the loudness, the targets) are `compress-sounds.py --check / --verify`,
// in the "sounds" job of .github/workflows/tests.yml.
const {test, expect} = require('@playwright/test');
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'shared/sounds');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/sound-durations.json'), 'utf8'));
const FILES = fs.readdirSync(DIR).filter(f => /\.(mp3|m4a)$/i.test(f)).sort();
const sha = f => crypto.createHash('sha1').update(fs.readFileSync(path.join(DIR, f))).digest('hex').slice(0, 12);
const processed = f => FIXTURE[f] && FIXTURE[f].sha === sha(f);

test('the fixture lists every sound file', () => {
  expect(FILES.length).toBeGreaterThan(100);
  const old = Object.keys(FIXTURE).filter(f => !FILES.includes(f));
  expect(old, 'fixture lines for files that are gone').toEqual([]);
});

test('every sound decodes, at its uploaded length, and loops keep sound at the seam', async ({page}) => {
  test.setTimeout(180_000);
  await page.goto('offline.html');
  const got = await page.evaluate(async files => {
    const ctx = new OfflineAudioContext(1, 1, 44100), out = {};
    for (const f of files) {
      try {
        const buf = await ctx.decodeAudioData(await (await fetch('shared/sounds/' + encodeURIComponent(f))).arrayBuffer());
        const n = buf.length, w = Math.round(buf.sampleRate * 0.02), ch = [...Array(buf.numberOfChannels)].map((_, i) => buf.getChannelData(i));
        const loud = (a, b) => ch.some(d => { for (let i = a; i < b; i++) if (Math.abs(d[i]) > 0.0015) return true; return false; });
        // where the sound starts and stops (s from each end; up to 0.25 s looked at): a browser that keeps the MP3 encoder's
        // padding (WebKit) has a little silence at the ends, which shared/sfx.js loopPoints() skips when it plays a loop
        const isLoud = i => ch.some(d => Math.abs(d[i]) > 0.0015), lim = Math.min(n, Math.round(buf.sampleRate * 0.25));
        let a = 0, b = n - 1; while (a < lim && !isLoud(a)) a++; while (b > n - 1 - lim && !isLoud(b)) b--;
        out[f] = {length: buf.duration, head: loud(0, Math.min(n, w)), tail: loud(Math.max(0, n - w), n), startsAt: a / buf.sampleRate, endsBefore: (n - 1 - b) / buf.sampleRate};
      } catch (e) { out[f] = {error: String(e && e.message || e)}; }
    }
    return out;
  }, FILES);

  const bad = [];
  // a browser without AAC (the open-source Chromium the tests use) can't decode ANY .m4a: those are left to WebKit
  const m4a = FILES.filter(f => /\.m4a$/i.test(f));
  const noAac = m4a.length && m4a.every(f => got[f].error);
  if (noAac) test.info().annotations.push({type: 'note', description: 'this browser has no AAC decoder: .m4a files not decoded here'});
  // MP3 ENCODER PADDING: Chromium reads an MP3's gapless header and drops the encoder's delay and padding; WebKit keeps
  // them (each MP3 decodes 30–75 ms longer, a little silence at each end). The arcade never hears that silence (sfx.js
  // loopPoints() skips it, and every loop is crossfaded), so in such a browser an MP3 may be up to 0.08 s longer, and its
  // seam windows grow by exactly the padding this file gained
  const mp3Extra = FILES.filter(f => /\.mp3$/i.test(f) && processed(f) && !got[f].error).map(f => got[f].length - FIXTURE[f].length).sort((x, y) => x - y);
  const padded = mp3Extra.length > 10 && mp3Extra[Math.floor(mp3Extra.length / 2)] > 0.02;
  if (padded) test.info().annotations.push({type: 'note', description: 'this browser keeps MP3 encoder padding: MP3s checked with 0.08 s and the padding at the seam'});
  for (const f of FILES) {
    const r = got[f], aac = /\.m4a$/i.test(f);
    if (r.error) { if (!(aac && noAac)) bad.push(`${f}: does not decode (${r.error})`); continue; }
    if (!(r.length > 0)) { bad.push(`${f}: decodes to nothing`); continue; }
    if (!processed(f)) continue;                          // a new upload, not compressed yet: decoding is enough
    const e = FIXTURE[f];
    // browsers differ in hiding an AAC file's encoder priming, so .m4a gets 0.1 s here (ffmpeg checks 30 ms exactly)
    if (Math.abs(r.length - e.length) > (aac ? 0.1 : padded ? 0.08 : 0.03)) bad.push(`${f}: ${r.length.toFixed(3)} s, the upload was ${e.length} s`);
    const pad = !aac && padded ? Math.max(0, r.length - e.length) : 0;     // (0 where the browser drops the padding)
    if (!aac && e.head && !(pad ? r.startsAt < 0.02 + pad : r.head)) bad.push(`${f}: the loop's first 20 ms are silent (a gap at the seam)`);
    if (!aac && e.tail && !(pad ? r.endsBefore < 0.02 + pad : r.tail)) bad.push(`${f}: the loop's last 20 ms are silent (a gap at the seam)`);
  }
  expect(bad).toEqual([]);
});
