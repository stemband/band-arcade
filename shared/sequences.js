/* Band Arcade: note sequences for the note-reading games (Ghost Notes, Note Storm, Note Ninja, Chime Heist and
   any future game of this kind). Built on scales.js. Every such game gets its notes ONLY from here:

     Arcade.buildSequence({member, group, notes, order, level, count, pool}) ->
       {items, pool, fit, sig, scale, name(pc), small}
         items  the level's notes, each {n (the written note: letter, acc, oct, midi), show (how to draw it),
                label ('E♭'), midi (written), sounding (exact concert midi), pc (concert pitch class)}
         pool   the notes this level draws from (the whole pool, or level 1's smaller one)
         fit    notes to size the staff for (the whole pool, so the staff never jumps between levels)
         sig    the key signature ({type, count}) for scale pools, else null
         scale  the built scale (Scales.build) for scale and chromatic pools, else null
         name   pc -> a note name spelled for this pool's key (wrong-note messages)
     member  the instrument member (Arcade.currentMember()); group: its player group (first five, clef)
     notes   'first5' | 'Bb' | 'Eb' | 'F' | 'Ab' | 'chrom'
     order   'random' | 'order'
     level, count   the level number and its note count (from the game's levels.js)
     pool    optional: the level's `pool` from levels.js. Below 5 = the smaller starting pool. Without it, level 1.

   POOLS
     first5   the group's first five notes (Horn: the Starting notes setting picks hornF / hornC)
     Bb…Ab    the one-octave written scale for the member (8 notes, top tonic included), same octave as scale mode
     chrom    the member's whole GMEA chromatic range
   RANDOM: every pool note once before any repeats (a bag shuffle), never the same note twice in a row.
     The smaller starting pool (level 1): first5 -> the first three; a scale -> its first five;
     chrom -> one octave from the first-five tonic (inside the range). Chromatic notes are spelled with a sharp
     or a flat at random, like a real part.
   ORDER: up then down, then again from the second note until the level is full (Scales.sequence).
     first5 = the five notes up and down; chrom = the whole range up (sharps) and down (flats).
   STAFF: scale pools draw the key signature (accidentals only where the key needs them, `show`);
     first5 and chrom draw accidentals on the notes, no key signature. Answers (Note Ninja, Chime Heist) use
     `n`, so in scale pools they follow the key signature in both orders.

   PROGRESS KEYS: Arcade.progressKey(gameId, notes, order)
     first5 + random   '<game>'                 (the original key: old stars never move)
     scale  + order    '<game>:scale-<Bb|Eb|F|Ab|chrom>'   (the original SCALES keys)
     scale  + random   '<game>:random-<Bb|Eb|F|Ab>',  chrom + random '<game>:random-chromatic'
     first5 + order    '<game>:order-first5'
     KEY_OVERRIDES keeps a game's older keys (Chime Heist: chrom + order = ':chromatic', chrom + random = ':full'). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const S = A.Scales, {noteLabel, writtenMidi, mod12, spell} = A.music;

  const NOTES = [
    {id: 'first5', short: 'First 5'},
    {id: 'Bb', short: 'B♭'}, {id: 'Eb', short: 'E♭'}, {id: 'F', short: 'F'}, {id: 'Ab', short: 'A♭'},
    {id: 'chrom', short: 'Chromatic'},
  ];
  const ORDERS = [{id: 'random', label: 'Random'}, {id: 'order', label: 'Scale Order'}];

  /* a game's own older keys, so stars saved before NOTES × ORDER existed stay put */
  const KEY_OVERRIDES = {
    'chime-heist': {'chrom/order': 'chime-heist:chromatic', 'chrom/random': 'chime-heist:full'},
  };
  function progressKey(gameId, notes, order) {
    const o = (KEY_OVERRIDES[gameId] || {})[notes + '/' + order];
    if (o) return o;
    if (notes === 'first5') return order === 'order' ? `${gameId}:order-first5` : gameId;
    if (order === 'order') return S.progressKey(gameId, notes);                       // '<game>:scale-<id>'
    return `${gameId}:random-${notes === 'chrom' ? 'chromatic' : notes}`;
  }
  /** every progress key a game can have (all NOTES × ORDER combinations) */
  const allKeys = gameId => NOTES.flatMap(n => ORDERS.map(o => progressKey(gameId, n.id, o.id)));

  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  /** count picks from pool: every note once before any repeats, never the same pitch twice in a row */
  function bag(pool, count) {
    const out = [];
    while (out.length < count) {
      const b = shuffle(pool.slice());
      const last = out.length ? out[out.length - 1].midi : null;
      if (b.length > 1 && b[0].midi === last) { const k = b.findIndex(x => x.midi !== last); [b[0], b[k]] = [b[k], b[0]]; }
      out.push(...b);
    }
    return out.slice(0, count);
  }

  /* a written note dressed for play: exact sounding pitch, concert pitch class, the label, how to draw it */
  const dress = (m, n, show) => {
    const midi = n.midi != null ? n.midi : writtenMidi(n);
    return {n: Object.assign({}, n, {midi}), show: show || n, label: noteLabel(n), midi, sounding: midi - m.sounds, pc: mod12(midi - m.sounds)};
  };

  /** the full pool for a NOTES choice: {pool (dressed notes), scale, sig, ordered (the ORDER sequence's source)} */
  function poolOf(member, group, notes) {
    if (notes === 'first5') {
      const five = group.notes.map(n => dress(member, n));
      return {pool: five, scale: null, sig: null, ordered: five.concat(five.slice(0, -1).reverse())};
    }
    const sc = S.build(member, notes);
    const ordered = sc.notes.map(n => dress(member, n, sc.sig ? n.show : n));
    return {pool: notes === 'chrom' ? ordered.slice(0, sc.up.length) : ordered.slice(0, 8), scale: sc, sig: sc.sig, ordered};
  }

  /** level 1's smaller pool */
  function smallPool(member, group, notes, pool) {
    if (notes === 'first5') return pool.slice(0, 3);
    if (notes !== 'chrom') return pool.slice(0, 5);
    let start = writtenMidi(group.notes[0]);                       // one octave from the first-five tonic, inside the range
    while (start + 12 > member.highMidi) start -= 12;
    while (start < member.lowMidi) start += 12;
    return pool.filter(it => it.midi >= start && it.midi <= start + 12);
  }

  function buildSequence({member, group, notes = 'first5', order = 'random', level = 1, count = 8, pool: levelPool}) {
    group = group || A.getInstrument(member.group);
    const P = poolOf(member, group, notes);
    const small = order === 'random' && (levelPool != null ? levelPool < 5 : level === 1);
    const from = small ? smallPool(member, group, notes, P.pool) : P.pool;
    let items;
    if (order === 'order') {
      const out = P.ordered.slice();
      while (out.length < count) out.push(...P.ordered.slice(1));
      items = out;
    } else {
      items = bag(from, count);
      if (notes === 'chrom') items = items.map(it => {                        // black keys spelled either way, like a real part
        if (!it.n.acc) return it;
        const n = spell(it.midi, Math.random() < .5);
        return dress(member, n);
      });
    }
    const names = {};
    if (P.sig) P.pool.forEach(it => { if (!(it.pc in names)) names[it.pc] = it.label; });
    return {items, pool: from, fit: P.ordered.map(it => it.show), sig: P.sig, scale: P.scale, small,
            name: pc => names[pc] || group.writtenName(pc)};
  }

  A.NOTE_CHOICES = NOTES;
  A.ORDER_CHOICES = ORDERS;
  A.progressKey = progressKey;
  A.progressKeys = allKeys;
  A.buildSequence = buildSequence;
})(window.Arcade);
