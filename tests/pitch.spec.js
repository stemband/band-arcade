/* PITCH ENGINE (Chromium only): synthesized instrument-like tones go straight through the detector's own analysis
   (Arcade.Pitch._analyse: the same code the microphone uses, without the hold/steadiness timing), for every written
   note of each instrument's GMEA chromatic range, and must come out as exactly the right SOUNDING note: never a
   twelfth, a fifth or an octave off. Both ways the games listen: the instrument's default search range (First 5) and
   the member's own range (scales and Chromatic: Pitch.setRange). */
const {test, expect} = require('@playwright/test');
const {prepare} = require('./helpers');

/* harmonic amplitudes (1st, 2nd, 3rd…): the timbres that trip up pitch detectors.
   The two clarinet tones are the hard case: with the engine's twelfth/octave check (pitch.js lowerCandidate)
   switched off, EVERY one of their notes reads a twelfth too high, so these tests catch that bug coming back. */
const TIMBRES = [
  ['clarinet', 'clarinet (12% fundamental)', [0.12, 0.02, 1, 0.02, 0.15, 0.01, 0.08]],   // strong 3rd, weak 2nd
  ['clarinet', 'clarinet (8% fundamental)',  [0.08, 0.02, 1, 0.01, 0.12, 0.01, 0.06]],
  ['clarinet', 'clarinet (fuller)',          [0.2, 0.05, 1, 0.03, 0.3, 0.02, 0.2, 0.01, 0.1]],
  ['flute',    'flute',                      [1, 0.45, 0.15, 0.08, 0.03]],
  ['altosax',  'alto sax (loud 2nd)',        [1, 0.95, 0.55, 0.4, 0.3, 0.2, 0.15, 0.1]],
  ['tenorsax', 'tenor sax',                  [0.8, 1, 0.5, 0.4, 0.3, 0.2]],
  ['trumpet',  'trumpet',                    [1, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1]],
  ['tuba',     'tuba',                       [1, 0.6, 0.3, 0.15, 0.08]],
];

test.describe('pitch engine', () => {
  test.skip(({browserName}) => browserName !== 'chromium', 'the pitch tests run in Chromium only');

  for (const [member, name, harmonics] of TIMBRES) {
    test(`${name}-like tones read as the right note, octave-exact`, async ({page}) => {
      const watch = await prepare(page, {store: {player: member, members: {}, games: {}, modes: {}}});
      await page.goto('note-checker/index.html?demo&nostart');
      const res = await page.evaluate(([id, harmonics]) => {
        const A = Arcade, P = A.Pitch, m = A.memberById(id), group = A.groupFor(id);
        const sr = 44100, N = 4096;
        const tone = (midi, seed) => {
          const f = 440 * Math.pow(2, (midi - 69) / 12), buf = new Float32Array(N);
          let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - .5; };
          const ph = harmonics.map(() => rnd() * 6.28);
          for (let i = 0; i < N; i++) {
            let v = 0;
            harmonics.forEach((a, k) => { if (f * (k + 1) < sr / 2) v += a * Math.sin(2 * Math.PI * f * (k + 1) * i / sr + ph[k]); });
            buf[i] = v * 0.12 + rnd() * 0.004;                     // + a little room noise
          }
          return buf;
        };
        const notes = A.chromaticScale(m).map(n => ({written: n.midi, sounding: n.sounding}));
        const out = {range: [], plain: [], checked: 0};
        P.setInstrument(group);
        const run = list => notes.forEach((n, i) => {
          const a = P._analyse(tone(n.sounding, 7 + i), sr), r = a.reading;
          out.checked++;
          if (!r || r.note !== n.sounding) list.push(`written ${n.written} (sounding ${n.sounding}) read as ${r ? r.note : 'nothing'}`);
        });
        P.setRange(Math.min(...notes.map(n => n.sounding)), Math.max(...notes.map(n => n.sounding)));
        run(out.range);
        P.setRange(null);
        // the default search (First 5: no range set): the group's first five notes, written → sounding
        group.notes.forEach((n, i) => {
          const w = A.music.writtenMidi(n), s = w - m.sounds, r = (P._analyse(tone(s, 99 + i), sr) || {}).reading;
          out.checked++;
          if (!r || r.pc !== ((s % 12) + 12) % 12) out.plain.push(`first-five note ${w} (sounding ${s}) read as ${r ? r.note : 'nothing'}`);
        });
        return out;
      }, [member, harmonics]);
      expect(res.checked).toBeGreaterThan(20);
      expect(res.range, `${member}: misread notes with the member's range (scales / Chromatic)`).toEqual([]);
      expect(res.plain, `${member}: misread first-five notes (the default search)`).toEqual([]);
      watch.check();
    });
  }
});
