/* THE RHYTHM STAFF: a rhythm (shared/counting.js) as printed music on a ONE-LINE PERCUSSION STAFF, with Mr. Graham's
   counting written underneath. Rhythm Dojo and its Counting Board use it; any game that shows a rhythm should.
   (Music Highway's notation.js spells durations itself from a melody; this one draws EXACTLY the written values it is
   given: a tie stays a tie, a dotted quarter stays one, triplets get their 3.)

     Arcade.RhythmStaff.engrave(parsed, opts) -> {svg, w, h, xAt(tick), xs (per note), bars, from, to}
       parsed = Arcade.Counting.parse(text, time); opts:
         from, to    the measures to draw (0-based, `to` excluded; default all): long rhythms go on several rows. A tie
                     or a counting group that crosses into the next row continues there (half ties at the edges)
         counting    true (default): the counting underneath
         showTime    the time signature (default: on the first measure only)
         final       a final double bar at the end (default: when the row ends the rhythm)
         id          a prefix for element ids (several staffs on one page)
         sticking    false (default): true = R / L under each head (small under grace heads), as large as the counting's
                     big syllables; with the counting on it goes under the counting and the staff is 40 px taller
         rolls       'slash' (default): each / a bold diagonal centered on the stem, halfway between head and beam (// /// stacked);
                     'written': a / note drawn as its two strokes (half the value, same hand, beamed by the beat: 32nds
                     get a third beam), each its own g.rn with data-s 0 / 1. A z is a small "z" on the stem either way.
       Accents (>) are drawn above the stems and beams (above a triplet's 3: then the drawing moves down `lift` px) and
       grace notes left of their note (one: a small slashed eighth; two or more: small beamed sixteenths; a small slur from the first grace to the note, drawing only), with
       room made before them. These come from the text, so a rhythm without them draws exactly as before.
       Also returns `strokes`: [{n, s, x}] one per drawn head (graces s < 0), for lighting each stroke as it plays; in
       'written' mode `notes` and `xs` are the drawn strokes (each keeps its parsed note's i, plus s).
     Arcade.RhythmStaff.refine(root)   re-measures the counting with the real font (after the SVG is in the page), so the
                                       small syllables sit right after the big one and the underline spans them exactly
     Arcade.RhythmStaff.rows(parsed, maxPerRow)  -> [[from, to], …] measures split evenly into rows

   THE PARTS (classes, for a game's CSS): notes `g.rn` (data-n = note index, data-g = counting group), counting groups
   `g.rc` (data-g) holding `text.rc-big` (data-t = its tick), `text.rc-small` (data-t), `text.rc-par` (rest parentheses)
   and `line.rc-u` (the underline under the small syllables only); rudiments: `text.rs-hand` (data-n, data-s),
   `text.rs-hand.grace`, `path.rs-acc`, `g.rs-grace` (data-n = the main note), `path.rs-slash`, `text.rs-buzz`, `path.rs-gslur` (a grace group's slur, drawing only). Colors are currentColor: style them with tokens.
   SPACING like printed music: space grows with the note's length (log), then widened wherever a note's counting
   needs more room than its value gives; a fixed pad after every bar line. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const LINE = 70, STEM = 48, TOP = LINE - STEM - 2, HEAD_RX = 7.6, HEAD_RY = 5.4, STEM_DX = 6.6;
  const BIG = {fs: 30, y: 134}, SMALL = {fs: 19, y: 116}, UNDER_Y = 122, H = 144;
  const S = {base: 40, grow: 24, barPad: 28, head: 98, gap: 12, endPad: 22};
  const round = v => Math.round(v * 10) / 10;

  /* estimated text widths (Atkinson Hyperlegible Bold), in em; refine() replaces them with real measurements */
  const EM = {'&': .74, e: .58, a: .57, l: .3, '(': .34, ')': .34, ' ': .26, '·': .3};
  const tw = (s, fs) => [...String(s)].reduce((w, c) => w + (EM[c] != null ? EM[c] : /\d/.test(c) ? .6 : .6), 0) * fs;
  const SMALL_GAP = 6;                                          // between two small syllables
  function countingWidth(big, small, rest) {
    let w = tw(big, BIG.fs);
    if (small.length) w += 2 + small.reduce((s, x, k) => s + tw(x.text, SMALL.fs) + (k ? SMALL_GAP : 0), 0);
    if (rest) w += 2 * tw('(', BIG.fs);
    return w;
  }
  const durW = d => S.base + S.grow * Math.log2(Math.max(1, d / 3));
  /* RUDIMENT NOTATION: grace notes (GR: the last one `lead` px left of its note, `step` apart, `pad` more room before them),
     the sticking row (HAND: the letters as large as the counting's big syllables; `below` = its drop under the counting) */
  const GR = {lead: 24, step: 13, pad: 8, sc: .62, stem: 26}, HAND = {fs: 30, grace: 18, below: 40}, ACC_Y = TOP - 9, ACC_TRIP_Y = TOP - 27, TRIP_LIFT = 16;
  const graceRoom = n => n.graces && n.graces.length ? GR.lead + (n.graces.length - 1) * GR.step + GR.pad : 0;
  const graceX = (n, x, j) => x - GR.lead - (n.graces.length - 1 - j) * GR.step;
  /* the buzz "z", sized by its GLYPH (a lowercase italic z is only about half its font size tall): its drawn height ≈
     `ink` × a big sticking letter's cap height. The estimate here (xh = the z's height in em); refine() measures the real
     fonts and sets it exactly. */
  const BUZZ = {fs: Math.round(HAND.grace * 1.6), xh: .48, ink: .6, font: 'Georgia,serif'};
  const HALF = {w: 'h', h: 'q', q: 'e', e: 's', s: 't'}, LEVELS = {e: 1, s: 2, t: 3};
  /* rolls: 'written': a slashed note becomes its two strokes (half the value each, same hand; s = 0, 1) */
  const writeOut = list => list.flatMap(n => n.rest || !n.roll || n.buzz ? [n] : [0, 1].map(s => Object.assign({}, n,
    {t: n.t + s * n.d / 2, d: n.d / 2, val: HALF[n.val], s, roll: 0, accent: s ? false : n.accent, graces: s ? [] : n.graces, tie: s ? n.tie : false})));

  function rows(p, maxPerRow) {
    const n = Math.max(1, p.measures), k = Math.ceil(n / Math.max(1, maxPerRow)), per = Math.ceil(n / k), out = [];
    for (let a = 0; a < n; a += per) out.push([a, Math.min(n, a + per)]);
    return out;
  }

  function engrave(p, o = {}) {
    const C = A.Counting, M = p.meter, from = o.from || 0, to = o.to == null ? p.measures : o.to;
    const counting = o.counting !== false, pre = o.id || 'rs', sticking = !!o.sticking, written = o.rolls === 'written';
    const t0 = from * M.per, t1 = to * M.per;
    const parsedHere = p.notes.filter(n => n.t >= t0 && n.t < t1), notes = written ? writeOut(parsedHere) : parsedHere;
    const groups = o.groups || C.groups(p);
    const groupOf = {}; groups.forEach(g => g.notes.forEach(i => { groupOf[i] = g; }));
    const showTime = o.showTime == null ? from === 0 : o.showTime;
    const final = o.final == null ? to >= p.measures : o.final;

    /* ---------- horizontal layout ---------- */
    const x0 = showTime ? S.head : S.head - 40;
    const w = notes.map(n => durW(n.d) + (n.dots ? 8 : 0)), gr = notes.map(graceRoom);
    const xs = [];
    const place = () => {
      let x = x0, m = notes.length ? notes[0].measure : from; const bars = [];
      notes.forEach((n, k) => {
        if (n.measure !== m) { const bx = x - S.gap; bars.push({x: bx, m}); x = bx + S.barPad; m = n.measure; }
        x += gr[k]; xs[k] = x; x += w[k];
      });
      return {bars, end: x - S.gap};
    };
    // the counting groups this row shows, with the note (index into `notes`) they are drawn at
    const idx = {}, lastIdx = {}; notes.forEach((n, k) => { if (!n.s) idx[n.i] = k; lastIdx[n.i] = k; });
    const shown = [];
    if (counting) groups.forEach(g => {
      if (g.end <= t0 || g.t >= t1) return;
      const cont = g.t < t0;                                     // a tie from the previous row: only the small syllables go on
      const small = g.small.filter(s => s.t >= t0 && s.t < t1);
      const at = cont ? g.notes.map(i => idx[i]).find(k => k != null) : idx[g.notes[0]];
      if (at == null || (cont && !small.length)) return;
      shown.push({g, cont, small, at, rest: g.rest});
    });
    let L = place();
    for (let pass = 0; pass < 3; pass++) {                        // widen where the counting needs more room
      let changed = false;
      shown.forEach((s, j) => {
        const next = shown[j + 1], need = countingWidth(s.cont ? '' : s.g.big, s.small, s.rest && !s.cont) + 20;
        const left = xs[s.at] - (s.cont ? 0 : tw(s.g.big, BIG.fs) / 2 + (s.rest ? tw('(', BIG.fs) : 0));
        const right = next ? xs[next.at] - (next.cont ? 0 : tw(next.g.big, BIG.fs) / 2 + (next.rest ? tw('(', BIG.fs) : 0)) : L.end + S.endPad;
        const lack = left + need - right;
        if (lack > .5) { const last = next ? next.at - 1 : notes.length - 1; w[Math.max(s.at, last)] += lack; changed = true; }
      });
      L = place();
      if (!changed) break;
    }
    const endX = L.end + S.endPad * .6 + (final ? 6 : 0), W = Math.ceil(endX + 8);

    /* ---------- drawing ---------- */
    const out = [];
    // the staff line, the clef (two bars), the time signature
    out.push(`<line class="rs-line" x1="6" y1="${LINE}" x2="${round(endX)}" y2="${LINE}" stroke="currentColor" stroke-width="2"/>`);
    out.push(`<rect x="16" y="${LINE - 14}" width="5" height="28" fill="currentColor"/><rect x="26" y="${LINE - 14}" width="5" height="28" fill="currentColor"/>`);
    if (showTime) out.push(`<g class="rs-time" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="34" text-anchor="middle" fill="currentColor">` +
      `<text x="58" y="${LINE - 3}">${M.num}</text><text x="58" y="${LINE + 27}">${M.den}</text></g>`);
    L.bars.forEach(b => out.push(`<line class="rs-bar" x1="${round(b.x)}" y1="${LINE - 22}" x2="${round(b.x)}" y2="${LINE + 22}" stroke="currentColor" stroke-width="2"/>`));
    if (final) out.push(`<line x1="${round(endX - 8)}" y1="${LINE - 22}" x2="${round(endX - 8)}" y2="${LINE + 22}" stroke="currentColor" stroke-width="2"/><rect x="${round(endX - 4)}" y="${LINE - 22}" width="5" height="44" fill="currentColor"/>`);
    else out.push(`<line class="rs-bar" x1="${round(endX)}" y1="${LINE - 22}" x2="${round(endX)}" y2="${LINE + 22}" stroke="currentColor" stroke-width="2"/>`);

    // beams: runs of eighths/sixteenths in one beat (6/8: a dotted quarter); rests break them; a triplet is its own group
    const unit = M.compound ? 18 : 12, beamable = n => !n.rest && !!LEVELS[n.val];
    const beamOf = {}, beams = [];
    for (let k = 0; k < notes.length; k++) {
      const n = notes[k];
      if (!beamable(n)) continue;
      const key = n.trip ? 't' + n.trip : 'b' + Math.floor(n.t / unit);
      const last = beams[beams.length - 1];
      if (last && last.key === key && last.ks[last.ks.length - 1] === k - 1) last.ks.push(k); else beams.push({key, ks: [k]});
    }
    beams.filter(b => b.ks.length > 1).forEach(b => b.ks.forEach(k => { beamOf[k] = b; }));

    const strokes = [];
    notes.forEach((n, k) => {
      const x = xs[k], g = groupOf[n.i], gi = g ? g.g : -1;
      const parts = [];
      if (n.rest) parts.push(`<g transform="translate(${round(x)} ${LINE}) scale(${n.val === 'w' || n.val === 'h' ? 1.15 : 1.4}) translate(${-round(x)} ${-LINE})">${restSVG(n, x)}</g>`);
      else {
        const hollow = n.val === 'w' || n.val === 'h';
        parts.push(`<ellipse cx="${round(x)}" cy="${LINE}" rx="${HEAD_RX}" ry="${HEAD_RY}" transform="rotate(-20 ${round(x)} ${LINE})" ${hollow ? 'fill="none" stroke="currentColor" stroke-width="2.6"' : 'fill="currentColor"'}/>`);
        if (n.val !== 'w') {
          const sx = x + STEM_DX;
          parts.push(`<line x1="${round(sx)}" y1="${LINE - 2}" x2="${round(sx)}" y2="${TOP}" stroke="currentColor" stroke-width="2.4"/>`);
          if (!beamOf[k] && LEVELS[n.val]) parts.push(flagSVG(sx, LEVELS[n.val]));
        }
        if (n.roll || n.buzz) {
          // halfway between the head and the beam (the stem's end when there is no beam; a whole note: above its head)
          const stem = n.val !== 'w', cx = stem ? x + STEM_DX : x;
          const top = beamOf[k] ? TOP + (LEVELS[n.val] - 1) * 10 + 6.5 : TOP, mid = stem ? (top + LINE - HEAD_RY - 2) / 2 : LINE - 22;
          if (n.roll) parts.push(slashSVG(cx, mid, n.roll));
          else parts.push(`<text class="rs-buzz" data-mid="${round(mid)}" x="${round(cx)}" y="${round(mid + BUZZ.fs * BUZZ.xh / 2)}" font-family="${BUZZ.font}" font-style="italic" font-weight="700" font-size="${BUZZ.fs}" text-anchor="middle" fill="currentColor">z</text>`);
        }
      }
      if (n.dots) for (let d = 0; d < n.dots; d++) parts.push(`<circle cx="${round(x + 15 + d * 8)}" cy="${LINE - 5}" r="2.8" fill="currentColor"/>`);
      out.push(`<g class="rn${n.rest ? ' rest' : ''}" data-n="${n.i}"${written ? ` data-s="${n.s || 0}"` : ''} data-g="${gi}" id="${pre}-n${n.i}${n.s ? 's' + n.s : ''}">${parts.join('')}</g>`);
      if (!n.rest && n.graces && n.graces.length) out.push(graceSVG(n, x), graceSlurSVG(n, x));
      if (!n.rest) {
        strokes.push({n: n.i, s: n.s || 0, x: round(x)});
        if (n.graces) n.graces.forEach((h, j) => strokes.push({n: n.i, s: j - n.graces.length, x: round(graceX(n, x, j))}));
      }
    });
    strokes.sort((a, b) => a.n - b.n || a.s - b.s);
    // beams (primary + the sixteenths' secondary beams, a stub for a lone sixteenth)
    beams.filter(b => b.ks.length > 1).forEach(b => {
      const sx = k => xs[k] + STEM_DX, first = b.ks[0], last = b.ks[b.ks.length - 1];
      out.push(`<rect class="rs-beam" x="${round(sx(first) - 1.2)}" y="${TOP}" width="${round(sx(last) - sx(first) + 2.4)}" height="6.5" fill="currentColor"/>`);
      for (let lv = 2; lv <= 3; lv++) b.ks.forEach((k, j) => {         // 2: the sixteenths' beam, 3: the 32nds'
        const has = q => q != null && LEVELS[notes[q].val] >= lv, y = TOP + (lv - 1) * 10;
        if (!has(k)) return;
        const nx = b.ks[j + 1], pv = b.ks[j - 1];
        if (has(nx)) out.push(`<rect x="${round(sx(k) - 1.2)}" y="${y}" width="${round(sx(nx) - sx(k) + 2.4)}" height="6.5" fill="currentColor"/>`);
        else if (!has(pv)) {
          const toL = pv != null && (nx == null || notes[pv].dots), x1 = toL ? sx(k) - 11 : sx(k) - 1.2;
          out.push(`<rect x="${round(x1)}" y="${y}" width="12.2" height="6.5" fill="currentColor"/>`);
        }
      });
    });
    // triplets: a 3 over the beam, or a bracket with a 3 when the notes aren't beamed as one group
    const trips = {}; notes.forEach((n, k) => { if (n.trip) (trips[n.trip] = trips[n.trip] || []).push(k); });
    Object.values(trips).forEach(ks => {
      const a = xs[ks[0]], b = xs[ks[ks.length - 1]] + STEM_DX, mid = (a + b) / 2, beamed = beamOf[ks[0]] && beamOf[ks[0]].ks.length === ks.length;
      const y = TOP - 8;
      if (!beamed) out.push(`<path d="M${round(a - 6)} ${y + 6}V${y}H${round(mid - 10)}M${round(mid + 10)} ${y}H${round(b + 2)}V${y + 6}" fill="none" stroke="currentColor" stroke-width="1.6"/>`);
      out.push(`<text x="${round(mid)}" y="${y + 5}" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="20" text-anchor="middle" fill="currentColor">3</text>`);
    });
    // ties (under the heads, stems are up); half ties at the edges of a row
    p.notes.forEach(n => {
      if (!n.tie) return;
      const a = lastIdx[n.i], b = idx[n.i + 1];
      if (a == null && b == null) return;
      const xa = a != null ? xs[a] + 4 : x0 - 30, xb = b != null ? xs[b] - 4 : endX + 4;
      out.push(tieSVG(xa, xb));
    });
    // accents: a > above the note, above the beam (every stem reaches TOP), above a triplet's 3
    notes.forEach((n, k) => { if (n.accent && !n.rest) out.push(accentSVG(xs[k], n.trip ? ACC_TRIP_Y : ACC_Y)); });
    // the counting
    if (counting) shown.forEach(s => out.push(countingSVG(s, xs[s.at], pre)));
    // the sticking: R / L under each head (small under the grace notes); under the counting when both are shown
    const handY = counting ? BIG.y + HAND.below : BIG.y;
    if (sticking) {
      const letters = [];
      notes.forEach((n, k) => {
        if (n.rest) return;
        if (n.graces) n.graces.forEach((h, j) => letters.push(handSVG(h, graceX(n, xs[k], j), handY, HAND.grace, n.i, j - n.graces.length, true)));
        if (n.hand) letters.push(handSVG(n.hand, xs[k], handY, HAND.fs, n.i, n.s || 0, false));
      });
      out.push(`<g class="rs-sticking" font-family="'GN Text','Atkinson Hyperlegible',sans-serif" font-weight="700" fill="currentColor" text-anchor="middle">${letters.join('')}</g>`);
    }

    const xAt = tick => {
      if (!notes.length) return x0;
      if (tick <= notes[0].t) return xs[0];
      for (let k = 0; k < notes.length; k++) {
        const a = notes[k].t, b = k + 1 < notes.length ? notes[k + 1].t : t1;
        if (tick < b) { const xb = k + 1 < notes.length ? xs[k + 1] : endX - (final ? 10 : 2); return xs[k] + (xb - xs[k]) * (tick - a) / (b - a); }
      }
      return endX - (final ? 10 : 2);
    };
    // an accented triplet's > goes above its 3: the drawing moves down to make room
    const lift = notes.some(n => n.accent && n.trip) ? TRIP_LIFT : 0, Ht = H + (sticking && counting ? HAND.below : 0) + lift;
    const body = lift ? `<g transform="translate(0 ${lift})">${out.join('')}</g>` : out.join('');
    const svg = `<svg class="rs" viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}" role="img" aria-label="${o.label || 'Rhythm'}" data-from="${from}" data-to="${to}">${body}</svg>`;
    return {svg, w: W, h: Ht, xAt, xs, notes, strokes, bars: L.bars, from, to, t0, t1, lift};
  }

  function flagSVG(sx, n) {
    let s = '';
    for (let k = 0; k < n; k++) {
      const y = TOP + k * 10;
      s += `<path d="M${round(sx)} ${y}c1 7 12 10 11 20c-.4 4-2 7-3.4 9c1-3 1.6-6 .6-9c-1.4-5-6-7-8.2-8.4z" fill="currentColor"/>`;
    }
    return s;
  }
  /* a roll's slashes: bold diagonals (about a beam's thickness) centered on the stem at `mid`, rising left to right;
     // and /// stack parallel, evenly spaced around mid */
  const SL = {half: 7, rise: 2.5, thick: 4.6, gap: 8};
  function slashSVG(cx, mid, n) {
    let s = '';
    for (let j = 0; j < n; j++) {
      const cy = mid + (j - (n - 1) / 2) * SL.gap, t = SL.thick / 2, l = cx - SL.half, r = cx + SL.half;
      s += `<path class="rs-slash" d="M${round(l)} ${round(cy + SL.rise + t)}L${round(r)} ${round(cy - SL.rise + t)}L${round(r)} ${round(cy - SL.rise - t)}L${round(l)} ${round(cy + SL.rise - t)}z" fill="currentColor"/>`;
    }
    return s;
  }
  function accentSVG(x, y) {
    return `<path class="rs-acc" d="M${round(x - 7)} ${round(y - 4.5)}L${round(x + 7)} ${round(y)}L${round(x - 7)} ${round(y + 4.5)}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="miter"/>`;
  }
  /* grace notes before the note at x: one = a small eighth with a slash (a flam); two or more = small beamed sixteenths */
  function graceSVG(n, x) {
    const g = n.graces, rx = HEAD_RX * GR.sc, ry = HEAD_RY * GR.sc, top = LINE - GR.stem, parts = [];
    const sxs = g.map((h, j) => graceX(n, x, j) + STEM_DX * GR.sc);
    g.forEach((h, j) => {
      const gx = graceX(n, x, j);
      parts.push(`<ellipse cx="${round(gx)}" cy="${LINE}" rx="${round(rx)}" ry="${round(ry)}" transform="rotate(-20 ${round(gx)} ${LINE})" fill="currentColor"/>`);
      parts.push(`<line x1="${round(sxs[j])}" y1="${LINE - 1}" x2="${round(sxs[j])}" y2="${top}" stroke="currentColor" stroke-width="1.6"/>`);
    });
    if (g.length === 1) {
      const sx = sxs[0];
      parts.push(`<path d="M${round(sx)} ${top}c.6 4.3 7.4 6.2 6.8 12.4c-.25 2.5-1.2 4.3-2.1 5.6c.6-1.9 1-3.7.4-5.6c-.9-3.1-3.7-4.3-5.1-5.2z" fill="currentColor"/>`);
      parts.push(`<line x1="${round(sx - 5)}" y1="${LINE - 8}" x2="${round(sx + 7)}" y2="${top + 5}" stroke="currentColor" stroke-width="1.6"/>`);
    } else {
      const a = sxs[0] - .8, wd = sxs[sxs.length - 1] - sxs[0] + 1.6;
      parts.push(`<rect x="${round(a)}" y="${top}" width="${round(wd)}" height="3.6" fill="currentColor"/><rect x="${round(a)}" y="${top + 6}" width="${round(wd)}" height="3.6" fill="currentColor"/>`);
    }
    return `<g class="rs-grace" data-n="${n.i}">${parts.join('')}</g>`;
  }
  /* the grace-note slur: DRAWING ONLY (never a tie: the counting, strokes and ticks don't know it), under the heads from
     the first grace head to its own main note's head, thin like a tie */
  function graceSlurSVG(n, x) {
    const x1 = graceX(n, x, 0), x2 = x - 2, y1 = LINE + 4, y2 = LINE + 6, m = (x1 + x2) / 2, d = 6;
    return `<path class="rs-gslur" data-n="${n.i}" d="M${round(x1)} ${y1}Q${round(m)} ${y2 + d + 2} ${round(x2)} ${y2}Q${round(m)} ${y2 + d} ${round(x1)} ${y1}z" fill="currentColor" stroke="currentColor" stroke-width=".6"/>`;
  }
  function handSVG(h, x, y, fs, n, s, grace) {
    return `<text class="rs-hand${grace ? ' grace' : ''}" data-n="${n}" data-s="${s}" x="${round(x)}" y="${y}" font-size="${fs}">${h}</text>`;
  }
  function tieSVG(x1, x2) {
    const y = LINE + 9, m = (x1 + x2) / 2, d = Math.min(12, 5 + (x2 - x1) * .06);
    return `<path class="rs-tie" d="M${round(x1)} ${y}Q${round(m)} ${round(y + d + 3)} ${round(x2)} ${y}Q${round(m)} ${round(y + d)} ${round(x1)} ${y}z" fill="currentColor" stroke="currentColor" stroke-width=".8"/>`;
  }
  function restSVG(n, x) {
    const c = 'fill="currentColor"';
    switch (n.val) {
      case 'w': return `<rect x="${round(x - 9)}" y="${LINE}" width="18" height="8" ${c}/>`;
      case 'h': return `<rect x="${round(x - 9)}" y="${LINE - 8}" width="18" height="8" ${c}/>`;
      case 'q': return `<path transform="translate(${round(x - 7)} ${LINE - 19})" d="M4 0l9 11c-3 3-5 7-2 11l4 5c-4-2-9-1-8 3c.5 3 3 5 3 5c-5-2-9-7-5-11c2-2 5-2 6-1l-8-9c3-3 5-7 1-12z" ${c}/>`;
      default: {                                               // eighth (one hook) and sixteenth (two)
        const k = n.val === 's' ? 2 : 1;
        let s = `<path d="M${round(x + 4)} ${LINE - 8}L${round(x - 3 - (k - 1) * 3)} ${LINE + 14 + (k - 1) * 10}" stroke="currentColor" stroke-width="2.4" fill="none"/>`;
        for (let j = 0; j < k; j++) {
          const y = LINE - 6 + j * 10, xx = x - j * 3;
          s += `<circle cx="${round(xx - 4)}" cy="${y}" r="3.6" ${c}/><path d="M${round(xx - 5)} ${y + 2}q5 2 9.5-2.4" stroke="currentColor" stroke-width="2" fill="none"/>`;
        }
        return s;
      }
    }
  }

  /* one counting group: [(] BIG small small … [)] with the underline under the small ones only */
  function countingSVG(s, x, pre) {
    const g = s.g, parts = [], bigW = s.cont ? 0 : tw(g.big, BIG.fs);
    let cx = x - bigW / 2;
    const txt = (cls, t, str, xx, y, fs, anchor = 'start') =>
      `<text class="${cls}"${t != null ? ` data-t="${t}"` : ''} x="${round(xx)}" y="${y}" font-size="${fs}" text-anchor="${anchor}">${str === '&' ? '&amp;' : str}</text>`;
    const paren = s.rest && !s.cont;
    if (paren) parts.push(txt('rc-par', null, '(', cx - tw('(', BIG.fs), BIG.y, BIG.fs));
    if (!s.cont) { parts.push(txt('rc-big', g.bigT, g.big, cx, BIG.y, BIG.fs)); cx += bigW + 2; }
    let u0 = null, u1 = null;
    s.small.forEach((sm, k) => {
      if (k) cx += SMALL_GAP;
      parts.push(txt('rc-small', sm.t, sm.text, cx, SMALL.y, SMALL.fs));
      if (u0 == null) u0 = cx;
      cx += tw(sm.text, SMALL.fs); u1 = cx;
    });
    if (u0 != null) parts.push(`<line class="rc-u" x1="${round(u0)}" y1="${UNDER_Y}" x2="${round(u1)}" y2="${UNDER_Y}" stroke="currentColor" stroke-width="2"/>`);
    if (paren) parts.push(txt('rc-par', null, ')', cx - (s.small.length ? -1 : 1), BIG.y, BIG.fs));
    return `<g class="rc${g.rest ? ' rest' : ''}${s.cont ? ' cont' : ''}" data-g="${g.g}" data-x="${round(x)}" id="${pre}-c${g.g}${s.cont ? 'b' : ''}" font-family="'GN Text','Atkinson Hyperlegible',sans-serif" font-weight="700" fill="currentColor">${parts.join('')}</g>`;
  }

  /* the ink height of a glyph (canvas TextMetrics: the drawn bounds, not the font's box) */
  let inkCtx = null;
  function ink(text, font) {
    try {
      inkCtx = inkCtx || document.createElement('canvas').getContext('2d');
      inkCtx.font = font; const m = inkCtx.measureText(text);
      return {asc: m.actualBoundingBoxAscent || 0, desc: m.actualBoundingBoxDescent || 0};
    } catch (e) { return {asc: 0, desc: 0}; }
  }
  /** the buzz z: its drawn height = BUZZ.ink × a big sticking letter's cap height (never under the grace letters' size),
      centered on its slash height (data-mid) */
  function refineBuzz(root) {
    const zs = (root || document).querySelectorAll('text.rs-buzz');
    if (!zs.length) return;
    const cap = ink('R', `700 ${HAND.fs}px 'GN Text','Atkinson Hyperlegible',sans-serif`), capH = cap.asc + cap.desc;
    const z = ink('z', `italic 700 100px ${BUZZ.font}`), zH = (z.asc + z.desc) / 100;
    if (!(capH > 0) || !(zH > 0)) return;                    // no canvas text metrics: keep the estimate
    const fs = Math.max(HAND.grace, BUZZ.ink * capH / zH);
    zs.forEach(t => {
      const mid = +t.dataset.mid;
      t.setAttribute('font-size', round(fs));
      if (!isNaN(mid)) t.setAttribute('y', round(mid + fs * (z.asc - z.desc) / 100 / 2));
    });
  }

  /* after the SVG is in the page: lay each counting group out again with the real widths (and size the buzz z) */
  function refine(root) {
    refineBuzz(root);
    (root || document).querySelectorAll('g.rc').forEach(gr => {
      const x = +gr.dataset.x, big = gr.querySelector('.rc-big'), pars = gr.querySelectorAll('.rc-par'), small = gr.querySelectorAll('.rc-small');
      let bw = 0;
      try { bw = big ? big.getComputedTextLength() : 0; } catch (e) { return; }
      if (big && !bw) return;                                 // not rendered (hidden): keep the estimate
      let cx = x - bw / 2;
      if (pars[0]) pars[0].setAttribute('x', round(cx - pars[0].getComputedTextLength()));
      if (big) { big.setAttribute('x', round(cx)); cx += bw + 2; }
      let u0 = null;
      small.forEach((s, k) => { if (k) cx += SMALL_GAP; s.setAttribute('x', round(cx)); if (u0 == null) u0 = cx; cx += s.getComputedTextLength(); });
      const u = gr.querySelector('.rc-u');
      if (u && u0 != null) { u.setAttribute('x1', round(u0)); u.setAttribute('x2', round(cx)); }
      if (pars[1]) pars[1].setAttribute('x', round(cx - (small.length ? -1 : 1)));
    });
  }

  A.RhythmStaff = {engrave, refine, rows, LINE, H, BUZZ};
})(window.Arcade);
