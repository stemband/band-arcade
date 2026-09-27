/* Band Arcade: THE BAND NINJA CONNECTION (optional). Mat's Band Ninja progress portal (a Google Apps Script web app)
   links students here and shows them codes. The arcade stays ANONYMOUS: it never sends anything anywhere, stores
   nothing off the device and has no logins. It only understands link settings and accepts/produces codes.
   Every game works exactly the same for a student who never uses a Band Ninja link, code or PIN.

   Loaded right after ui.js by every page (the avatar card page loads only what it draws).

   1. LINK SETTINGS: ?inst=<Band Ninja instrument name>, ?belt=<belt> (Note Ninja), ?rank=<belt> (Ancient Ninja
      Scrolls) are applied ONCE on load and then removed from the address (history.replaceState), so a reload doesn't
      apply them again and Arcade.link / Arcade.linkTo never pass them on (?demo still does).
        inst  → INSTRUMENT_ALIASES below → the saved instrument (store.setPlayer), so Choose Your Instrument is skipped.
                A name we don't know is ignored (the normal instrument screen shows).
        belt  → Note Ninja's level select selects that belt if it's open, else the highest open belt + a short line.
        rank  → Ancient Ninja Scrolls' temple selects that rank's chamber (every chamber is always open there).
   2. BELT REWARD CODES: Band Ninja shows one code per belt a student has fully earned (ABC-XXXX). beltUnlockCode()
      is EXACTLY the portal's Apps Script algorithm (ARCADE_CODE_SALT must match the portal's: change BOTH at the start
      of a school year). A right code at Arcade Quest's Token Booth (ENTER A CODE) opens that belt's OFFICIAL BAND
      NINJA GEAR (avatar-parts.js: unlock {bandninja: '<belt>'}). Saved in gameData('bandninja').belts, so the Arcade
      Backup Code carries it.
   Arcade.BandNinja: memberFor(name), link, levelWish(gameId), beltUnlockCode(belt), checkCode(text), has(belt),
   belts(), redeem(text) → {ok, belt, msg}, selfTest(). */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';

  /* ================= INSTRUMENT NAMES (MAT: add any name Band Ninja uses) =================
     Band Ninja's name → the arcade's instrument (member id). Case, spaces and punctuation don't matter ("Alto Sax",
     "alto-sax" and "ALTOSAX" are the same), and every instrument's own arcade name already works. */
  const INSTRUMENT_ALIASES = {
    'flute': 'flute', 'piccolo': 'flute',
    'oboe': 'oboe',
    'clarinet': 'clarinet', 'bb clarinet': 'clarinet', 'b flat clarinet': 'clarinet', 'soprano clarinet': 'clarinet',
    'bass clarinet': 'basscl',
    'bassoon': 'bassoon',
    'saxophone': 'altosax', 'sax': 'altosax', 'alto sax': 'altosax', 'alto saxophone': 'altosax', 'eb alto sax': 'altosax',
    'tenor sax': 'tenorsax', 'tenor saxophone': 'tenorsax',
    'bari sax': 'barisax', 'baritone sax': 'barisax', 'baritone saxophone': 'barisax', 'bari saxophone': 'barisax',
    'trumpet': 'trumpet', 'cornet': 'trumpet', 'bb trumpet': 'trumpet',
    'horn': 'horn', 'french horn': 'horn', 'horn in f': 'horn', 'f horn': 'horn',
    'trombone': 'trombone', 'bass trombone': 'trombone',
    'baritone': 'euphbc', 'euphonium': 'euphbc', 'baritone bc': 'euphbc', 'baritone bass clef': 'euphbc', 'euphonium bc': 'euphbc',
    'baritone tc': 'baritonetc', 'baritone treble clef': 'baritonetc', 'euphonium tc': 'baritonetc', 'euphonium treble clef': 'baritonetc',
    'tuba': 'tuba', 'sousaphone': 'tuba',
    'percussion': 'bells', 'bells': 'bells', 'bell kit': 'bells', 'mallets': 'bells', 'mallet percussion': 'bells',
    'orchestra bells': 'bells', 'orchestral bells': 'bells', 'glockenspiel': 'bells', 'xylophone': 'bells', 'marimba': 'bells',
    'snare': 'snare', 'snare drum': 'snare', 'drums': 'snare',
  };
  /** "B♭ Alto-Sax!" → "bbaltosax" */
  const norm = s => String(s || '').toLowerCase().replace(/♭/g, 'b').replace(/♯/g, '#').replace(/[^a-z0-9]/g, '');
  let aliasMap = null;
  function aliases() {
    if (aliasMap) return aliasMap;
    aliasMap = {};
    (A.PLAYERS || []).forEach(id => { const m = A.memberById(id); [id, m && m.name, m && m.short].forEach(n => { if (n) aliasMap[norm(n)] = id; }); });
    Object.keys(INSTRUMENT_ALIASES).forEach(k => { aliasMap[norm(k)] = INSTRUMENT_ALIASES[k]; });
    return aliasMap;
  }
  /** a Band Ninja instrument name → a member id, or null when we don't know it */
  function memberFor(name) {
    const id = aliases()[norm(name)];
    return id && A.memberById && A.memberById(id) ? id : null;
  }

  /* ================= BELT REWARD CODES (must stay identical to the portal's Apps Script) ================= */
  const ARCADE_CODE_SALT = "bandninja-2026"; // not secret: this repo is public. Must match the portal. Changed once per school year.
  const ARCADE_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const BELT_KEYS = ["white","yellow","orange","green","blue","purple","red","brown","black","diamond"];
  const BELT_CODE_ABBR = {white:"WHT",yellow:"YEL",orange:"ORG",green:"GRN",blue:"BLU",purple:"PUR",red:"RED",brown:"BRN",black:"BLK",diamond:"DIA"};
  function fnv1a(str){ let h=0x811c9dc5; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,0x01000193)>>>0; } return h>>>0; }
  function beltUnlockCode(beltKey){ let h=fnv1a(ARCADE_CODE_SALT+"|belt|"+beltKey); let s=""; for(let k=0;k<4;k++){ s+=ARCADE_CODE_ALPHABET.charAt(h%ARCADE_CODE_ALPHABET.length); h=Math.floor(h/ARCADE_CODE_ALPHABET.length); } return BELT_CODE_ABBR[beltKey]+"-"+s; }
  /** the codes this salt must make (the portal's list): selfTest() checks them in ?demo */
  const EXPECTED = {white: 'WHT-QQ5E', yellow: 'YEL-ZNEV', orange: 'ORG-H59T', green: 'GRN-3T3H', blue: 'BLU-U2CB',
    purple: 'PUR-9GTE', red: 'RED-FHE2', brown: 'BRN-UVHC', black: 'BLK-KYXS', diamond: 'DIA-GYR2'};
  const beltName = k => k.charAt(0).toUpperCase() + k.slice(1);
  /** what a student typed → the belt it opens, or null. Case, spaces and the dash don't matter */
  function checkCode(text) {
    const t = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (t.length !== 7) return null;
    return BELT_KEYS.find(k => beltUnlockCode(k).replace('-', '') === t) || null;
  }

  /* ---------- saved on this device (gameData: part of the Arcade Backup Code) ---------- */
  const data = () => A.store.gameData('bandninja');
  const belts = () => { try { return Object.assign({}, data().belts || {}); } catch (e) { return {}; } };
  const has = belt => !!belts()[belt];
  /* 10 tries a minute (sessionStorage: a reload doesn't reset it) */
  const TRIES = 10, TRY_MS = 60000, TRY_KEY = 'bandarcade.bn-tries';
  function tries() { try { return JSON.parse(sessionStorage.getItem(TRY_KEY) || '[]').filter(t => Date.now() - t < TRY_MS); } catch (e) { return memTries.filter(t => Date.now() - t < TRY_MS); } }
  let memTries = [];
  function addTry() { const l = tries().concat(Date.now()); memTries = l; try { sessionStorage.setItem(TRY_KEY, JSON.stringify(l)); } catch (e) { /* private mode */ } }
  const BAD = "That code didn't work. Check it on your Band Ninja page.";
  /** a code typed at the Token Booth: {ok, belt, msg, again (already had it), wait (too many tries)} */
  function redeem(text) {
    if (tries().length >= TRIES) return {ok: false, wait: true, msg: 'Too many tries. Wait a minute, then try again.'};
    addTry();
    const belt = checkCode(text);
    if (!belt) return {ok: false, msg: BAD};
    if (has(belt)) return {ok: true, belt, again: true, msg: `You already have your ${beltName(belt)} belt gear. Find it in Create Your Player.`};
    const d = data(); d.belts = Object.assign({}, d.belts || {}, {[belt]: Date.now()}); A.store.saveGameData('bandninja');
    return {ok: true, belt, msg: `${beltName(belt)} belt code accepted! Your official Band Ninja gear is unlocked.`};
  }

  /* ================= LINK SETTINGS (applied once, then removed from the address) ================= */
  const LINK_KEYS = ['inst', 'belt', 'rank'];
  const link = {inst: null, member: null, belt: null, rank: null};
  function readLink() {
    const p = A.params || new URLSearchParams(location.search);
    if (!LINK_KEYS.some(k => p.has(k))) return;
    const lower = k => (p.get(k) || '').trim().toLowerCase();
    link.inst = p.get('inst');
    link.member = link.inst ? memberFor(link.inst) : null;
    link.belt = BELT_KEYS.includes(lower('belt')) ? lower('belt') : null;
    link.rank = BELT_KEYS.indexOf(lower('rank')) >= 2 ? lower('rank') : null;      // the scrolls start at Orange
    // off the address (and out of A.params, so links built from it don't carry them)
    LINK_KEYS.forEach(k => p.delete(k));
    try {
      const u = new URL(location.href);
      LINK_KEYS.forEach(k => u.searchParams.delete(k));
      const q = u.searchParams.toString().replace(/=(?=&|$)/g, '');                // "?demo=" -> "?demo"
      history.replaceState(history.state, '', u.pathname + (q ? '?' + q : '') + u.hash);
    } catch (e) { /* file:// in some browsers: the settings still apply this once */ }
    if (link.member && A.store && A.store.player !== link.member) A.store.setPlayer(link.member);
  }
  /** the floor page (arcade.js showView) asks before opening Select Player for index.html?game=<id>: when the link
      gave the instrument and the game suits it, go straight to the game instead (true = leaving). Used once. */
  let skipped = false;
  function skipSelect() {
    const p = A.params, g = p && p.get('game') && (A.ALL_GAMES || A.GAMES || []).find(x => x.id === p.get('game'));
    if (skipped || !link.member || !g || g.players > 1) return false;
    skipped = true;
    if (A.blockedBy && A.blockedBy(g, link.member)) return false;
    const m = A.memberById(link.member);
    if (m && m.pitched === false && !g.unpitched) return false;
    const p2 = new URLSearchParams(p); ['game', 'players', 'need', 'pick'].forEach(k => p2.delete(k));
    const q = p2.toString().replace(/=(?=&|$)/g, '');
    location.replace(g.id + '/index.html' + (q ? '?' + q : '') + location.hash);
    return true;
  }
  /** the level the link asks for on this game's level select: {index, note(openIndex)} (used once), or null */
  function levelWish(gameId) {
    let w = null;
    if (gameId === 'note-ninja' && link.belt) {
      const b = link.belt;
      w = {index: BELT_KEYS.indexOf(b), note: () => `Your Band Ninja belt is ${beltName(b)}. Clear the belts below to get there!`};
      link.belt = null;
    } else if (gameId === 'ancient-ninja-scrolls' && link.rank) {
      const r = link.rank;
      w = {index: BELT_KEYS.indexOf(r) - 2, note: () => `Your Band Ninja rank is ${beltName(r)}.`};
      link.rank = null;
    }
    return w;
  }

  /** ?demo: the ten codes must be exactly the portal's */
  function selfTest() {
    const bad = BELT_KEYS.filter(k => beltUnlockCode(k) !== EXPECTED[k]);
    const ok = !bad.length && checkCode('grn 3t3h') === 'green' && checkCode('dia-gyr2') === 'diamond' && !checkCode('GRN-3T3J');
    if (!ok) console.error('Band Ninja codes do NOT match the portal:', bad.map(k => `${k}: ${beltUnlockCode(k)} ≠ ${EXPECTED[k]}`));
    return {ok, bad};
  }

  A.BandNinja = {INSTRUMENT_ALIASES, BELT_KEYS, BELT_CODE_ABBR, ARCADE_CODE_SALT, BAD, TRIES,
    memberFor, norm, beltUnlockCode, checkCode, redeem, has, belts, beltName, link, levelWish, skipSelect, selfTest,
    /** tests: forget the tries */
    resetTries() { memTries = []; try { sessionStorage.removeItem(TRY_KEY); } catch (e) { /* */ } }};

  readLink();
  if (A.DEMO) { const r = selfTest(); if (r.ok) console.info('Band Ninja codes: self-test passed'); }
})(window.Arcade);
