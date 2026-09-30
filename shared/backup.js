/* Band Arcade: BACKUP CODES. Everything the arcade remembers lives on ONE device (localStorage). A code carries it to
   another device, or keeps it safe. Two kinds, both typed with the same 32 characters (no 0/O or 1/I to mix up):
     23456789ABCDEFGHJKLMNPQRSTUVWXYZ
   Codes ignore spaces, dashes and lower case, and every code has a checksum, so a typo is caught ("That code doesn't
   look right. Check each letter.") instead of loading the wrong progress.

   1. THE ARCADE QUEST SAVE CODE (short: 60 characters, 12 groups of 5; older ones were 45, 40 or 25). Shown at every Save
      Jukebox and in the backup panel; ENTER SAVE CODE on Arcade Quest's title screen restores it.
      FORMAT (version 1): 125 bits, most significant bit first, 5 bits per character:
        version 4 · level 6 (1–63) · xp 9 (0–511) · tokens 11 (0–2047) · items 3 each (0–7, QUEST_V1.items order)
        · roster 1 each (QUEST_V1.roster) · flags 1 each (QUEST_V1.flags) · manor ghosts helped 1 each
        (QUEST_V1.ghosts) · last jukebox 3 (0 = none, else QUEST_V1.jukeboxes) · stars turned into tokens 11
        · zero padding to 110 bits · checksum 15 (CRC-32 of 'BAQ' + the 110 bits as bytes, low 15 bits).
      The lists below are PART OF THE FORMAT: never reorder or remove an entry. A future episode that needs more
      adds a NEW version (4-bit version field) with its own lists, and keeps reading version 1.
      Not in the code (they come back fresh): HP (full), battle counts (rebuilt), which star source was turned in
      (the total is kept and spread over this device's star sources at the Token Booth), settings.
      VERSION 2 (40 characters, 8 groups of 5; version 1 codes still load): 200 bits =
        the version-1 fields in the same order (version = 2) · charms owned 1 each (QUEST_V2.charms, 8 places)
        · charms equipped 3 + 3 (0 = empty slot, else 1 + the index in QUEST_V2.charms) · avatar items unlocked 1 each
        (QUEST_V2.cosmetics: bought at the Token Booth or earned; they load as owned) · avatar items worn 1 each (same
        list) · zero padding to 185 bits · checksum 15 (as above). Same rule: only ever ADD to the end of a list,
        while it still fits in the padding (5 bits free: 2 more avatar items).
      VERSION 3 (45 characters, 9 groups of 5): the version-2 layout (version = 3) with a longer item list,
        QUEST_V3.cosmetics = QUEST_V2's list + the newer Token Booth items, zero padding to 210 bits, checksum 15.
        FROZEN: QUEST_V3 never changes again (old version-3 codes must keep reading exactly the same).
      VERSION 4 (what the game makes now: 60 characters, 12 groups of 5; versions 1, 2 and 3 still load, each with
        its own frozen list, so an old code gives exactly the result it always did): the version-3 layout (version =
        4) with QUEST_V4.cosmetics = QUEST_V3's list + the items added since (the Tumblers…), zero padding to 285 bits,
        checksum 15. Room for 82 items (2 bits each after the 120 bits before them): 35 free today. A new Token Booth
        item goes at the END of QUEST_V4.cosmetics; when the padding runs out, add a version 5 the same way.
   2. THE ARCADE BACKUP CODE (long: EVERYTHING on the device: stars and progress for every game and instrument,
      skins unlocked and equipped, settings, the Arcade Quest save). Too long to type comfortably, so the panel
      has a COPY button (and shows the short Quest code too).
      FORMAT: 'BKP' + format letter ('A' = format 1) + 'Z' (deflate-raw, CompressionStream) or 'R' (plain) + the
      bytes of JSON {v: 1, at: <time>, data: <Arcade.store.exportAll()>} in base-32 + 7 characters of CRC-32.
      Shown in groups of 5. Restoring asks first ("This will replace this device's progress. Continue?"), then
      replaces everything (Arcade.store.importAll) and reloads the page.
   Arcade.Backup.open()            the BACKUP / RESTORE panel (arcade floor sound panel, Select Player's player card)
   Arcade.Backup.button(el, cls)   adds a BACKUP / RESTORE button to el
   Arcade.Backup.questEncode(save) -> 60 characters in groups of 5 (version 4)
   Arcade.Backup.questDecode(code) -> {ok: true, fields} | {ok: false, error}   (arcade-quest/engine/save.js builds the save)
   Arcade.Backup.fullEncode() -> Promise<code>;  fullDecode(code) -> Promise<{ok, data} | {ok: false, error}> */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const BAD = "That code doesn't look right. Check each letter.";

  /* ---------- bits and characters ---------- */
  function writer() {
    const bits = [];
    return {bits, put(v, n) { v = Math.max(0, Math.min(2 ** n - 1, Math.round(+v || 0))); for (let i = n - 1; i >= 0; i--) bits.push(Math.floor(v / 2 ** i) % 2); }};
  }
  function reader(bits) {
    let i = 0;
    return {get(n) { let v = 0; for (let k = 0; k < n; k++) v = v * 2 + (bits[i++] || 0); return v; }, get pos() { return i; }};
  }
  const bitsToChars = bits => { let s = ''; for (let i = 0; i < bits.length; i += 5) { let v = 0; for (let k = 0; k < 5; k++) v = v * 2 + (bits[i + k] || 0); s += ALPHA[v]; } return s; };
  const charsToBits = str => { const out = []; for (const c of str) { const v = ALPHA.indexOf(c); for (let k = 4; k >= 0; k--) out.push((v >> k) & 1); } return out; };
  const bitsToBytes = bits => { const out = new Uint8Array(Math.ceil(bits.length / 8)); bits.forEach((b, i) => { if (b) out[i >> 3] |= 128 >> (i & 7); }); return out; };
  const bytesToBits = bytes => { const out = []; bytes.forEach(b => { for (let k = 7; k >= 0; k--) out.push((b >> k) & 1); }); return out; };
  /** a typed code -> just its characters (upper case, no spaces/dashes), or null if anything else is in it */
  function clean(code) {
    const s = String(code || '').toUpperCase().replace(/[\s\-_.·,]/g, '');
    return s && [...s].every(c => ALPHA.includes(c)) ? s : null;
  }
  const group = (s, n = 5, sep = '-') => s.match(new RegExp(`.{1,${n}}`, 'g')).join(sep);
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(bytes) { let c = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  const utf8 = s => new TextEncoder().encode(s), unutf8 = b => new TextDecoder().decode(b);

  /* ---------- 1. the Arcade Quest save code ---------- */
  const QUEST_V1 = {
    version: 1,
    items: ['valve-oil', 'cork-grease', 'metronome', 'snack', 'tuning-slide', 'baton'],
    roster: ['squawk', 'warble', 'clatterbox', 'quizzle', 'stickyvalve', 'wisp', 'squeaker', 'hush', 'wobble', 'chatterbox', 'fermata', 'conductor'],
    flags: ['songBb', 'reginaldAwake', 'atticOpen', 'ep1Done', 'met-mezzo', 'met-rusty', 'met-terry', 'met-reginald', 'met-twins', 'met-butler', 'met-conductor', 'seen-intro'],
    // [room:ghost key, its enemy type] for every manor ghost that stays helped
    ghosts: [['hall:w1', 'wisp'], ['hall:w2', 'wisp'], ['hall:w3', 'wisp'], ['hall:s1', 'squeaker'], ['library:h1', 'hush'], ['library:h2', 'hush'],
      ['library:h3', 'hush'], ['library:w1', 'wisp'], ['ballroom:b1', 'wobble'], ['ballroom:b2', 'wobble'], ['ballroom:b3', 'wobble'],
      ['ballroom:s1', 'squeaker'], ['kitchen:c1', 'chatterbox'], ['kitchen:c2', 'chatterbox'], ['kitchen:c3', 'chatterbox'], ['kitchen:w1', 'wisp'],
      ['stairs:boss', 'fermata'], ['stairs:b1', 'wobble'], ['stairs:c1', 'chatterbox'], ['attic:boss', 'conductor']],
    // where you stand after loading at each Save Jukebox (index 1, 2…; 0 = never saved)
    jukeboxes: [null, {map: 'foyer', x: 18, y: 3, dir: 'up'}, {map: 'attic', x: 2, y: 3, dir: 'up'}],
  };
  const QUEST_V2 = {
    version: 2,
    charms: ['golden-mouthpiece', 'lucky-reed', 'metronome-charm', 'silver-mute', 'tuning-fork', 'echo-chime', 'sharp-ear'],      // 8 places (append only)
    cosmetics: ['eyes:stars', 'eyes:hearts', 'eyes:wink', 'mouth:tongue', 'mouth:whistle', 'hairColor:gold', 'hairColor:neon',
      'hairColor:galaxy', 'hairColor:flametip', 'head:tophat', 'head:wizard', 'head:plumeshako', 'head:royalcrown', 'head:diamondband',
      'top:rockstar', 'top:tuxedo', 'top:champion', 'top:sequin', 'pet:ghost', 'pet:animatronic', 'pet:note', 'pet:star', 'pet:metronome',
      'back:pixelcape', 'back:jetpack', 'back:wings', 'bg:bubbles', 'bg:fireflies', 'bg:lavalamp', 'bg:confetti'],
  };
  const QUEST_V3 = {
    version: 3,
    // QUEST_V2's list, then the newer Token Booth items (only ever add to the END)
    cosmetics: QUEST_V2.cosmetics.concat(['head:pirate', 'head:glowphones', 'top:stagejacket', 'shoes:lightup', 'hand:glowstick', 'hand:wand',
      'pet:penguin', 'pet:narwhal', 'back:featherwings', 'effect:snow', 'effect:confetti', 'plate:neon', 'plate:flames']),
  };
  const QUEST_V4 = {
    version: 4,
    // QUEST_V3's list (frozen), then the Token Booth items added since (only ever add to the END: 35 places left)
    cosmetics: QUEST_V3.cosmetics.concat(['hand:tumbler-pink', 'hand:tumbler-blue', 'hand:tumbler-lime', 'hand:tumbler-galaxy']),
  };
  const QUEST_DATA_BITS = 110, QUEST_CHECK_BITS = 15, QUEST_CHARS = 25;
  const QUEST_DATA_BITS_2 = 185, QUEST_CHARS_2 = 40, CHARM_SLOTS = 8;
  const QUEST_DATA_BITS_3 = 210, QUEST_CHARS_3 = 45;
  const QUEST_DATA_BITS_4 = 285, QUEST_CHARS_4 = 60;
  const V4_ROOM = (QUEST_DATA_BITS_4 - 120) / 2;                   // 82 items fit (owned + worn: 2 bits each)
  if (QUEST_V4.cosmetics.length > V4_ROOM && window.console) console.error(`backup.js: QUEST_V4.cosmetics has ${QUEST_V4.cosmetics.length} items, room for ${V4_ROOM}: add a version 5`);
  const questCheck = bits => crc32(new Uint8Array([66, 65, 81, ...bitsToBytes(bits)])) & (2 ** QUEST_CHECK_BITS - 1);
  /** this device's avatar items for the code: {owned: {key}, worn: {key}} (unlocked = bought or earned) */
  function cosmeticsNow() {
    const owned = {}, worn = {}, AV = A.Avatar, av = A.store.avatar || {};
    QUEST_V4.cosmetics.forEach(k => {
      const [f, id] = k.split(':');
      if (AV && AV.isUnlocked ? AV.isUnlocked(f, id) : (A.store.ownedItems || {})[k]) owned[k] = true;
      if (av[f] === id) worn[k] = true;
    });
    return {owned, worn};
  }
  function questEncode(s) {
    const L = QUEST_V1, w = writer();
    const conv = Object.values(s.converted || {}).reduce((n, v) => n + (+v || 0), 0) + (+s.convertedLeft || 0);
    const juke = s.world ? L.jukeboxes.findIndex(j => j && j.map === s.world.map) : 0;
    w.put(QUEST_V4.version, 4); w.put(s.level || 1, 6); w.put(s.xp, 9); w.put(s.tokens, 11);
    L.items.forEach(id => w.put((s.items || {})[id] || 0, 3));
    L.roster.forEach(id => w.put((s.roster || []).includes(id) ? 1 : 0, 1));
    L.flags.forEach(f => w.put((s.flags || {})[f] ? 1 : 0, 1));
    L.ghosts.forEach(([k]) => w.put((s.done || {})[k] ? 1 : 0, 1));
    w.put(Math.max(0, juke), 3); w.put(conv, 11);
    while (w.bits.length < 106) w.bits.push(0);                   // the version-1 fields end here
    const ch = s.charms || {}, cos = cosmeticsNow();
    for (let i = 0; i < CHARM_SLOTS; i++) w.put((ch.owned || {})[QUEST_V2.charms[i]] ? 1 : 0, 1);
    [0, 1].forEach(i => w.put((ch.equipped || [])[i] ? QUEST_V2.charms.indexOf(ch.equipped[i]) + 1 : 0, 3));
    QUEST_V4.cosmetics.forEach(k => w.put(cos.owned[k] ? 1 : 0, 1));
    QUEST_V4.cosmetics.forEach(k => w.put(cos.worn[k] ? 1 : 0, 1));
    while (w.bits.length < QUEST_DATA_BITS_4) w.bits.push(0);
    w.put(questCheck(w.bits), QUEST_CHECK_BITS);
    return group(bitsToChars(w.bits));
  }
  function questDecode(code) {
    const c = clean(code);
    if (!c || ![QUEST_CHARS, QUEST_CHARS_2, QUEST_CHARS_3, QUEST_CHARS_4].includes(c.length)) return {ok: false, error: BAD};
    const n = c.length === QUEST_CHARS ? QUEST_DATA_BITS : c.length === QUEST_CHARS_2 ? QUEST_DATA_BITS_2 : c.length === QUEST_CHARS_3 ? QUEST_DATA_BITS_3 : QUEST_DATA_BITS_4;
    const bits = charsToBits(c).slice(0, n + QUEST_CHECK_BITS), data = bits.slice(0, n);
    if (reader(bits.slice(n)).get(QUEST_CHECK_BITS) !== questCheck(data)) return {ok: false, error: BAD};
    const r = reader(data), version = r.get(4);
    if (version > 4 || version !== (n === QUEST_DATA_BITS ? 1 : n === QUEST_DATA_BITS_2 ? 2 : n === QUEST_DATA_BITS_3 ? 3 : 4)) return {ok: false, error: 'That code is from a newer Arcade Quest. Try it on the website version of the arcade.'};
    const L = QUEST_V1, f = {level: Math.max(1, r.get(6)), xp: r.get(9), tokens: r.get(11), items: {}, roster: [], flags: {}, done: {}, world: null, convertedLeft: 0};
    L.items.forEach(id => { const n = r.get(3); if (n) f.items[id] = n; });
    L.roster.forEach(id => { if (r.get(1)) f.roster.push(id); });
    L.flags.forEach(fl => { if (r.get(1)) f.flags[fl] = true; });
    L.ghosts.forEach(([k, type]) => { if (r.get(1)) f.done[k] = f.roster.includes(type) ? 'befriend' : 'fade'; });
    const j = r.get(3); f.world = L.jukeboxes[j] ? Object.assign({}, L.jukeboxes[j]) : null;
    f.convertedLeft = r.get(11);
    f.charms = {owned: {}, equipped: [null, null]}; f.cosmetics = {owned: [], worn: []};
    if (version >= 2) {
      const rr = reader(data.slice(106)), list = {2: QUEST_V2, 3: QUEST_V3, 4: QUEST_V4}[version].cosmetics;   // each version its own frozen list
      for (let i = 0; i < CHARM_SLOTS; i++) if (rr.get(1) && QUEST_V2.charms[i]) f.charms.owned[QUEST_V2.charms[i]] = true;
      [0, 1].forEach(i => { const k = rr.get(3); f.charms.equipped[i] = k ? QUEST_V2.charms[k - 1] || null : null; });
      list.forEach(k => { if (rr.get(1)) f.cosmetics.owned.push(k); });
      list.forEach(k => { if (rr.get(1)) f.cosmetics.worn.push(k); });
    }
    return {ok: true, fields: f};
  }

  /* ---------- 2. the whole-device backup code ---------- */
  const HEAD = 'BKP', FORMAT = 'A';
  async function streamBytes(bytes, Stream, fmt) {
    const s = new Blob([bytes]).stream().pipeThrough(new Stream(fmt));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function fullEncode() {
    let bytes = utf8(JSON.stringify({v: 1, at: Date.now(), data: A.store.exportAll()})), mode = 'R';
    if (window.CompressionStream) { try { bytes = await streamBytes(bytes, CompressionStream, 'deflate-raw'); mode = 'Z'; } catch (e) { /* plain */ } }
    const w = writer(); w.put(crc32(bytes), 35);
    return group(HEAD + FORMAT + mode + bitsToChars(bytesToBits(bytes)) + bitsToChars(w.bits), 5, ' ');
  }
  async function fullDecode(code) {
    const c = clean(code);
    if (!c) return {ok: false, error: BAD};
    if ((c.length === QUEST_CHARS || c.length === QUEST_CHARS_2) && questDecode(c).ok) return {ok: false, quest: true, error: "That's an Arcade Quest save code. Enter it on Arcade Quest's title screen (ENTER SAVE CODE)."};
    if (c.slice(0, 3) !== HEAD || c.length < 14) return {ok: false, error: BAD};
    if (c[3] !== FORMAT) return {ok: false, error: 'That backup code is from a newer version of the arcade.'};
    const mode = c[4], body = c.slice(5, -7), bytes = bitsToBytes(charsToBits(body)).slice(0, Math.floor(body.length * 5 / 8));
    if (reader(charsToBits(c.slice(-7))).get(35) !== crc32(bytes)) return {ok: false, error: BAD};
    try {
      let raw = bytes;
      if (mode === 'Z') {
        if (!window.DecompressionStream) return {ok: false, error: "This browser is too old to read that code. Try Chrome, or update this iPad's software."};
        raw = await streamBytes(bytes, DecompressionStream, 'deflate-raw');
      } else if (mode !== 'R') return {ok: false, error: BAD};
      const obj = JSON.parse(unutf8(raw));
      if (!obj || !obj.data || typeof obj.data !== 'object') return {ok: false, error: BAD};
      return {ok: true, data: obj.data, at: obj.at};
    } catch (e) { return {ok: false, error: BAD}; }
  }

  /* ---------- the BACKUP / RESTORE panel ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const sfx = n => { if (A.Sfx) A.Sfx.event(n); };
  async function copyText(text, ta) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* older browsers, file:// */ }
    try { ta.focus(); ta.select(); return document.execCommand('copy'); } catch (e) { return false; }
  }
  /* The panel opens ON TOP of whatever opened it (Settings, the leaderboard, Choose Your Instrument, Arcade Quest's
     panels, the app's first launch): Arcade.UI.layer (shared/ui-kit.js) lifts it above them (at least z 80, the
     BACKUP layer), below the yes/no question it asks (the kit's confirm, lifted above it) and the toasts. Focus goes
     in (MAKE MY BACKUP CODE), Tab stays inside, Esc closes (not while its question is open), the focus goes back to
     the button that opened it. iPad: the overlay scrolls, and a focused code box is kept above the on-screen
     keyboard (visualViewport). */
  function open() {
    const ov = document.createElement('div');
    ov.className = 'overlay bk-overlay';
    const quest = ((A.store.gameData('arcade-quest') || {}).save) || null;
    ov.innerHTML = `<div class="panel bk-panel" role="dialog" aria-modal="true" aria-labelledby="bkT">
      <h2 id="bkT">Backup / Restore</h2>
      <p class="bk-lead">Your stars, skins, settings and Arcade Quest save live on this device only. A backup code carries them to another device, or keeps them safe.</p>
      <section class="bk-sec"><h3>Back up this device</h3>
        <button type="button" class="btn btn-primary bk-make">Make my backup code</button>
        <div class="bk-out" hidden>
          <label class="bk-lbl" for="bkCode">Your backup code (everything on this device)</label>
          <textarea id="bkCode" class="bk-code" rows="5" readonly spellcheck="false"></textarea>
          <div class="bk-row"><button type="button" class="btn btn-small bk-copy">Copy</button><span class="bk-len" aria-live="polite"></span></div>
          <p class="bk-tip">Paste it somewhere safe: an email to yourself, Google Classroom, a note. Any change to it and it won't load.</p>
        </div>
        ${quest && quest.v ? `<p class="bk-quest">Arcade Quest only (short enough to write down):<br><b class="bk-qcode">${esc(questEncode(quest))}</b></p>` : ''}
      </section>
      <section class="bk-sec"><h3>Restore from a code</h3>
        <label class="bk-lbl" for="bkIn">Paste your backup code</label>
        <textarea id="bkIn" class="bk-in" rows="3" spellcheck="false" autocapitalize="characters" autocomplete="off"></textarea>
        <button type="button" class="btn bk-restore">Restore</button>
        <p class="bk-msg" role="alert"></p>
      </section>
      <div class="acts"><button type="button" class="btn btn-secondary bk-close">Done</button></div></div>`;
    document.body.appendChild(ov);
    const $ = s => ov.querySelector(s);
    const msg = (t, cls = '') => { const m = $('.bk-msg'); m.textContent = t; m.className = 'bk-msg ' + cls; };
    $('.bk-make').addEventListener('click', async () => {
      sfx('ui-toggle');
      const code = await fullEncode();
      $('.bk-out').hidden = false; $('.bk-code').value = code;
      $('.bk-len').textContent = `${code.replace(/\s/g, '').length} characters`;
    });
    $('.bk-copy').addEventListener('click', async () => {
      const ok = await copyText($('.bk-code').value, $('.bk-code'));
      $('.bk-len').textContent = ok ? 'Copied! Paste it somewhere safe.' : 'Select the code and copy it.';
    });
    $('.bk-restore').addEventListener('click', async () => {
      const res = await fullDecode($('.bk-in').value);
      if (!res.ok) { msg(res.error, 'bad'); sfx('note-wrong'); return; }
      msg(res.at ? `A backup from ${new Date(res.at).toLocaleDateString()}.` : '');
      // the shared yes/no question (shared/ui-kit.js)
      const yes = await A.UI.confirm({title: 'Replace this device’s progress?', text: 'This will replace this device’s progress with the backup. Continue?',
        yes: 'Yes, replace it', no: 'No', danger: true});
      if (!yes) { msg('Nothing changed.'); return; }
      if (!A.store.importAll(res.data)) { msg(BAD, 'bad'); return; }
      msg('Restored! Reloading…', 'good');
      setTimeout(() => location.reload(), 700);
    });
    // iPad's on-screen keyboard: room under the panel for it, and the focused code box scrolled into the visible part
    const vv = window.visualViewport;
    const keepVisible = () => {
      const f = document.activeElement;
      if (!f || !ov.contains(f) || !/^(TEXTAREA|INPUT)$/.test(f.tagName)) { ov.style.paddingBottom = ''; return; }
      const kb = vv ? Math.max(0, innerHeight - vv.height - vv.offsetTop) : 0;
      ov.style.paddingBottom = kb ? `${kb + 16}px` : '';
      // the overlay scrolls itself (theme.css .overlay): center the box in the part the keyboard leaves visible
      const r = f.getBoundingClientRect(), top = vv ? vv.offsetTop : 0, bottom = vv ? vv.offsetTop + vv.height : innerHeight;
      if (r.bottom > bottom - 8 || r.top < top) ov.scrollTop += (r.top + r.height / 2) - (top + bottom) / 2;
    };
    const later = () => setTimeout(keepVisible, 320);                 // after the keyboard has slid up
    ov.addEventListener('focusin', later);
    if (vv) vv.addEventListener('resize', keepVisible);
    const close = () => {
      if (!ov.isConnected) return;
      if (vv) vv.removeEventListener('resize', keepVisible);
      ov.remove();
      if (A.UI && A.UI.layer) A.UI.layer.close(ov);
    };
    $('.bk-close').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ['keydown', 'keyup'].forEach(t => ov.addEventListener(t, e => e.stopPropagation()));   // keys typed here never reach the page underneath
    if (A.UI && A.UI.layer) A.UI.layer.open(ov, {min: 80, trap: true, onEsc: close, focus: '.bk-make'});
    else { ov.style.zIndex = '80'; $('.bk-make').focus(); }
    ov.close = close;
    return ov;
  }
  function button(el, cls = 'btn btn-secondary btn-small') {
    if (!el) return null;
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls + ' bk-btn'; b.textContent = 'Backup / Restore';
    b.addEventListener('click', e => { e.stopPropagation(); open(); });
    el.appendChild(b);
    return b;
  }

  A.Backup = {ALPHA, QUEST_V1, QUEST_V2, QUEST_V3, QUEST_V4, BAD, clean, crc32, questEncode, questDecode, fullEncode, fullDecode, open, button};
})(window.Arcade);
