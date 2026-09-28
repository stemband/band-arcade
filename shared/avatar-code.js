/* Band Arcade: THE AVATAR CODE ("Share to Band Ninja"). A short code that holds ONLY the avatar's look: every slot,
   its colors, the background, the effect and the name's words. Nothing else: no progress, no instrument, nothing
   personal. It's how a student shows their avatar on their Band Ninja Progress page (the portal draws it with
   avatar-card/index.html?code=…) and how they bring it to a new device (Create Your Player: LOAD AVATAR CODE).

   FORMAT: "BA" + version digit + "-" + URL-safe characters [A-Za-z0-9_-] (the portal checks /^BA[0-9]-[A-Za-z0-9_-]{8,120}$/;
   today's codes are about 43 characters in all). The characters are 6 bits each: first a 12-bit check (so a typo is
   "not found", never a wrong avatar), then each field of TABLE in order as an index into its list (0 = the slot's
   default, 1 = the list's first id…), in that field's number of bits.

   TABLE IS THE FORMAT (like QUEST_V3 in backup.js): never reorder, rename or remove anything in it; only APPEND:
     - a new part id → the END of its field's list (each field has room for about 4 times as many as it has now)
     - a new field → the END of TABLE (older arcades read the fields they know and ignore the rest)
   A value an arcade doesn't know (a newer item, or one taken out of avatar-parts.js) decodes to that slot's default.
   A part missing from TABLE is shared as the default until it's added: ?demo prints any missing ids in the console
   (avatarCode.check()). A new version digit is only needed if a list outgrows its bits.

   Arcade.avatarCode: encode(av) → "BA1-…", decode(code) → avatar | null, valid(code), forDevice(av) → {av, locked}
   (Create Your Player's LOAD: anything this device hasn't unlocked falls back to the default), check(). */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const VERSION = 1, CHECK_BITS = 12;
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  /* [field ('name.title' = a word of the name), bits, values (append-only!)] */
  // the name words come from avatar-names.js, whose lists are numbered and append-only (the same numbers the
  // leaderboard uses; a retired '#Word' keeps its place): old codes decode to the same words
  const NAMED = k => ((window.AVATAR_NAMES || {})[k] || []).map(w => String(w).replace(/^#/, ''));
  const TABLE = [
    ["skin", 6, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]],
    ["face", 5, ["round", "oval", "square", "heart"]],
    ["eyes", 6, ["dot", "bright", "tall", "lashes", "wide", "calm", "confident", "focused", "glance", "cheerful", "stars", "hearts", "wink"]],
    ["eyeColor", 5, ["darkbrown", "brown", "hazel", "green", "blue", "gray", "amber"]],
    ["brows", 5, ["soft", "thick", "arched", "angled", "raised"]],
    ["mouth", 6, ["smile", "grin", "laugh", "determined", "surprised", "cool", "smirk", "beam", "tongue", "whistle"]],
    ["freckles", 5, [false, true, "cheeks", "nose", "dusting"]],
    ["paint", 5, ["none", "stripes", "bolt", "star"]],
    ["paintColor", 6, ["black", "red", "blue", "yellow", "pink", "white", "teal", "purple", "orange", "green"]],
    ["hair", 7, ["short", "buzz", "bald", "long", "bob", "curly", "afro", "braids", "locs", "buns", "topbun", "ponytail", "spiky", "puffs", "highpuff", "cornrows", "fade", "bantu", "pixie", "sidepart", "bangs", "twists", "coils", "wavy", "boxbraids", "mohawk"]],
    ["hairColor", 7, ["black", "darkbrown", "brown", "auburn", "copper", "blonde", "platinum", "gray", "white", "pink", "purple", "blue", "teal", "green", "orange", "cherry", "magenta", "lavender", "sky", "mint", "sunny", "gold", "neon", "galaxy", "flametip"]],
    ["head", 7, ["none", "hijab", "headwrap", "turban", "beanie", "cap", "shako", "headphones", "patka", "kufi", "tichel", "durag", "tophat", "wizard", "plumeshako", "royalcrown", "diamondband", "pirate", "astronaut", "glowphones", "belt-white", "belt-yellow", "belt-orange", "belt-green", "belt-blue", "belt-purple", "belt-red", "belt-brown", "belt-black", "belt-diamond", "pumpkin", "witchhat", "earmuffs", "heartglasses", "miosmplume", "flowercrown", "sunnies"]],
    ["headColor", 7, ["red", "orange", "yellow", "green", "teal", "blue", "navy", "purple", "pink", "maroon", "forest", "black", "gray", "white", "denim", "khaki", "tan", "lavender", "mint", "coral", "mustard", "cream", "brown", "sky", "olive"]],
    ["top", 7, ["tee", "hoodie", "marching", "concert", "polo", "jersey", "vest", "flannel", "rockstar", "tuxedo", "champion", "sequin", "uniform", "stagejacket", "gi", "blackgi", "racing", "spacesuit", "ghosthunter", "bngi", "scarf", "miosmsash"]],
    ["topColor", 7, ["red", "orange", "yellow", "green", "teal", "blue", "navy", "purple", "pink", "maroon", "forest", "black", "gray", "white", "denim", "khaki", "tan", "lavender", "mint", "coral", "mustard", "cream", "brown", "sky", "olive"]],
    ["bottom", 5, ["jeans", "joggers", "shorts", "skirt", "cargo"]],
    ["bottomColor", 6, ["denim", "black", "khaki", "gray", "navy", "maroon", "forest", "tan", "purple", "red", "brown", "olive", "cream", "pink", "sky"]],
    ["shoes", 5, ["sneakers", "hightops", "boots", "sandals", "lightup", "iceskates"]],
    ["shoeColor", 6, ["white", "black", "red", "blue", "pink", "green", "yellow", "purple", "tan", "brown", "teal", "orange"]],
    ["glasses", 5, ["none", "round", "square", "bold", "rect", "cateye", "aviator"]],
    ["glassesColor", 6, ["black", "maroon", "tan", "red", "blue", "purple", "pink", "teal", "yellow"]],
    ["aids", 5, ["none", "right", "left", "both"]],
    ["aidColor", 6, ["aid", "black", "blue", "pink", "purple", "teal", "red", "yellow"]],
    ["chair", 4, [false, true]],
    ["chairColor", 6, ["gray", "black", "red", "blue", "purple", "pink", "teal", "green", "yellow"]],
    ["pet", 6, ["none", "ghost", "animatronic", "note", "star", "metronome", "cat", "penguin", "narwhal", "robot", "dragon", "owl", "boo", "snowman", "butterfly"]],
    ["back", 5, ["none", "pixelcape", "jetpack", "wings", "featherwings", "batwings"]],
    ["bg", 8, ["none", "midnight", "berry", "ocean", "grape", "ember", "sunset", "lagoon", "lime", "stripes", "dots", "staff", "checker", "starry", "thunderstorm", "hauntedhall", "bamboomoon", "inkbloom", "laservault", "lanterntemple", "comboarena", "airrink", "spotlight", "nighttrack", "deepspace", "dojonight", "pixelcastle", "neoncity", "synthwave", "aurora", "galaxyswirl", "goldrecords", "bubbles", "fireflies", "lavalamp", "confetti", "bndojo", "neonhighway", "cityskyline", "hauntedhallway", "twinklelights", "concerthall", "sunsetbeach"]],
    ["hand", 5, ["none", "baton", "drumsticks", "glowstick", "mic", "wand", "trophy", "citykey", "rose", "goldbaton", "beachball"]],
    ["effect", 6, ["none", "notes", "orbit", "aura", "sparkles", "sparks", "bubbles", "snow", "confetti", "bndiamond", "spookyglow", "snowfall", "hearts", "blossoms"]],
    ["effectColor", 5, ["cyan", "pink", "yellow", "purple", "green", "amber"]],
    ["plate", 7, ["none", "simple", "notes", "gold", "neon", "flames", "belt-white", "belt-yellow", "belt-orange", "belt-green", "belt-blue", "belt-purple", "belt-red", "belt-brown", "belt-black", "belt-diamond", "bn-white", "bn-yellow", "bn-orange", "bn-green", "bn-blue", "bn-purple", "bn-red", "bn-brown", "bn-black", "bn-diamond", "hearts", "blossom", "sunset"]],
    ["belt", 6, ["none", "white", "yellow", "orange", "green", "blue", "purple", "red", "brown", "black", "diamond"]],
    ["name.title", 8, NAMED('titles')],
    ["name.adj", 8, NAMED('adjectives')],
    ["name.noun", 9, NAMED('nouns')],
  ];
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
  const checkOf = bits => fnv('BA|' + bits) & ((1 << CHECK_BITS) - 1);
  const pad = (n, w) => n.toString(2).padStart(w, '0');
  const get = (av, k) => k.split('.').reduce((o, p) => (o == null ? undefined : o[p]), av);
  const warned = {};

  /** an avatar → its code */
  function encode(av) {
    if (A.Avatar) av = A.Avatar.normalize(av);
    let bits = '';
    TABLE.forEach(([k, w, list]) => {
      const v = get(av, k), i = list.indexOf(v);
      if (i < 0 && v !== undefined && A.DEMO && !warned[k + v]) { warned[k + v] = 1; console.warn(`avatar code: "${v}" (${k}) is not in avatar-code.js TABLE yet: add it to the END of that list`); }
      bits += pad(i < 0 ? 0 : Math.min(i + 1, (1 << w) - 1), w);
    });
    while (bits.length % 6) bits += '0';
    bits = pad(checkOf(bits), CHECK_BITS) + bits;
    let out = '';
    for (let i = 0; i < bits.length; i += 6) out += ALPHA[parseInt(bits.slice(i, i + 6), 2)];
    return 'BA' + VERSION + '-' + out;
  }
  /** is this text an avatar code (the right shape and check)? */
  const valid = code => !!raw(code);
  function raw(code) {
    const m = /^BA([0-9])-([A-Za-z0-9_-]{8,120})$/.exec(String(code || '').trim());
    if (!m || +m[1] < 1) return null;
    let bits = '';
    for (const ch of m[2]) bits += pad(ALPHA.indexOf(ch), 6);
    const body = bits.slice(CHECK_BITS);
    return parseInt(bits.slice(0, CHECK_BITS), 2) === checkOf(body) ? body : null;
  }
  /** a code → the avatar it holds (anything unknown = that slot's default), or null when it isn't a code */
  function decode(code) {
    const bits = raw(code);
    if (bits === null) return null;
    const av = {name: {}};
    let at = 0;
    for (const [k, w, list] of TABLE) {
      if (at + w > bits.length) break;                    // an older, shorter code: the rest stay default
      const i = parseInt(bits.slice(at, at + w), 2); at += w;
      if (i < 1 || i > list.length) continue;             // default, or a value from a newer arcade
      const parts = k.split('.');
      if (parts.length === 2) av[parts[0]][parts[1]] = list[i - 1]; else av[k] = list[i - 1];
    }
    return A.Avatar ? A.Avatar.normalize(av) : av;
  }
  /** LOAD AVATAR CODE on a device: what it may wear here. Locked items fall back to a free choice;
      locked = the names of the ones that did */
  function forDevice(av) {
    const AV = A.Avatar, out = AV.normalize(av), locked = [];
    AV.LOCKABLE.forEach(f => {
      if (AV.isUnlocked(f, out[f])) return;
      const part = (AV.items().find(it => it.field === f && it.id === out[f]) || {});
      locked.push(part.name || out[f]);
      out[f] = AV.FIELDS[f]().find(id => AV.isUnlocked(f, id));
    });
    return {av: AV.normalize(out), locked};
  }
  /** ?demo: every part and word the arcade has should be in TABLE (else it's shared as the default) */
  function check() {
    const AV = A.Avatar; if (!AV) return [];
    const live = Object.keys(AV.FIELDS).map(k => [k, AV.FIELDS[k]()]).concat([['name.title', AV.words('title')], ['name.adj', AV.words('adj')], ['name.noun', AV.words('noun')]]);
    const missing = [];
    live.forEach(([k, list]) => { const row = TABLE.find(r => r[0] === k); list.forEach(v => { if (!row || !row[2].includes(v)) missing.push(k + ':' + v); }); });
    TABLE.forEach(([k, w, list]) => { if (list.length >= (1 << w) - 1) missing.push(k + ': list is full (needs a new version)'); });
    if (missing.length) console.warn('avatar-code.js TABLE is missing:', missing.join(', '));
    return missing;
  }
  /* ---------- the panels (Create Your Player and the avatar badge's menu) ---------- */
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  function panel(html, label, onClose) {
    const back = document.activeElement;
    const ov = document.createElement('div');
    ov.className = 'overlay acode-ov';
    ov.innerHTML = `<div class="panel acode" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
    document.body.appendChild(ov);
    const close = () => { ov.remove(); document.removeEventListener('keydown', key, true); if (back && back.focus) back.focus({preventScroll: true}); if (onClose) onClose(); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    document.addEventListener('keydown', key, true);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
    return {ov, close};
  }
  /** SHARE TO BAND NINJA: the avatar's code, read-only, with COPY */
  function share(av, {onClose} = {}) {
    const code = encode(av || (A.Avatar && A.Avatar.get()));
    const {ov} = panel(`<h2>Share to Band Ninja</h2>` +
      `<label class="acode-lbl" for="acodeOut">Your avatar code</label>` +
      `<input id="acodeOut" class="acode-in" type="text" readonly value="${esc(code)}" spellcheck="false" autocomplete="off">` +
      `<p class="acode-say">Paste this in your Band Ninja Progress page.</p><p class="acode-msg" role="status"></p>` +
      `<div class="acts"><button type="button" class="btn btn-gold acode-copy">Copy</button><button type="button" class="btn btn-ghost" data-close>Done</button></div>`, 'Share to Band Ninja', onClose);
    const inp = ov.querySelector('#acodeOut'), msg = ov.querySelector('.acode-msg');
    const selectAll = () => { inp.focus(); inp.select(); try { inp.setSelectionRange(0, code.length); } catch (e) { /* */ } };
    inp.addEventListener('focus', selectAll);
    ov.querySelector('.acode-copy').addEventListener('click', () => {
      const ok = () => { msg.textContent = 'Copied!'; if (A.Sfx) A.Sfx.event('ui-toggle'); };
      const fallback = () => { selectAll(); let done = false; try { done = document.execCommand('copy'); } catch (e) { /* */ } msg.textContent = done ? 'Copied!' : 'Press and hold (or Ctrl+C) to copy the code.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, fallback); else fallback();
    });
    setTimeout(() => ov.querySelector('.acode-copy').focus(), 0);
    return code;
  }
  /** LOAD AVATAR CODE: paste a code; onLoad(av, locked) gets what this device may wear */
  function load({onLoad, onClose} = {}) {
    const {ov, close} = panel(`<h2>Load avatar code</h2>` +
      `<label class="acode-lbl" for="acodeIn">Paste an avatar code (it starts with BA1-)</label>` +
      `<input id="acodeIn" class="acode-in" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" placeholder="BA1-…">` +
      `<p class="acode-msg" role="alert"></p>` +
      `<div class="acts"><button type="button" class="btn btn-gold acode-load">Load</button><button type="button" class="btn btn-ghost" data-close>Cancel</button></div>`, 'Load avatar code', onClose);
    const inp = ov.querySelector('#acodeIn'), msg = ov.querySelector('.acode-msg');
    const go = () => {
      const av = decode(inp.value.replace(/\s+/g, ''));
      if (!av) { msg.textContent = "That code didn't work. Check that you copied all of it."; if (A.Sfx) A.Sfx.event('note-wrong'); return; }
      const r = forDevice(av);
      close();
      if (onLoad) onLoad(r.av, r.locked);
    };
    ov.querySelector('.acode-load').addEventListener('click', go);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    setTimeout(() => inp.focus(), 0);
  }

  A.avatarCode = {VERSION, TABLE, encode, decode, valid, forDevice, check, share, load};
  if (A.DEMO) setTimeout(check, 0);
})(window.Arcade);
