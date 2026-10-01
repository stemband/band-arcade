/* Band Arcade: THE AVATAR (Create Your Player). One avatar per device, shown everywhere in the arcade.
   The parts are in shared/avatar-parts.js, the name words in shared/avatar-names.js; this file saves avatars and
   draws them. Load order: storage.js … portraits.js, skins.js, avatar-parts.js, avatar-names.js, avatar.js.

     Arcade.Avatar.get()                the device's avatar (a random one is made and saved on the first visit)
     Arcade.Avatar.set(av)              save it (every picture of it on the page is redrawn)
     Arcade.Avatar.guest() / setGuest() Neon Face-Off's Player 2: a GUEST avatar, remembered separately
     Arcade.Avatar.random({keep, only}) a random avatar (only: a list of fields to change, keep: the rest)
     Arcade.Avatar.nameOf(av)           "Captain Brassy Blaze"   (Arcade.Avatar.randomName(), Arcade.Avatar.words(kind))
     A saved name with a NEVER-USE word (avatar-names.js) or an old first initial is fixed once when it's read: the
     word becomes a random one from the same list, the initial is dropped, it's saved, and the badge shows "Your name
     got an upgrade!" once (Arcade.Avatar.nameNote()).
     Arcade.avatarHTML({size, member, avatar, guest, skin, label, cls})
                                        THE PORTRAIT BUST in a .pt-box (theme.css): size 'big' | 'tile' | 'chip'.
                                        member = the instrument whose equipped skin it wears (default the saved
                                        player); skin {color, acc} overrides it, false = none. Color skins are the
                                        same effects as on the instrument portraits (rim glow, aura, backdrop…);
                                        accessories are drawn ON the avatar as pixels (a crown, a cape…).
     Arcade.Avatar.bustURL(av, eq)      the bust as an image URL (cached: redrawn only when the avatar changes)
     Arcade.Avatar.sprites(member, {avatar, eq})
                                        THE FULL-BODY SPRITES for Arcade Quest (needs shared/instrument-sprites.js for
                                        the instruments): {'': idle, '-walk', '-front', '-front-walk', '-back',
                                        '-back-walk', '-play'} -> {w, h, fps, frames: [canvas…], strike?}. Layers,
                                        back to front: legs (or the wheelchair and seated legs) → hair/cape/hood
                                        behind → back arm → instrument parts behind → body and head → the
                                        instrument → hands → front arm → sticks/mallets. A wheelchair rolls
                                        (its spokes turn) where others walk.
     Arcade.Avatar.fightSprites(member, {avatar, eq})
                                        THE FIGHT POSES (any game; Button Masher's fighter): the same full-body avatar
                                        holding its instrument, facing right, on a FIGHT_W × FIGHT_H canvas (room to
                                        lean, jump and for dizzy stars): {w, h, poses: {idle, strike, hit, dizzy, ko,
                                        victory, bow}, pet} -> {frames: [canvas…], fps}; pet = the pet alone (small
                                        frames), or null. A wheelchair user stays seated in every pose. Drawn once
                                        per avatar + instrument and cached; shared/avatar-fight.js shows them.
   Everything is drawn on small canvases from theme tokens (--av-*, --q-*, the neon colors), cached per avatar, and
   scaled up with crisp pixels. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const P = window.AVATAR_PARTS, RAW_NAMES = window.AVATAR_NAMES;
  /* the name builder's words: A–Z, no repeats, never a NEVER-USE word (even if one is added to a list by mistake) */
  const NEVER = (RAW_NAMES.never || []).map(w => w.toLowerCase());
  const banned = w => NEVER.includes(String(w).trim().toLowerCase());
  const cleanList = list => [...new Set((list || []).map(w => String(w).trim()).filter(w => w && w[0] !== '#' && !banned(w)))].sort((a, b) => a.localeCompare(b));
  /* THE WORD NUMBERS (avatar-names.js): a word's permanent number = its place in its raw list, from 1 ('#Word' =
     retired: its number stays reserved). The leaderboard sends names as [title, adjective, noun] numbers; 0 = not
     in the list. Showing numbers: an unknown, retired or NEVER-USE word becomes "Mystery". */
  const RAW_LISTS = {title: RAW_NAMES.titles || [], adj: RAW_NAMES.adjectives || [], noun: RAW_NAMES.nouns || []};
  const MYSTERY = 'Mystery';
  const wordNumber = (k, w) => (RAW_LISTS[k] || []).findIndex(x => x === w || x === '#' + w) + 1;
  const wordAt = (k, n) => { const w = (RAW_LISTS[k] || [])[(n | 0) - 1]; return typeof w === 'string' && w && w[0] !== '#' && !banned(w) && n === (n | 0) ? w : MYSTERY; };
  /** an avatar's name as [title, adjective, noun] numbers */
  const nameNumbers = av => { const n = (av && av.name) || {}; return ['title', 'adj', 'noun'].map(k => wordNumber(k, n[k])); };
  /** numbers back to words ("Captain Mystery Comet" when a number is unknown or retired) */
  const nameFromNumbers = nums => ['title', 'adj', 'noun'].map((k, i) => wordAt(k, Array.isArray(nums) ? Number(nums[i]) : 0)).join(' ');
  const NAMES = {titles: cleanList(RAW_NAMES.titles), adjectives: cleanList(RAW_NAMES.adjectives), nouns: cleanList(RAW_NAMES.nouns), never: RAW_NAMES.never || []};
  const NAME_PARTS = {title: 'titles', adj: 'adjectives', noun: 'nouns'};
  const VERSION = 1;
  const byId = (list, id) => list.find(x => x.id === id);
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const ids = list => list.map(x => x.id !== undefined ? x.id : x);

  /* ---------- the avatar's fields (every choice) ---------- */
  const FIELDS = {
    skin: () => ids(P.SKIN), face: () => ids(P.FACES), eyes: () => ids(P.EYES), eyeColor: () => ids(P.EYE_COLORS), brows: () => ids(P.BROWS),
    mouth: () => ids(P.MOUTHS), freckles: () => ids(P.FRECKLE_STYLES), paint: () => ids(P.PAINTS), paintColor: () => P.PAINT_COLORS,
    hair: () => ids(P.HAIRS), hairColor: () => ids(P.HAIR_COLORS),
    head: () => ids(P.HEADS), headColor: () => ids(P.COLORS),
    top: () => ids(P.TOPS), topColor: () => ids(P.COLORS), bottom: () => ids(P.BOTTOMS), bottomColor: () => P.BOTTOM_COLORS,
    shoes: () => ids(P.SHOES), shoeColor: () => P.SHOE_COLORS,
    glasses: () => ids(P.GLASSES), glassesColor: () => P.FRAME_COLORS, aids: () => ids(P.AIDS), aidColor: () => P.AID_COLORS,
    chair: () => [false, true], chairColor: () => P.CHAIR_COLORS,
    pet: () => ids(P.PETS), back: () => ids(P.BACKS), bg: () => ids(P.BGS || [{id: 'none'}]),
    hand: () => ids(P.HANDS), effect: () => ids(P.EFFECTS), effectColor: () => P.EFFECT_COLORS, plate: () => ids(P.PLATES),
    belt: () => ids(P.BN_BELTS || [{id: 'none'}]),           // OFFICIAL BAND NINJA GEAR (a belt code from class: shared/bandninja.js)
  };

  /* ---------- UNLOCKS (the rules are on the parts in avatar-parts.js) ----------
     A part without `unlock` is free. IDENTITY items are ALWAYS free, whatever a rule says (never lock them). */
  const LOCKABLE = {eyes: () => P.EYES, mouth: () => P.MOUTHS, hairColor: () => P.HAIR_COLORS, head: () => P.HEADS, top: () => P.TOPS, pet: () => P.PETS, back: () => P.BACKS, bg: () => P.BGS || [],
    hand: () => P.HANDS, effect: () => P.EFFECTS, plate: () => P.PLATES, shoes: () => P.SHOES, belt: () => P.BN_BELTS || []};
  const IDENTITY = {head: ['none', 'hijab', 'headwrap', 'turban', 'patka', 'kufi', 'tichel', 'durag'], aids: '*', chair: '*', glasses: '*', glassesColor: '*', aidColor: '*', chairColor: '*'};
  const itemKey = (field, id) => field + ':' + id;
  const partFor = (field, id) => LOCKABLE[field] ? byId(LOCKABLE[field](), id) : null;
  const identity = (field, id) => IDENTITY[field] === '*' || (IDENTITY[field] || []).includes(id);
  /** is this choice open on this device? (?demo&unlockall opens everything) */
  function isUnlocked(field, id) {
    if (identity(field, id)) return true;
    const p = partFor(field, id), u = p && p.unlock;
    if (!u || (A.Skins && A.Skins.UNLOCK_ALL)) return true;
    if (u.bandninja === 'all') return !!(A.BandNinja && A.BandNinja.hasAll && A.BandNinja.hasAll());   // LEGENDARY: every belt code
    if (u.bandninja) return !!(A.BandNinja && A.BandNinja.has(u.bandninja));   // official Band Ninja gear: only a belt code opens it
    if (u.shop) return !!(st().ownedItems || {})[itemKey(field, id)];
    // SEASONAL EVENT items (shared/seasons.js): earned during the event, owned forever (a ?season= preview's claims
    // count in that tab only)
    if (u.event) return A.Seasons ? A.Seasons.owned(itemKey(field, id)) : !!(st().ownedItems || {})[itemKey(field, id)];
    if (u.stars && !u.game) return st().allStars('*') >= u.stars;      // device-wide: every instrument, every game
    return !!(A.Skins && A.Skins.ruleMet(u));
  }
  /** what a locked choice asks for, in student words */
  function requirement(field, id) {
    const u = (partFor(field, id) || {}).unlock;
    if (!u || identity(field, id)) return '';
    if (u.shop && u.season) {                  // THE SEASONAL SHOP (shared/tokens.js): bought only during its event
      const ev = (A.SEASONS || []).find(e => e.id === u.season), name = ev ? ev.name : 'its season';
      return A.Tokens && A.Tokens.seasonOn(u.season) ? `Prize Counter: ${u.shop} tokens (${name} only)` : `Returns to the Prize Counter next ${name}`;
    }
    if (u.shop) return u.booth === 'quest' ? `${u.shop} tokens at the Token Booth in Arcade Quest` : `${u.shop} tokens at the Prize Counter`;   // (shared/tokens.js)
    if (u.event) return A.Seasons ? A.Seasons.requirement(itemKey(field, id)) : u.text || 'A seasonal event item';
    if (u.stars && !u.game) return `Earn ${u.stars} ★`;
    return u.text || 'Keep playing to unlock';
  }
  /** "37 of 150 ★ so far" for a locked star item ("3 of 5 wins so far" for a wins goal), else '' */
  function progress(field, id) {
    const u = (partFor(field, id) || {}).unlock;
    if (!u || isUnlocked(field, id)) return '';
    if (u.stars && !u.game) return `${st().allStars("*")} of ${u.stars} ★ so far`;
    if (u.wins && A.Skins && A.Skins.winsOn) return `${Math.min(u.wins, A.Skins.winsOn(u.game))} of ${u.wins} wins so far`;
    if (u.bandninja === 'all' && A.BandNinja) return `${A.BandNinja.BELT_KEYS.filter(b => A.BandNinja.has(b)).length} of ${A.BandNinja.BELT_KEYS.length} belt codes so far`;
    if (u.event && A.Seasons) {                                          // a seasonal step running now: "2 of 3 so far"
      const o = A.Seasons.active(), s = o && o.ev.id === u.event && A.Seasons.steps(o).find(x => x.item === itemKey(field, id));
      if (s) return `${s.have} of ${s.n} so far`;
    }
    return '';
  }
  /** every item that has to be earned or bought: {key, field, id, name, unlock, shop} */
  function items() {
    const out = [];
    Object.keys(LOCKABLE).forEach(f => LOCKABLE[f]().forEach(p => { if (p.unlock && !identity(f, p.id)) out.push({key: itemKey(f, p.id), field: f, id: p.id, name: p.name, unlock: p.unlock, shop: p.unlock.shop || 0, official: !!p.official, legendary: !!p.legendary, event: p.unlock.event || null}); }));
    return out;
  }
  /** earned items (not bought ones) whose UNLOCKED! card hasn't been shown yet (never with ?unlockall) */
  function freshItems() {
    if (A.Skins && A.Skins.UNLOCK_ALL) return [];
    const seen = st().itemsSeen || {};
    return items().filter(it => !it.shop && !seen[it.key] && isUnlocked(it.field, it.id) && !(it.event && A.Seasons && A.Seasons.previewSeen(it.key)));
  }
  /** a copy of the avatar with anything still locked swapped for a free choice (what the arcade shows) */
  function effective(av) {
    const out = Object.assign({}, av);
    Object.keys(LOCKABLE).forEach(f => { if (!isUnlocked(f, out[f])) out[f] = FIELDS[f]().find(id => isUnlocked(f, id)); });
    return out;
  }
  const NATURAL = ['black', 'darkbrown', 'brown', 'auburn', 'copper', 'blonde', 'platinum', 'gray', 'white'];
  /** a random value for one field (weighted so most random players look like students, with fun ones mixed in) */
  function randomField(k) {
    const r = Math.random();
    switch (k) {
      case 'hairColor': return r < 0.8 ? pick(NATURAL.slice(0, 7)) : pick(open(k));
      case 'head': return r < 0.72 ? 'none' : pick(open(k).filter(x => x !== 'none'));
      case 'glasses': return r < 0.72 ? 'none' : pick(FIELDS.glasses().filter(x => x !== 'none'));
      case 'aids': return r < 0.9 ? 'none' : pick(FIELDS.aids().filter(x => x !== 'none'));
      case 'freckles': return r < 0.2 ? pick([true, true, 'cheeks', 'nose', 'dusting']) : false;
      case 'paint': return r < 0.08 ? pick(FIELDS.paint().filter(x => x !== 'none')) : 'none';
      case 'chair': return r < 0.06;
      case 'topColor': case 'headColor': return pick(FIELDS[k]().filter(x => x !== 'khaki' && x !== 'denim' && x !== 'tan'));
      case 'pet': return r < 0.8 ? 'none' : pick(open(k));
      case 'back': case 'plate': return 'none';
      case 'belt': return r < 0.5 ? 'none' : pick(open(k));
      case 'hand': case 'effect': return r < 0.85 ? 'none' : pick(open(k).filter(x => x !== 'none')) || 'none';
      case 'bg': return r < 0.4 ? 'none' : pick(open(k).filter(x => !(P.BGS || []).find(b => b.id === x && b.unlock)));
      default: return pick(open(k));
    }
  }
  const open = k => FIELDS[k]().filter(id => isUnlocked(k, id));
  function randomName() {
    return {title: pick(NAMES.titles), adj: pick(NAMES.adjectives), noun: pick(NAMES.nouns)};
  }
  /** a random avatar. only: change just these fields (a tab's SURPRISE ME); keep: the avatar they come from */
  function random({keep, only} = {}) {
    const av = Object.assign({v: VERSION}, keep ? clone(keep) : {});
    Object.keys(FIELDS).forEach(k => { if (!only || only.includes(k)) av[k] = randomField(k); });
    if (!only || only.includes('name')) av.name = randomName();
    return normalize(av);
  }
  const clone = o => JSON.parse(JSON.stringify(o));
  /** make any saved object a valid avatar: unknown or missing choices become the first one of their list */
  function normalize(av) {
    const out = {v: VERSION};
    av = av && typeof av === 'object' ? av : {};
    Object.keys(FIELDS).forEach(k => { const list = FIELDS[k](); out[k] = list.includes(av[k]) ? av[k] : (k === 'skin' ? 5 : ['head', 'glasses', 'aids', 'pet', 'back', 'bg', 'paint', 'hand', 'effect', 'plate', 'belt'].includes(k) ? 'none' : list[0]); });
    out.name = cleanName(av.name).name;
    return out;
  }
  /** a valid name {title, adj, noun}: a missing word = the list's first; a NEVER-USE word = a random one from the same
      list; an old first initial is dropped. changed = something had to be fixed (the migration saves it) */
  function cleanName(n) {
    n = n && typeof n === 'object' ? n : {};
    let changed = !!n.initial;
    const name = {};
    Object.keys(NAME_PARTS).forEach(k => {
      const list = NAMES[NAME_PARTS[k]], w = n[k];
      if (typeof w !== 'string' || !w) name[k] = list[0];
      else if (banned(w)) { name[k] = pick(list); changed = true; }
      else name[k] = w;
    });
    return {name, changed};
  }
  const nameOf = av => { const n = (av || {}).name || {}; return [n.title, n.adj, n.noun].filter(w => w && !banned(w)).join(' '); };

  /* ---------- saving (storage.js keeps it in the device's data, so the Arcade Backup Code includes it) ---------- */
  const st = () => A.store;
  /* THE NAME MIGRATION: a saved name with a NEVER-USE word or a first initial is fixed and saved the first time it's
     read, and the device's own avatar gets the one-time note (gameData('avatar').nameNote: 'new' → 'shown') */
  function migrateName(av, save, own) {
    if (!av || !av.name || !cleanName(av.name).changed) return av;
    const fixed = Object.assign({}, av, {name: cleanName(av.name).name});
    save(normalize(fixed));
    if (own && A.store.gameData) { const d = A.store.gameData('avatar'); d.nameNote = 'new'; A.store.saveGameData('avatar'); }
    return fixed;
  }
  /** the one-time "Your name got an upgrade!" note: 'new' until shown (seen() marks it shown) */
  const nameNote = {
    pending: () => !!(A.store.gameData && A.store.gameData('avatar').nameNote === 'new'),
    seen: () => { if (!A.store.gameData) return; const d = A.store.gameData('avatar'); if (d.nameNote === 'new') { d.nameNote = 'shown'; A.store.saveGameData('avatar'); } },
    TEXT: 'Your name got an upgrade! Tap your name to change it.',
  };
  function get() {
    let av = st().avatar;
    if (!av) { av = random(); st().setAvatar(av); }
    av = migrateName(av, x => st().setAvatar(x), true);
    return effective(normalize(av));
  }
  function set(av) { st().setAvatar(normalize(av)); redrawAll(); }
  function guest() {
    let av = st().guestAvatar;
    if (!av) { av = random(); st().setGuestAvatar(av); }
    av = migrateName(av, x => st().setGuestAvatar(x), false);
    return effective(normalize(av));
  }
  function setGuest(av) { st().setGuestAvatar(normalize(av)); redrawAll(); }

  /* ---------- colors: palette letters -> theme tokens -> [r, g, b] ---------- */
  const rgbCache = {};
  let probe = null;
  function rgb(token) {
    if (rgbCache[token]) return rgbCache[token];
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--' + token).trim() || '#ff00ff';
    probe = probe || document.createElement('canvas').getContext('2d');
    probe.fillStyle = '#000'; probe.fillStyle = raw;
    const s = probe.fillStyle, out = s[0] === '#' ? [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)) : (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    return (rgbCache[token] = out);
  }
  const LIGHT = ['white', 'yellow', 'khaki', 'tan', 'pink', 'orange', 'teal', 'green'];
  /** eq: {color, acc} (the instrument's equipped skins) */
  function palette(av, eq, {bust = false, f = 0} = {}) {
    const sk = eq && eq.color && A.Skins ? A.Skins.get(eq.color) : null, look = (sk && sk.look) || {};
    const top = byId(P.TOPS, av.top) || P.TOPS[0], hc = av.hairColor, tc = av.topColor;
    const contrast = c => LIGHT.includes(c) ? 'av-black' : 'av-white';
    const pal = {
      o: !bust && look.colors ? (look.colors[0] === 'white' ? 'white-hi' : look.colors[0]) : 'av-out',   // Quest: the skin's color is the outline
      s: `av-skin-${av.skin}`, S: `av-skin-${av.skin}-d`, F: `av-skin-${av.skin}-d`,
      e: look.eyes ? look.colors[1] : `av-eye-${av.eyeColor}`, w: 'av-white', K: 'av-black', m: 'av-mouth', t: 'av-teeth', n: 'av-tongue',
      h: `av-hair-${hc}`, H: `av-hair-${hc}-d`, l: `av-hair-${hc}-l`, b: av.hair === 'bald' ? 'av-hair-darkbrown' : `av-hair-${hc}-d`,
      c: top.base === 'black' ? 'av-black' : `av-${tc}`, C: top.base === 'black' ? 'av-black' : `av-${tc}-d`,
      d: top.base === 'black' ? `av-${tc}` : contrast(tc), g: 'av-gold', W: 'av-white', T: `av-${av.paintColor || 'black'}`,
      p: `av-${av.bottomColor}`, P: `av-${av.bottomColor}-d`, q: `av-${av.shoeColor}`, Q: av.shoeColor === 'white' ? 'av-gray' : 'av-white',
      u: `av-${av.headColor}`, U: `av-${av.headColor}-d`, j: av.headColor === 'white' || av.headColor === 'yellow' ? 'av-red' : 'av-white',
      x: `av-${av.glassesColor}`, a: av.aidColor === 'aid' ? 'av-aid' : `av-${av.aidColor}`,
      v: `av-${av.chairColor}`, V: 'av-tire', r: 'av-rim', '*': 'white-hi',
    };
    Object.entries(P.ACC_COLORS).forEach(([k, t]) => { pal[k] = t; });
    // the colors a worn part always has (its `pal`), then this frame of any slow color cycle (anim.pal)
    worn(av).forEach(part => {
      if (part.pal) Object.assign(pal, part.pal);
      if (part.anim && part.anim.pal) Object.entries(part.anim.pal).forEach(([k, list]) => { pal[k] = list[f % list.length]; });
    });
    return pal;
  }

  /** the parts the avatar wears that can carry colors or animations */
  const worn = av => [partOf(P.HEADS, av.head), partOf(P.TOPS, av.top), partOf(P.HANDS || [{}], av.hand), partOf(P.BACKS, av.back), partOf(P.SHOES, av.shoes), partOf(P.BN_BELTS || [{}], av.belt)];
  /** a part's map for a view key ('bust', 'front', 'behind.front'…) in animation frame f (anim.maps) */
  function am(part, key, f = 0) {
    if (!part) return null;
    const alt = f && part.anim && part.anim.maps && part.anim.maps[key];
    if (alt) return alt[f % alt.length];
    return key.split('.').reduce((o, k) => o && o[k], part);
  }
  /** is anything the avatar wears animated? bust: in the portrait (shoes don't show there) */
  function isAnimated(av, eq, {bust = true} = {}) {
    const parts = [partOf(P.HEADS, av.head), partOf(P.TOPS, av.top), partOf(P.HANDS || [{}], av.hand), partOf(P.BACKS, av.back), partOf(P.BN_BELTS || [{}], av.belt)].concat(bust ? [] : [partOf(P.SHOES, av.shoes)]);
    const acc = eq && eq.acc ? P.ACCESSORIES[eq.acc] : null, pet = partOf(P.PETS, av.pet);
    return parts.concat(acc ? [acc] : []).some(p => p && p.anim) || !!(pet && pet.frames);
  }

  /* ---------- pixel grids ---------- */
  const blank = (w, h) => Array.from({length: h}, () => Array(w).fill('.'));
  /** stamp a part map onto a grid (see the top of avatar-parts.js); clipY: skip rows above it; mirrorX: flip it */
  function stamp(g, map, {clipY = -99, only} = {}) {
    if (!map) return;
    const W = g[0].length, y0 = map.y || 0;
    const put = (x, y, ch) => {
      if (ch === '.' || ch === ' ' || y < clipY || y < 0 || y >= g.length || x < 0 || x >= W) return;
      if (only && !only(x, y)) return;
      g[y][x] = ch;
    };
    if (map.half) map.half.forEach((row, i) => {
      const r = row.padEnd(W / 2, '.').slice(0, W / 2);
      [...r].forEach((ch, x) => { put(x, y0 + i, ch); put(W - 1 - x, y0 + i, ch); });
    });
    else if (map.rows) map.rows.forEach((row, i) => [...row].forEach((ch, x) => put((map.x || 0) + x, y0 + i, ch)));
  }
  /** a small feature box at (x, y), and its mirror image at (mx, y) (eyes, brows) */
  function feature(g, rows, x, y, mx) {
    rows.forEach((row, i) => [...row].forEach((ch, j) => {
      if (ch === '.') return;
      g[y + i][x + j] = ch;
      if (mx != null) g[y + i][mx + row.length - 1 - j] = ch;
    }));
  }
  /** the dark outline around everything drawn (not where `mask` already has pixels) */
  function outline(g, mask) {
    const o = g.map(r => r.slice());
    g.forEach((r, y) => r.forEach((ch, x) => {
      if (ch !== '.' || (mask && mask[y] && mask[y][x] !== '.')) return;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = g[y + dy] && g[y + dy][x + dx]; return c && c !== '.' && c !== 'o'; })) o[y][x] = 'o';
    }));
    return o;
  }
  /** draw layers [{g, pal, dy}] into one canvas */
  function paint(w, h, layers) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    layers.forEach(({g, pal, dy = 0, dx = 0}) => g.forEach((row, yy) => row.forEach((ch, xx) => {
      const y = yy + dy, X = xx + dx; if (ch === '.' || y < 0 || y >= h || X < 0 || X >= w) return;
      const tok = pal[ch]; if (!tok) return;
      const [r, gg, b] = rgb(tok), i = (y * w + X) * 4;
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
    })));
    x.putImageData(img, 0, 0);
    return c;
  }

  /* ---------- the head and body (sprite: 32 × 32; bust: 36 × 36) ---------- */
  const partOf = (list, id) => byId(list, id) || list[0];
  function coveringOf(av, eq) {
    const head = partOf(P.HEADS, av.head);
    const acc = eq && eq.acc ? P.ACCESSORIES[eq.acc] : null;
    // a helmet hides the hair like a cap; a head covering and a helmet: the helmet wins on top
    return {head, acc, accId: eq && eq.acc};
  }
  /** hair pixels to skip under a covering: {all: true} or {clipY} */
  function hairClip(av, eq, view) {
    const {head, acc} = coveringOf(av, eq);
    if (head.hides === 'all') return null;
    let clipY = -99;
    if (head.hides === 'top') clipY = head.clip[view];
    if (acc && acc.hides === 'top') clipY = Math.max(clipY, acc.clip[view]);
    return {clipY};
  }
  /** special hair colors: 'tips' = the ends of the hair in flame colors, 'sparkle' = little stars in it */
  function hairFx(av, g, bust) {
    const fx = (partOf(P.HAIR_COLORS, av.hairColor) || {}).fx;
    if (!fx) return;
    const H = g.length, W = g[0].length, hairy = ch => ch === 'h' || ch === 'H' || ch === 'l';
    if (fx === 'tips') for (let x = 0; x < W; x++) {
      let last = -1; for (let y = 0; y < H; y++) if (hairy(g[y][x])) last = y;
      if (last >= 0) { g[last][x] = 'l'; if (bust && last > 0 && hairy(g[last - 1][x])) g[last - 1][x] = 'l'; }
    }
    if (fx === 'sparkle') g.forEach((row, y) => row.forEach((ch, x) => { if (hairy(ch) && (x * 7 + y * 11) % (bust ? 13 : 9) === 0) row[x] = (x + y) % 2 ? '*' : 'l'; }));
  }
  /** the pet's own layer: its picture floating beside the avatar (bob: 0/1), with a dark outline */
  function petLayer(av, bust, bob = 0, f = 0) {
    const pet = partOf(P.PETS, av.pet);
    if (!pet.rows) return null;
    const W = bust ? 36 : 32, g = blank(W, W), [x, y] = P.PET_AT[bust ? 'bust' : 'sprite'];
    const rows = pet.frames && pet.seq ? pet.frames[pet.seq[f % pet.seq.length]] || pet.rows : pet.rows;   // its idle animation
    stamp(g, {x, y: y + bob, rows});
    return {g: outline(g), pal: Object.assign({o: 'av-out'}, pet.pal)};
  }
  /** freckles (a style, or true = the classic ones) and face paint, for one view */
  function faceMarks(g, av, view) {
    if (av.freckles) stamp(g, av.freckles === true ? P.FRECKLES[view] : (partOf(P.FRECKLE_STYLES, av.freckles) || {})[view]);
    const paint = (P.PAINTS || []).find(x => x.id === av.paint);
    if (paint && paint[view]) stamp(g, paint[view]);
  }
  /** the head's layers for one view: {behind, body} grids (W × H); view 'front' | 'side' | 'back' | 'bust' */
  /** OFFICIAL BAND NINJA GEAR: the belt at the waist (Z band, z edge + knot, Y the Diamond belt's sparkle). The bust
      shows it across the bottom of the chest; the sprites on the last row of the top, with the tails over the waist */
  function beltLayer(g, av, view) {
    if (!av.belt || av.belt === 'none') return;
    const on = (x, y, ch, always) => { if (g[y] && x >= 0 && x < g[y].length && (always || g[y][x] !== '.')) g[y][x] = ch; };
    if (view === 'bust') {
      for (let y = 33; y <= 34; y++) for (let x = 0; x < 36; x++) on(x, y, y === 34 ? 'z' : 'Z');
      [[17, 32], [18, 32], [16, 33], [19, 33], [16, 34], [19, 34]].forEach(([x, y]) => on(x, y, 'Z', true));
      [[17, 33], [18, 33], [17, 34], [18, 34]].forEach(([x, y]) => on(x, y, 'z', true));
      [[15, 35], [16, 35], [19, 35], [20, 35]].forEach(([x, y]) => on(x, y, 'Z', true));
      if (av.belt === 'diamond') { on(8, 33, 'Y'); on(27, 33, 'Y'); }
      return;
    }
    const [x0, x1] = view === 'side' ? [12, 18] : [11, 20];
    for (let x = x0; x <= x1; x++) on(x, 20, 'Z');
    if (view === 'front') { on(15, 20, 'z', true); on(16, 20, 'z', true); on(14, 21, 'Z', true); on(17, 21, 'Z', true); }
    if (view === 'side') on(17, 20, 'z', true);
    if (av.belt === 'diamond' && view !== 'back') on(x0 + 1, 20, 'Y', true);
  }
  function headAndBody(av, eq, view, f = 0) {
    const W = view === 'bust' ? 36 : 32, H = W, bust = view === 'bust';
    const behind = blank(W, H), body = blank(W, H), over = blank(W, H);
    const faceShape = partOf(P.FACES, av.face), hair = partOf(P.HAIRS, av.hair), top = partOf(P.TOPS, av.top);
    const {head, acc, accId} = coveringOf(av, eq);
    const backItem = partOf(P.BACKS, av.back);
    const clip = hairClip(av, eq, view);
    const v = view === 'back' ? 'front' : view;         // the back view uses the front's silhouettes
    // --- behind the body ---
    if (bust) {
      if (clip && hair.bustBehind) stamp(behind, hair.bustBehind, {clipY: clip.clipY});
      if (top.bustBehind && head.id !== 'hijab') stamp(behind, top.bustBehind);
      if (head.bustBehind && head.id !== 'hijab') stamp(behind, head.bustBehind);
      if (acc && acc.bustBehind) stamp(behind, am(acc, 'bustBehind', f));
      if (backItem.bustBehind) stamp(behind, am(backItem, 'bustBehind', f));
    } else if (view !== 'back') {
      if (backItem.behind && backItem.behind[view]) stamp(behind, am(backItem, 'behind.' + view, f));
      if (clip && hair.behind && hair.behind[view]) stamp(behind, hair.behind[view], {clipY: clip.clipY});
      if (top.behind && top.behind[view] && head.id !== 'hijab') stamp(behind, top.behind[view]);
      if (head.behind && head.behind[view] && head.id !== 'hijab') stamp(behind, head.behind[view]);
      if (acc && acc.behind && acc.behind[view]) stamp(behind, am(acc, 'behind.' + view, f));
    }
    // --- the head (skin) and the top ---
    stamp(body, faceShape[bust ? 'bust' : v]);
    if (bust) { stamp(body, am(top, 'bust', f)); if (top.bustTop && head.id !== 'hijab') stamp(body, top.bustTop); }
    else {
      stamp(body, am(top, view, f));
      stamp(body, {y: 21, half: [view === 'side' ? '' : '...........ppppp']});   // the waist
      if (view === 'side') stamp(body, {y: 21, rows: ['............ppppppp']});
    }
    beltLayer(body, av, view);
    // --- the face (not from behind) ---
    if (view !== 'back') {
      const eyes = partOf(P.EYES, av.eyes), brows = partOf(P.BROWS, av.brows), mouth = partOf(P.MOUTHS, av.mouth);
      if (bust) {
        if (eyes.bustR) { feature(body, eyes.bust, 12, 15); feature(body, eyes.bustR, 21, 15); } else feature(body, eyes.bust, 12, 15, 21);
        feature(body, brows.bust, 12, 13, 21); feature(body, mouth.bust, 15, 20);
        stamp(body, P.NOSE.bust);
        faceMarks(body, av, 'bust');
      } else if (view === 'front') {
        if (eyes.frontR) { feature(body, eyes.front, 12, 8); feature(body, eyes.frontR, 18, 8); } else feature(body, eyes.front, 12, 8, 18);
        feature(body, brows.front, 11, 6, 18); feature(body, mouth.front, 14, 10);
        faceMarks(body, av, 'front');
      } else {
        feature(body, eyes.side, 17, 8); feature(body, brows.side, 16, 6); feature(body, mouth.side, 16, 10);
        faceMarks(body, av, 'side');
      }
    }
    // --- hair ---
    if (clip) {
      if (bust) stamp(body, hair.bust, {clipY: clip.clipY});
      else if (view === 'back') {
        if (hair.back) stamp(body, hair.back, {clipY: clip.clipY});
        else if (hair.id !== 'bald') {
          const shape = blank(W, H); stamp(shape, faceShape.front);
          const tex = hair.backTex || hair.backCh || 'h';
          for (let y = 2; y <= Math.min(hair.backTo || 9, 12); y++) for (let x = 0; x < W; x++) {
            if (shape[y][x] !== '.' && y >= clip.clipY) body[y][x] = tex[x % tex.length];
          }
          stamp(body, hair.front, {clipY: clip.clipY, only: (x, y) => y < 8 || body[y][x] !== '.' || x < 11 || x > 20});
        }
        // long hair, a ponytail, braids: down the back, over the body
        if (hair.behind) stamp(over, hair.behind.back || hair.behind.front, {clipY: clip.clipY});
      } else stamp(body, hair[view], {clipY: clip.clipY});
      hairFx(av, body, bust);
    }
    // --- glasses, hearing aids ---
    const gl = partOf(P.GLASSES, av.glasses);
    if (view !== 'back' && gl[bust ? 'bust' : view]) stamp(body, gl[bust ? 'bust' : view]);
    if (av.aids !== 'none' && head.id !== 'hijab') {
      const a = P.AID[bust ? 'bust' : v === 'side' ? 'side' : 'front'];
      const right = av.aids === 'right' || av.aids === 'both', left = av.aids === 'left' || av.aids === 'both';
      if (view === 'side') { if (right) stamp(body, a); }
      else {
        const flip = m => ({y: m.y, rows: m.rows.map(r => [...r].reverse().join('')), x: W - m.x - m.rows[0].length});
        // front and bust: the student's right ear is on YOUR left; from behind it's on your right
        const yourLeft = view === 'back' ? left : right, yourRight = view === 'back' ? right : left;
        if (yourLeft) stamp(body, a);
        if (yourRight) stamp(body, flip(a));
      }
    }
    // --- the head covering, then the accessory ---
    const hv = bust ? 'bust' : view;
    if (head[hv]) stamp(body, am(head, hv, f));
    else if (view === 'back' && head.front) stamp(body, head.front);
    if (bust && head.bustAfter) stamp(body, head.bustAfter);
    if (acc) {
      const accMap = acc[hv];
      if (accMap) stamp(body, accMap);
      if (bust && acc.bust && acc.bust.after) stamp(body, acc.bust.after);
      if (view === 'back' && acc.behind && acc.behind.back) stamp(over, am(acc, 'behind.back', f));
    }
    if (view === 'back' && backItem.behind && backItem.behind.back) stamp(over, am(backItem, 'behind.back', f));
    if (bust && top.bustDetail && head.id !== 'hijab') stamp(body, top.bustDetail);
    // a hijab wraps the face: it is one shape with the head (no outline between them)
    if (head.id === 'hijab') {
      const hb = blank(W, H); stamp(hb, bust ? head.bustBehind : head.behind && head.behind[v]);
      if (view === 'back') stamp(hb, head.back);
      hb.forEach((row, y) => row.forEach((ch, x) => { if (ch !== '.' && body[y][x] === '.') body[y][x] = ch; }));
    }
    // a HAND item, held up beside the portrait: the item, then the hand and an arm in the top's sleeve color
    const hand = partOf(P.HANDS || [{}], av.hand);
    if (bust && hand && hand.bust) {
      const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < W && y >= 0 && y < H) body[y][x] = ch; };
      const api = {px(x, y, ch) { put(x, y, ch); return api; }, line(x0, y0, x1, y1, ch) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) put(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch); return api; }};
      hand.bust(api, f);
      const sl = top.sleeveCh || (top.base === 'black' ? 'K' : 'c');
      [[29, 21], [30, 21], [29, 22], [30, 22], [29, 23], [30, 23], [29, 24], [30, 24]].forEach(([x, y]) => put(x, y, 's'));
      [[29, 25], [30, 25], [28, 26], [29, 26], [30, 26], [31, 26]].forEach(([x, y]) => put(x, y, sl));
    }
    return {behind, body, over, accId};
  }

  /* ---------- THE BUST ---------- */
  const bustCache = new Map();
  function bustCanvas(av, eq, f = 0) {
    const pal = palette(av, eq, {bust: true, f});
    const {behind, body} = headAndBody(av, eq, 'bust', f);
    const o = outline(body), ob = outline(behind, o), pet = petLayer(av, true, 0, f);
    return paint(36, 36, [{g: ob, pal}, {g: o, pal}].concat(pet ? [pet] : []));
  }
  /** the portrait's animation frames: 4 canvases when something worn is animated, else just the still one */
  const framesCache = new Map();
  function bustFrames(av, eq) {
    const key = JSON.stringify([av, eq && eq.color, eq && eq.acc]);
    if (framesCache.has(key)) return framesCache.get(key);
    const out = isAnimated(av, eq) ? [0, 1, 2, 3].map(f => bustCanvas(av, eq, f)) : [bustCanvas(av, eq, 0)];
    if (framesCache.size > 30) framesCache.clear();
    framesCache.set(key, out);
    return out;
  }
  function bustURL(av, eq) {
    const key = JSON.stringify([av, eq && eq.color, eq && eq.acc]);
    if (bustCache.has(key)) return bustCache.get(key);
    let url = '';
    try { url = bustCanvas(av, eq).toDataURL('image/png'); } catch (e) { url = ''; }
    if (bustCache.size > 200) bustCache.clear();
    bustCache.set(key, url);
    return url;
  }
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  /** the equipped skin {color, acc} to wear with an instrument (portraits.js rules: false = none) */
  function eqFor(member, skin) {
    if (skin === false || !A.Skins) return {color: 'classic', acc: null};
    if (skin) return {color: skin.color || 'classic', acc: skin.acc || null};
    return member ? A.Skins.equipped(member) : {color: 'classic', acc: null};
  }
  /** THE PORTRAIT BUST (see the top of this file) */
  function avatarHTML({size = 'tile', member, avatar, guest: isGuest = false, skin, label, cls = '', live = false, bg = true} = {}) {
    const av = avatar ? normalize(avatar) : isGuest ? guest() : get();
    member = member === undefined ? st().player : member;
    const eq = eqFor(member, skin);
    const d = A.Skins ? A.Skins.decorate('avatar', {color: eq.color, acc: null}, size) : null;
    const name = label != null ? label : nameOf(av);
    const alt = [name, d && A.Skins.label(eq)].filter(Boolean).join(', ');
    const keep = esc(JSON.stringify({size, member: member || null, guest: isGuest, skin: skin === undefined ? null : skin, label: label == null ? null : label, cls, live, bg}));
    // the background behind the bust (shared/avatar-bg.js): a still frame, or (live) the one that may move
    const bgId = bg === true ? av.bg : bg, back = bg && A.AvatarBg ? A.AvatarBg.html(bgId, size, {live}) : '';
    // an EFFECT around the avatar (shared/avatar-fx.js): still pictures behind and in front of it (never on the chip)
    const fxOn = size !== 'chip' && av.effect && av.effect !== 'none' && A.AvatarFx;
    const fx = fxOn ? A.AvatarFx.stillURLs(av.effect, av.effectColor, size === 'big' ? 192 : 96) : null;
    // LIVE: the largest live avatar on screen plays its animations (shared/avatar-bg.js's loop picks it)
    const anim = size !== 'chip' && isAnimated(av, eq);
    const moves = live && (anim || fxOn || (bg && A.AvatarBg && A.AvatarBg.animated(bgId)));
    let liveId = '';
    if (moves) { liveId = String(++liveN); LIVE.set(liveId, {av, eq}); if (LIVE.size > 60) LIVE.delete(LIVE.keys().next().value); if (A.AvatarBg) A.AvatarBg.wake(); }
    return `<span class="pt-box pt-box-${size} av-box ${d ? d.cls : ''} ${cls}"${isGuest ? ' data-av-guest="1"' : ' data-av="1"'} data-av-opts="${keep}"` +
      `${moves ? ` data-live="${liveId}"` : ''}${d && d.style ? ` style="${d.style}"` : ''}>` +
      `${back}${d ? d.parts.before : ''}${fx ? `<img class="av-fx-still av-fx-b" alt="" src="${fx.back}">` : ''}` +
      `<img class="pt-img av-img" src="${bustURL(av, eq)}" alt="${esc(alt)}" draggable="false">` +
      (moves && (anim || fxOn) ? `<canvas class="av-live" hidden></canvas>${fxOn ? '<canvas class="av-fx av-fx-b" hidden></canvas><canvas class="av-fx av-fx-f" hidden></canvas>' : ''}` : '') +
      `${fx ? `<img class="av-fx-still av-fx-f" alt="" src="${fx.front}">` : ''}${d ? d.parts.after : ''}</span>`;
  }
  // the live boxes' avatars (for shared/avatar-fx.js): data-live id -> {av, eq}
  const LIVE = new Map();
  let liveN = 0;
  /** redraw every avatar picture on this page (after saving, or equipping a skin) */
  function redrawAll() {
    document.querySelectorAll('.av-box[data-av-opts]').forEach(box => {
      let o; try { o = JSON.parse(box.dataset.avOpts); } catch (e) { return; }
      if (box.dataset.avFixed) return;
      const w = document.createElement('span');
      w.innerHTML = avatarHTML({size: o.size, member: o.member, guest: o.guest, skin: o.skin === null ? undefined : o.skin, label: o.label === null ? undefined : o.label, cls: o.cls, live: !!o.live, bg: o.bg === undefined ? true : o.bg});
      box.replaceWith(w.firstChild);
    });
    document.querySelectorAll('[data-av-name]').forEach(el => { el.textContent = nameOf(el.dataset.avName === 'guest' ? guest() : get()); });
  }

  /* ---------- THE FULL-BODY SPRITE (Arcade Quest) ---------- */
  const PW = 32;
  const put = (g, x, y, ch) => { if (x >= 0 && x < PW && y >= 0 && y < PW) g[y][x] = ch; };
  /** an arm from the shoulder to the hand: a sleeve (sleeve = the share of the arm it covers), then skin */
  function armGrid(sh, hand, withHand, mask, sleeve, sleeveCh = 'c') {
    const g = blank(PW, PW);
    let [x0, y0] = sh; const [x1, y1] = hand;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, n = Math.max(dx, dy) || 1;
    const wide = dy >= dx ? [1, 0] : [0, 1];
    let err = dx - dy, i = 0;
    for (;;) {
      const ch = i / n < sleeve ? sleeveCh : 's';
      put(g, x0, y0, ch); put(g, x0 + wide[0], y0 + wide[1], ch);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
      i++;
    }
    if (withHand) [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => put(g, x1 + a, y1 + b, 's'));
    return outline(g, mask);
  }
  const handOnly = hand => { const g = blank(PW, PW); [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => put(g, hand[0] + a, hand[1] + b, 's')); return outline(g); };
  /** standing legs: bottoms + shoes. side: {back, front} steps; front/back: {left, right} lifts */
  function legGrid(av, view, step) {
    const L = LEGS, g = blank(PW, PW), bottom = partOf(P.BOTTOMS, av.bottom), shoe = partOf(P.SHOES, av.shoes);
    const leg = (hx, dx, lift, side) => {
      const foot = L.foot - lift, top = L.top;
      for (let y = top; y < foot; y++) {
        const x = hx + Math.round(dx * (y - top) / (L.foot - top)), k = y - top;
        let ch = 'p';
        if (bottom.legs === 'shorts' && k >= 3) ch = 's';
        if (bottom.legs === 'skirt' && k >= 3) ch = 's';
        if (bottom.cuff && y === foot - 1) ch = 'P';
        if (shoe.rows === 3 && y === foot - 1) ch = 'q';
        const w = bottom.legs === 'skirt' && k < 3 ? 2 : 1;
        for (let xx = x - w; xx <= x + w; xx++) put(g, xx, y, ch);
        if (bottom.pocket && (k === 3 || k === 4)) put(g, x - 1, y, 'P');              // cargo pockets
      }
      const fx = hx + dx;
      for (let y = foot; y <= foot + 1; y++) for (let x = fx - 1; x <= fx + (side ? 2 : 1); x++)
        put(g, x, y, shoe.sandal ? (y === foot ? ((x - fx) % 2 ? 's' : 'q') : 'Q') : shoe.sole && y === foot + 1 ? 'Q' : 'q');
      if (shoe.skate && side) put(g, fx + 3, foot + 1, 'Q');                                        // an ice skate's blade (Q = silver) sticks out
    };
    if (view === 'side') { leg(L.side.back, step.back || 0, 0, true); leg(L.side.front, step.front || 0, 0, true); }
    else { leg(L.front.left, 0, step.left || 0); leg(L.front.right, 0, step.right || 0); }
    return outline(g);
  }
  const LEGS = {side: {back: 14, front: 16}, front: {left: 13, right: 18}, top: 22, foot: 29};
  /* ---- the wheelchair: seated legs, the frame and turning wheels (spin = 0–3, the spokes' angle) ---- */
  function circle(g, cx, cy, r, ch) {
    for (let a = 0; a < 64; a++) { const t = a / 64 * Math.PI * 2; put(g, Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), ch); }
  }
  function chairUnder(av, view, spin) {
    const g = blank(PW, PW);
    if (view === 'side') {
      for (let y = 13; y <= 22; y++) { put(g, 10, y, 'v'); put(g, 11, y, 'v'); }        // the backrest and push handle
      put(g, 9, 13, 'v'); put(g, 8, 13, 'v');
      for (let x = 11; x <= 19; x++) put(g, x, 22, 'v');                                // the seat
      circle(g, 13, 23, 6, 'V'); circle(g, 13, 23, 5, 'r');                             // tire + hand rim
      for (let k = 0; k < 2; k++) {                                                     // spokes, turning
        const t = (spin * Math.PI / 4) + k * Math.PI / 2;
        for (let r = -4; r <= 4; r++) put(g, Math.round(13 + Math.cos(t) * r), Math.round(23 + Math.sin(t) * r), 'r');
      }
      put(g, 13, 23, 'v');
      for (let y = 23; y <= 29; y++) put(g, 20, y, 'v');                                // the leg frame
      for (let x = 19; x <= 23; x++) put(g, x, 30, 'v');                                // footrest
      put(g, 21, 31, 'V'); put(g, 22, 31, 'V');                                         // caster
    } else if (view === 'front') {
      [7, 24].forEach(x0 => {
        for (let y = 16; y <= 30; y++) { put(g, x0, y, 'V'); put(g, x0 + 1, y, (y + spin * 2) % 4 === 0 ? 'v' : 'r'); }
      });
      [10, 21].forEach(x => { for (let y = 12; y <= 14; y++) put(g, x, y, 'v'); });     // push handles
      for (let x = 11; x <= 20; x++) put(g, x, 30, 'v');                                // footrest
    }
    return outline(g);
  }
  function chairOver(av, spin) {                                                          // from behind: the backrest covers your back
    const g = blank(PW, PW);
    [7, 24].forEach(x0 => { for (let y = 16; y <= 30; y++) { put(g, x0, y, 'V'); put(g, x0 + 1, y, (y + spin * 2) % 4 === 0 ? 'v' : 'r'); } });
    for (let y = 12; y <= 23; y++) for (let x = 11; x <= 20; x++) put(g, x, y, y < 14 && x > 11 && x < 20 ? '.' : 'v');
    for (let y = 24; y <= 29; y++) { put(g, 11, y, 'v'); put(g, 20, y, 'v'); }
    return outline(g);
  }
  function seatedLegs(av, view) {
    const g = blank(PW, PW), bottom = partOf(P.BOTTOMS, av.bottom), shoe = partOf(P.SHOES, av.shoes);
    const bare = bottom.legs === 'shorts' || bottom.legs === 'skirt';
    if (view === 'side') {
      for (let x = 13; x <= 20; x++) for (let y = 21; y <= 22; y++) put(g, x, y, bare && x > 17 ? 's' : 'p');
      if (bottom.legs === 'skirt') for (let x = 12; x <= 19; x++) put(g, x, 23, 'p');
      for (let y = 23; y <= 28; y++) { put(g, 19, y, bare ? 's' : 'p'); put(g, 20, y, bare ? 's' : 'p'); }
      if (bottom.cuff) { put(g, 19, 28, 'P'); put(g, 20, 28, 'P'); }
      for (let x = 19; x <= 22; x++) put(g, x, 29, shoe.sole ? 'Q' : 'q');
      for (let x = 19; x <= 22; x++) put(g, x, 28, shoe.sandal && x % 2 ? 's' : 'q');
      if (shoe.rows === 3) { put(g, 19, 27, 'q'); put(g, 20, 27, 'q'); }
      if (shoe.skate) put(g, 23, 29, 'Q');
    } else {
      for (let x = 12; x <= 19; x++) for (let y = 21; y <= 23; y++) put(g, x, y, bottom.legs === 'shorts' && y === 23 ? 's' : 'p');
      if (bottom.legs === 'skirt') { put(g, 11, 23, 'p'); put(g, 20, 23, 'p'); }
      [[12, 14], [17, 19]].forEach(([a, b]) => {
        for (let y = 24; y <= 27; y++) for (let x = a; x <= b; x++) put(g, x, y, bare ? 's' : bottom.cuff && y === 27 ? 'P' : 'p');
        for (let y = 28; y <= 29; y++) for (let x = a - 1; x <= b; x++) put(g, x, y, shoe.sandal ? (y === 29 ? 'Q' : x % 2 ? 's' : 'q') : shoe.sole && y === 29 ? 'Q' : 'q');
        if (shoe.rows === 3) for (let x = a; x <= b; x++) put(g, x, 27, 'q');
      });
    }
    return outline(g);
  }

  /** one frame's layers (the same order as the old arcade-quest/engine/sprites.js, with the avatar's own body) */
  function frameLayers(av, eq, pal, view, pose, bob, step, spin, parts) {
    const ART = window.QUEST_ART, IP = ART.INSTRUMENT_PALETTE, S = ART.SHAPES;
    const L = (g, palette, dy = 0) => ({g, pal: palette, dy});
    const top = partOf(P.TOPS, av.top), sleeveCh = top.sleeveCh || (top.base === 'black' ? 'K' : 'c');
    const partsGrid = z => {
      const g = blank(PW, PW);
      (pose.parts || []).forEach(([shape, x, y, pz = 'front']) => {
        if (view === 'back' ? z === 'back' : pz === z) stamp(g, {y, x, rows: S[shape] || []});
      });
      return outline(g);
    };
    const out = [];
    if (av.chair) {
      if (view !== 'back') out.push(L(chairUnder(av, view, spin), pal));
      if (view !== 'back') out.push(L(seatedLegs(av, view), pal));
    } else out.push(L(legGrid(av, view === 'side' ? 'side' : 'front', step), pal));
    const bodyG = outline(parts.body), behindG = outline(parts.behind, parts.body), overG = outline(parts.over, parts.body);
    out.push(L(behindG, pal, bob));
    const mask = parts.body;
    const H = pose.hands || {};
    if (view === 'side') {
      const SH = ART.SHOULDERS.side, back = H.back === 'rest' || !H.back ? null : H.back, front = H.front === 'rest' || !H.front ? null : H.front;
      const hang = sh => av.chair ? [sh[0] + 2, 21] : [sh[0], 22];
      out.push(L(armGrid(SH.back, back || hang(SH.back), !back, mask, top.sleeve, sleeveCh), pal, bob));
      out.push(L(partsGrid('back'), IP, bob));
      out.push(L(bodyG, pal, bob));
      out.push(L(partsGrid('front'), IP, bob));
      if (back) out.push(L(handOnly(back), pal, bob));
      out.push(L(armGrid(SH.front, front || hang(SH.front), true, mask, top.sleeve, sleeveCh), pal, bob));
      out.push(L(partsGrid('top'), IP, bob));
    } else {
      const SH = ART.SHOULDERS.front, hang = sh => av.chair ? [sh[0] + (sh[0] < 16 ? 0 : 0), 21] : [sh[0], 22];
      const arms = ['left', 'right'].map(k => armGrid(SH[k], H[k] && H[k] !== 'rest' ? H[k] : hang(SH[k]), true, mask, top.sleeve, sleeveCh));
      if (view === 'back') {
        out.push(L(partsGrid('back'), IP, bob));
        arms.forEach(a => out.push(L(a, pal, bob)));
        out.push(L(bodyG, pal, bob));
        out.push(L(overG, pal, bob));
        if (av.chair) out.push(L(chairOver(av, spin), pal));
      } else {
        out.push(L(partsGrid('back'), IP, bob));
        out.push(L(bodyG, pal, bob));
        out.push(L(partsGrid('front'), IP, bob));
        arms.forEach(a => out.push(L(a, pal, bob)));
        out.push(L(partsGrid('top'), IP, bob));
      }
    }
    return out;
  }
  const spriteCache = new Map();
  /** every sprite of the avatar holding `member`'s instrument (see the top of this file) */
  function sprites(member, {avatar, eq} = {}) {
    const ART = window.QUEST_ART;
    if (!ART || !ART.POSES) return null;
    const av = avatar ? normalize(avatar) : get();
    eq = eq || eqFor(member);
    const key = JSON.stringify([av, member, eq.color, eq.acc]);
    if (spriteCache.has(key)) return spriteCache.get(key);
    // animated items play their 4 frames here too (none with reduced motion: every frame is frame 0)
    const moving = isAnimated(av, eq, {bust: false}) && !(window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)')).matches;
    const F = moving ? [0, 1, 2, 3] : [0];
    const pals = F.map(f => palette(av, eq, {f}));
    const heads = F.map(f => ({front: headAndBody(av, eq, 'front', f), side: headAndBody(av, eq, 'side', f), back: headAndBody(av, eq, 'back', f)}));
    const Pz = ART.POSES[member] || ART.POSES.trumpet;
    const play = [].concat(Pz.play), percussion = play.length > 1;
    const IDLE = moving ? [[0, {}, 0], [1, {}, 0], [0, {}, 0], [1, {}, 0]] : [[0, {}, 0], [1, {}, 0]];
    const WALK = av.chair
      ? {side: [0, 1, 2, 3].map(s => [0, {}, s]), front: [0, 1, 2, 3].map(s => [0, {}, s])}           // rolling: the wheels turn
      : {side: [[0, {back: -2, front: 2}, 0], [1, {}, 0], [0, {back: 2, front: -2}, 0], [1, {}, 0]],
         front: [[0, {left: 2}, 0], [1, {}, 0], [0, {right: 2}, 0], [1, {}, 0]]};
    const make = (view, pose, list, extra) => Object.assign({w: PW, h: PW, fps: 2,
      frames: list.map(([bob, step, spin], i) => { const f = F[i % F.length], pet = petLayer(av, false, i % 2, f);
        return paint(PW, PW, frameLayers(av, eq, pals[i % F.length], view, typeof pose === 'function' ? pose(i) : pose, bob, step, spin, heads[i % F.length][view]).concat(pet ? [pet] : [])); })}, extra || {});
    const out = {
      '': make('side', Pz.side, IDLE),
      '-walk': make('side', Pz.side, WALK.side, {fps: 8}),
      '-front': make('front', Pz.front, IDLE),
      '-front-walk': make('front', Pz.front, WALK.front, {fps: 8}),
      '-back': make('back', Pz.front, IDLE),
      '-back-walk': make('back', Pz.front, WALK.front, {fps: 8}),
      '-play': make('side', i => play[i % play.length], percussion ? [[0, {}, 0], [0, {}, 0]] : IDLE, percussion ? {strike: true} : {}),
    };
    if (spriteCache.size > 40) spriteCache.clear();
    spriteCache.set(key, out);
    return out;
  }

  /* ---------- THE FIGHT POSES (shared/avatar-fight.js shows them; Button Masher's fighter) ----------
     Every pose is the same layers as the full-body sprite (frameLayers), with the LOWER part (legs, or the wheelchair
     and the seated legs) and the UPPER part (everything else: body, head, hair, hats, arms, instrument, all moving
     together, so nothing ever floats off) shifted by whole pixels. Facing right, on a FIGHT_W × FIGHT_H canvas with the
     32 × 32 figure at (FIGHT_X, FIGHT_Y). IDLE: carry pose, wide stance, a 1-pixel bob. STRIKE: playing pose, lunging
     (bells and snare: mallets / sticks up, then down). HIT: pushed back a step, a small impact burst. DIZZY: swaying, stars circling the head.
     KO: a cartoon sit-down on the floor, the instrument set down behind, stars (in a wheelchair: slumped in the chair).
     VICTORY: a fanfare: playing, jumping (in a wheelchair: bouncing in the chair), two little notes rising. BOW: facing the viewer, a slow bow. A wheelchair never moves: only the
     body leans in it. No pose is ever a hurt or an injury: a flop, stars, a bow. */
  const FIGHT_W = 44, FIGHT_H = 37, FIGHT_X = 6, FIGHT_Y = 5;
  const STAR_PAL = {'*': 'yellow-hi', '+': 'yellow', o: 'av-out'};
  /** three little stars circling above the head (k: 0–3, a quarter of the way round each; y is above the grid) */
  function starsLayer(k, cx = 15, cy = 0) {
    const g = blank(PW, PW), Y0 = 6;
    for (let s = 0; s < 3; s++) {
      const t = k * Math.PI / 6 + s * Math.PI * 2 / 3, x = Math.round(cx + Math.cos(t) * 7), y = Math.round(cy + Math.sin(t) * 2) + Y0;
      put(g, x, y, '*'); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => put(g, x + a, y + b, '+'));
    }
    return {g: outline(g), pal: STAR_PAL, dy: -Y0};
  }
  /** two little music notes rising around the head (VICTORY's fanfare; k: 0–3) */
  const NOTE_ROWS = ['.##', '.#.', '.#.', '##.', '##.'];
  function notesLayer(k, family) {
    const g = blank(PW, PW), Y0 = 6, ch = family === 'woodwind' ? 'w' : family === 'percussion' ? 'c' : 'b';
    [[4, 8, 0], [26, 4, 2]].forEach(([x, y, ph]) => stamp(g, {x, y: y + Y0 - ((k + ph) % 4) * 2, rows: NOTE_ROWS.map(r => r.replace(/#/g, ch))}));
    return {g: outline(g), pal: {w: 'pink-hi', b: 'amber-hi', c: 'cyan-hi', o: 'av-out'}, dy: -Y0};
  }
  /** a small steady impact burst in front of the chest (HIT) */
  function impactLayer(x = 22, y = 13) {
    const g = blank(PW, PW);
    [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [4, 1], [-2, 1], [1, -2], [1, 4]].forEach(([a, b]) => put(g, x + a, y + b, b === 1 || a === 1 ? '*' : '+'));
    return {g: outline(g), pal: {'*': 'red-hi', '+': 'yellow-hi', o: 'av-out'}};
  }
  /** sitting on the floor (KO): the legs straight out in front along the ground, feet up */
  function floorLegs(av) {
    const g = blank(PW, PW), bottom = partOf(P.BOTTOMS, av.bottom), shoe = partOf(P.SHOES, av.shoes);
    const bare = bottom.legs === 'shorts' || bottom.legs === 'skirt';
    for (let x = 13; x <= 23; x++) for (let y = 28; y <= 29; y++) put(g, x, y, bare && x > 16 ? 's' : 'p');
    if (bottom.legs === 'skirt') for (let x = 12; x <= 17; x++) put(g, x, 27, 'p');
    if (bottom.cuff) { put(g, 23, 28, 'P'); put(g, 23, 29, 'P'); }
    for (let y = 26; y <= 29; y++) for (let x = 24; x <= 25; x++) put(g, x, y, shoe.sandal ? (x === 25 ? 'Q' : 's') : shoe.sole && x === 25 ? 'Q' : 'q');
    if (shoe.skate) put(g, 25, 25, 'Q');
    return outline(g);
  }
  /** the instrument set down on the ground behind a seated (KO) avatar: its carry parts, moved as one */
  function groundedParts(pose) {
    const ART = window.QUEST_ART, S = ART.SHAPES, parts = pose.parts || [];
    if (!parts.length) return null;
    let x0 = 99, x1 = -99, y1 = -99;
    parts.forEach(([sh, x, y]) => { const r = S[sh] || []; x0 = Math.min(x0, x); x1 = Math.max(x1, x + Math.max(0, ...r.map(w => w.length)) - 1); y1 = Math.max(y1, y + r.length - 1); });
    const dx = Math.max(-x0, 10 - x1), dy = 31 - y1, g = blank(PW, PW);
    parts.forEach(([sh, x, y]) => stamp(g, {x: x + dx, y: y + dy, rows: S[sh] || []}));
    return {g: outline(g), pal: ART.INSTRUMENT_PALETTE};
  }
  const fightCache = new Map();
  function fightSprites(member, {avatar, eq} = {}) {
    const ART = window.QUEST_ART;
    if (!ART || !ART.POSES) return null;
    const av = avatar ? normalize(avatar) : get();
    eq = eq || eqFor(member);
    const key = JSON.stringify([av, member, eq.color, eq.acc]);
    if (fightCache.has(key)) return fightCache.get(key);
    const moving = isAnimated(av, eq, {bust: false}) && !(window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)')).matches;
    const F = moving ? [0, 1, 2, 3] : [0];
    const pals = F.map(f => palette(av, eq, {f}));
    const heads = F.map(f => ({front: headAndBody(av, eq, 'front', f), side: headAndBody(av, eq, 'side', f)}));
    const Pz = ART.POSES[member] || ART.POSES.trumpet, play = [].concat(Pz.play), sit = !!av.chair;
    const lowerN = sit ? 2 : 1;
    // one frame: o = {view, pose, bob, step, ux, uy (the upper part), lx, ly (the lower part), legs, under, over}
    const frame = (o, i) => {
      const fi = i % F.length, pal = pals[fi];
      let ls = frameLayers(av, eq, pal, o.view || 'side', o.pose || Pz.side, o.bob || 0, o.step || {}, 0, heads[fi][o.view || 'side']);
      ls = ls.map((l, n) => n < lowerN ? Object.assign({}, l, {dx: o.lx || 0, dy: (l.dy || 0) + (o.ly || 0)})
        : Object.assign({}, l, {dx: o.ux || 0, dy: (l.dy || 0) + (o.uy || 0)}));
      if (o.legs) ls[0] = {g: o.legs, pal, dx: 0, dy: 0};
      return paint(FIGHT_W, FIGHT_H, (o.under || []).concat(ls, o.over ? o.over(i) : []).filter(Boolean)
        .map(l => Object.assign({}, l, {dx: (l.dx || 0) + FIGHT_X, dy: (l.dy || 0) + FIGHT_Y})));
    };
    const pose = (list, fps) => ({fps, frames: list.map(frame)});
    const stance = sit ? {} : {back: -1, front: 1};
    const stars = i => [starsLayer(i % 4)];
    const fam = (A.memberById && (A.memberById(member) || {}).family) || 'brass';
    const out = {
      idle: pose((moving ? [0, 1, 2, 3] : [0, 1]).map(k => ({bob: k % 2, step: stance})), 2),
      strike: pose([0, 1].map(k => ({pose: play[k % play.length], ux: sit ? 1 : 1 + k, step: sit ? {} : {back: -2, front: 2}})), 4),   // 4 a second: at most 2 flashes a second
      hit: pose([0, 1].map(k => ({ux: sit ? -1 : -3 + k, step: sit ? {} : {back: -3 + k, front: -1}, over: () => [impactLayer(sit ? 21 : 20 + k)]})), 4),
      dizzy: pose([0, 1, 2, 3].map(k => ({ux: [-1, 0, 1, 0][k], step: stance, over: stars})), 4),
      ko: sit
        ? pose([0, 1, 2, 3].map(() => ({ux: -1, uy: 1, pose: Object.assign({}, Pz.side), over: stars})), 3)
        : pose([0, 1, 2, 3].map(() => ({pose: {parts: [], hands: {back: 'rest', front: 'rest'}}, uy: 7, legs: floorLegs(av), under: [groundedParts(Pz.side)],
            over: i => [starsLayer(i % 4, 15, 7)]})), 3),
      // VICTORY: a fanfare: playing, jumping (a wheelchair user bounces in the chair), little notes rising
      victory: pose([0, 1, 2, 3].map(k => { const j = [3, 2, 0, 0][k], P0 = play[k % play.length];
        return sit ? {pose: P0, uy: -(j ? 1 : 0), over: () => [notesLayer(k, fam)]} : {pose: P0, uy: -j, ly: -j, over: () => [notesLayer(k, fam)]}; }), 4),
      bow: pose([0, 1].map(k => ({view: 'front', pose: Pz.front, uy: k * (sit ? 1 : 2)})), 1),
    };
    // the pet alone, for the player's corner (its own idle frames and bob)
    const petPart = partOf(P.PETS, av.pet);
    let pet = null;
    if (petPart && petPart.rows) {
      const [px, py] = P.PET_AT.sprite;
      pet = {fps: 2, frames: [0, 1, 2, 3].map(f => { const l = petLayer(av, false, 0, moving ? f : 0); return paint(10, 10, [Object.assign({}, l, {dx: 1 - px, dy: 1 - py})]); })};
    }
    const res = {w: FIGHT_W, h: FIGHT_H, x: FIGHT_X, y: FIGHT_Y, poses: out, pet, chair: sit};
    if (fightCache.size > 20) fightCache.clear();
    fightCache.set(key, res);
    return res;
  }

  /** the NAME PLATE (the 'plate' slot, CSS .av-plate-<id> in theme.css) as a class attribute, or '' */
  const plateAttr = av => (av && av.plate && av.plate !== 'none' ? ` class="av-plate av-plate-${esc(av.plate)}"` : '');
  /** RESULTS SCREENS: the player's avatar and name at the top of a results panel (shared/skins.js's announce()
      calls it on every results screen); the instrument is the one the result was for */
  function stampResults(panel, member) {
    if (!panel || !A.store) return;
    let row = panel.querySelector(':scope > .av-res');
    if (!row) { row = document.createElement('p'); row.className = 'av-res'; panel.insertBefore(row, panel.firstChild); }
    const m = member && A.memberById ? A.memberById(member) : null;
    const hasPic = [...panel.querySelectorAll('.av-box')].some(x => !row.contains(x));    // the game shows the avatar already (Button Masher)
    row.innerHTML = (hasPic ? '' : `<span class="av-res-pic">${avatarHTML({size: 'tile', member: m ? member : null, label: '', live: true})}</span>`) +
      `<span class="av-res-txt"><b data-av-name="me"${plateAttr(get())}>${esc(nameOf(get()))}</b>${m ? `<small>${esc(m.short)}</small>` : ''}</span>`;
  }

  A.Avatar = {
    stampResults, isUnlocked, requirement, progress, items, LOCKABLE: Object.keys(LOCKABLE), freshItems, effective, itemKey,
    /** mark items' UNLOCKED! cards as shown */
    // (a ?season= preview's event items are never marked: the real event must still celebrate them)
    markSeen: list => {
      const pv = it => it.event && A.Seasons && A.Seasons.preview;
      if (A.Seasons && A.Seasons.preview) A.Seasons.markPreviewSeen(list.filter(pv).map(it => it.key));
      st().markItemsSeen(list.filter(it => !pv(it)).map(it => it.key));
    },
    VERSION, FIELDS, get, set, guest, setGuest, random, randomName, normalize, nameOf, clone, nameNote, cleanName,
    /** the builder's words for 'title' | 'adj' | 'noun' (A–Z, no repeats, no NEVER-USE words) */
    words: k => NAMES[NAME_PARTS[k] || k] || [], banned, wordNumber, wordAt, nameNumbers, nameFromNumbers, MYSTERY,
    /** the numbered raw lists with retired words' '#' taken off (avatar-code.js stores names by these numbers) */
    numberedWords: k => (RAW_LISTS[k] || []).map(w => String(w).replace(/^#/, '')),
    bustURL, bustCanvas, bustFrames, isAnimated, sprites, fightSprites, redrawAll, eqFor,
    /** a live box's avatar {av, eq} (its data-live id) */
    liveInfo: id => LIVE.get(String(id)), plateAttr,
    /** the parts' lists (the creator reads them) */
    parts: P, names: NAMES,
  };
  A.avatarHTML = avatarHTML;
})(window.Arcade);
