/* Band Arcade: UNLOCKABLE SKINS for the instrument portraits (shared/portraits.js draws them).
   A student wears ONE color skin plus (optionally) ONE accessory, saved per instrument on this device
   (Arcade.store.skin / setSkin). Skins are earned by playing; nothing here is copied from real games or brands.

   HOW TO ADD A SKIN: add a line to SKINS below.
     id       never change it once students have it (it is saved on their device)
     kind     'color' (a look for the whole portrait) or 'acc' (an accessory drawn on top; combines with any color)
     name     what students see, and what screen readers say ("Trumpet, Flame skin, Crown")
     unlock   how it is earned (see UNLOCK RULES)
     look     color skins only:
                colors    two theme tokens (without --): the rim light / glow, and the SVG-portrait recolor
                backdrop  'horizon' (synthwave sun + stripes) | 'galaxy' (stars + nebula)        drawn in CSS
                aura      'flame' (fire around the instrument)                                  drawn in SVG below
                fx        'sparkle' | 'sweep' (a band of light) | 'shimmer' (prismatic)         over the art
                pixel     true: the art is redrawn pixelated with a chunky 8-bit frame
                ghost     true: see-through, with a ghost-trail glow
              Animation (auras, sparkles, sweeps, floating) plays ONLY on the big Select Player portraits and
              never under prefers-reduced-motion; tiles, chips and in-game portraits get the still version.
     art      accessories only: which ANCHOR it sits on ('head' | 'face' | 'back') and its drawing (ACC_ART)
   UNLOCK RULES (the `unlock` field):
     {always: true}                       everyone has it
     {stars: 50}                          50 ★ on THIS instrument, all games and all modes (Arcade.store.allStars)
     {game, level, stars, text}           achievement: any instrument has `stars` on that level of that game, in
                                          any NOTES × ORDER mode. Unlocks for EVERY instrument on the device.
     {game, badge: true, text}            achievement: any Ancient Ninja Scrolls TEST READY badge
   A rule for a game that isn't in shared/games.js is skipped (the skin stays locked, with its text shown).
   DRAWN VARIANTS: shared/portraits/<file>--<skin id>.png (and <file>-full--<skin id>.png) replace the effect
   version for that instrument (see shared/portraits/README.md).
   ?demo&unlockall previews every skin without earning it (nothing is saved as unlocked). */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";

  const SKINS = [
    // ---- color skins --------------------------------------------------------------------------------------
    {id: 'classic', kind: 'color', name: 'Classic Neon', unlock: {always: true},  look: {}},
    {id: 'sunset',  kind: 'color', name: 'Sunset Wave',  unlock: {stars: 10},     look: {colors: ['pink', 'amber'], backdrop: 'horizon'}},
    {id: 'ice',     kind: 'color', name: 'Ice Crystal',  unlock: {stars: 50},     look: {colors: ['cyan', 'white'], fx: 'sparkle'}},
    {id: 'flame',   kind: 'color', name: 'Flame',        unlock: {stars: 150},    look: {colors: ['amber', 'red'], aura: 'flame'}},
    {id: 'galaxy',  kind: 'color', name: 'Galaxy',       unlock: {stars: 200},    look: {colors: ['purple', 'pink'], backdrop: 'galaxy'}},
    {id: 'pixel',   kind: 'color', name: 'Pixel',        unlock: {stars: 300},    look: {colors: ['green', 'cyan'], pixel: true}},
    {id: 'gold',    kind: 'color', name: 'Chrome Gold',  unlock: {game: 'chime-heist', level: 8, stars: 1, text: 'Clear The Golden Vault in Chime Heist'},
                                                                                  look: {colors: ['yellow', 'amber'], fx: 'sweep'}},
    {id: 'diamond', kind: 'color', name: 'Diamond',      unlock: {game: 'note-ninja', level: 10, stars: 1, text: 'Earn the Diamond belt in Note Ninja'},
                                                                                  look: {colors: ['cyan', 'pink'], fx: 'shimmer'}},
    {id: 'ghostly', kind: 'color', name: 'Ghostly',      unlock: {game: 'ghost-notes', level: 8, stars: 3, text: 'Get 3 ★ on Ghost Run in Ghost Notes'},
                                                                                  look: {colors: ['cyan', 'purple'], ghost: true}},
    // ---- accessories (combine with any color skin) ---------------------------------------------------------
    {id: 'headband', kind: 'acc', name: 'Headband',   unlock: {stars: 25},  art: 'face'},
    {id: 'shades',   kind: 'acc', name: 'Shades',     unlock: {stars: 100}, art: 'face'},
    {id: 'visor',    kind: 'acc', name: 'Visor',      unlock: {stars: 500}, art: 'face'},
    {id: 'crown',    kind: 'acc', name: 'Crown',      unlock: {game: 'button-masher', level: 8, stars: 1, text: 'Defeat The Conductor in Button Masher'}, art: 'head'},
    {id: 'cape',     kind: 'acc', name: 'Cape',       unlock: {game: 'neon-face-off', level: 8, stars: 1, text: 'Beat The Champ in Neon Face-Off (1 player vs CPU)'}, art: 'back'},
    {id: 'mask',     kind: 'acc', name: 'Ninja Mask', unlock: {game: 'ancient-ninja-scrolls', badge: true, text: 'Earn a TEST READY badge in Ancient Ninja Scrolls'}, art: 'face'},
  ];

  /* ACCESSORY ANCHORS: where each accessory sits on each instrument's portrait, in PERCENT of the square
     portrait (0 = left/top edge, 100 = right/bottom edge), the same square you see on a Select Player tile.
       head: [x, y, width]         the top of the instrument: the Crown's bottom edge sits here
       face: [x, y, width, tilt]   the instrument's "face": Shades, Visor and Ninja Mask are centered here, the
                                   Headband just above; tilt in degrees (+ = clockwise), to follow a slanted tube.
       back: [x, y, width]         (optional) the top middle of the Cape, which hangs BEHIND the instrument;
                                   without it the Cape hangs from just above the face.
     img = Mat's picture (shared/portraits/<file>.png); svg = the drawn fallback portrait; full (optional) = the
     <file>-full picture in the big preview (without it, the img numbers are used there too).
     If an accessory sits wrong, nudge these numbers (see shared/portraits/README.md). */
  const ANCHORS = {
    flute:      {img: {head: [86, 7, 20],  face: [70, 31, 26, 38]},  svg: {head: [87, 28, 17], face: [68, 41, 24, -26]}},
    oboe:       {img: {head: [77, 6, 15],  face: [63, 30, 22, 32]},  svg: {head: [64, 7, 14],  face: [56, 31, 21, 18]}},
    clarinet:   {img: {head: [66, 5, 15],  face: [60, 28, 22, 16]},  svg: {head: [37, 7, 14],  face: [44, 31, 21, -18]}},
    basscl:     {img: {head: [55, 5, 20],  face: [47, 30, 22, 4]},   svg: {head: [55, 6, 17],  face: [46, 32, 20, 0]}},
    bassoon:    {img: {head: [35, 5, 14],  face: [44, 26, 21, 22]},  svg: {head: [42, 5, 14],  face: [42, 30, 20, 0]}},
    altosax:    {img: {head: [69, 7, 20],  face: [58, 32, 24, 35]},  svg: {head: [50, 8, 17],  face: [40, 34, 21, 0]}},
    tenorsax:   {img: {head: [69, 7, 20],  face: [58, 32, 24, 35]},  svg: {head: [52, 8, 17],  face: [40, 34, 21, 0]}},
    barisax:    {img: {head: [52, 7, 17],  face: [66, 32, 24, 40]},  svg: {head: [31, 12, 20], face: [44, 48, 21, 0]}},
    trumpet:    {img: {head: [42, 36, 22], face: [88, 45, 20, -8], back: [46, 40, 40]},  svg: {head: [48, 34, 22], face: [76, 45, 21, 0]}},
    horn:       {img: {head: [78, 19, 25], face: [80, 48, 27, 0], back: [52, 34, 46]},   svg: {head: [47, 20, 25], face: [46, 52, 24, 0]}},
    trombone:   {img: {head: [58, 21, 17], face: [58, 34, 18, 0], back: [44, 34, 34]},   svg: {head: [30, 9, 17],  face: [36, 26, 18, 0]}},
    baritonetc: {img: {head: [60, 6, 31],  face: [40, 42, 27, 0]},   svg: {head: [71, 16, 25], face: [38, 56, 18, 0]}},
    euphbc:     {img: {head: [60, 6, 31],  face: [40, 42, 27, 0]},   svg: {head: [72, 10, 31], face: [36, 56, 18, 0]}},
    tuba:       {img: {head: [88, 25, 20], face: [26, 57, 27, 0], back: [42, 42, 46]},   svg: {head: [71, 4, 34],  face: [34, 60, 21, 0]}},
    bells:      {img: {head: [50, 23, 25], face: [50, 42, 33, 0], back: [50, 30, 44]},   svg: {head: [50, 30, 28], face: [50, 52, 30, 0]}},
  };

  /* the accessory drawings, each on a 100 × 100 grid centered on its anchor (the Crown: 100 × 64, bottom edge on
     the anchor; the Cape: 100 × 130, hanging from its top). Colors are theme tokens. */
  const ACC_ART = {
    headband: {vb: '0 0 100 100', svg:
      '<path d="M2 17Q50 8 98 17V30Q50 21 2 30Z" fill="var(--red)" stroke="var(--red-hi)" stroke-width="2.5"/>' +
      '<path d="M8 23Q50 15 92 23" stroke="var(--white-hi)" stroke-width="1.4" opacity=".6" fill="none"/>' +
      '<circle cx="97" cy="23" r="5" fill="var(--red)" stroke="var(--red-hi)" stroke-width="2"/>' +
      '<path d="M100 23Q112 26 118 38M100 25Q108 34 108 46" stroke="var(--red)" stroke-width="6" stroke-linecap="round" fill="none"/>'},
    shades: {vb: '0 0 100 100', svg:
      '<path d="M6 40H45Q45 62 27 62Q8 62 6 40ZM55 40H94Q92 62 73 62Q55 62 55 40Z" fill="var(--deep)" stroke="var(--cyan)" stroke-width="3.2"/>' +
      '<path d="M45 43Q50 38 55 43" stroke="var(--cyan)" stroke-width="3" fill="none"/>' +
      '<path d="M6 41L-2 38M94 41L102 38" stroke="var(--cyan)" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M13 45L24 45M62 45L73 45" stroke="var(--white-hi)" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>'},
    visor: {vb: '0 0 100 100', svg:
      '<path d="M3 45Q50 29 97 45L92 61Q50 50 8 61Z" fill="var(--cyan)" fill-opacity=".38" stroke="var(--cyan-hi)" stroke-width="2.6"/>' +
      '<path d="M12 45Q50 34 88 45" stroke="var(--white-hi)" stroke-width="2" fill="none" opacity=".8"/>' +
      '<path d="M3 45L-3 50M97 45L103 50" stroke="var(--cyan-hi)" stroke-width="3" stroke-linecap="round"/>'},
    mask: {vb: '0 0 100 100', svg:
      '<path d="M2 35Q50 27 98 35V64Q50 72 2 64Z" fill="var(--deep)" stroke="var(--purple)" stroke-width="2.6"/>' +
      '<path d="M20 49Q31 40 42 49Q31 55 20 49ZM58 49Q69 40 80 49Q69 55 58 49Z" fill="var(--white-hi)"/>' +
      '<circle cx="32" cy="48.5" r="2.6" fill="var(--ink)"/><circle cx="68" cy="48.5" r="2.6" fill="var(--ink)"/>' +
      '<path d="M98 42Q110 44 116 56M98 50Q106 58 104 70" stroke="var(--deep)" stroke-width="6" stroke-linecap="round" fill="none"/>' +
      '<path d="M98 42Q110 44 116 56M98 50Q106 58 104 70" stroke="var(--purple)" stroke-width="1.6" stroke-linecap="round" fill="none"/>'},
    crown: {vb: '0 0 100 64', svg:
      '<path d="M8 60L3 16L28 36L50 5L72 36L97 16L92 60Z" fill="var(--yellow)" stroke="var(--amber)" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M10 50H90" stroke="var(--amber)" stroke-width="3"/>' +
      '<circle cx="3" cy="15" r="4" fill="var(--yellow)"/><circle cx="50" cy="5" r="4.5" fill="var(--yellow)"/><circle cx="97" cy="15" r="4" fill="var(--yellow)"/>' +
      '<circle cx="30" cy="55" r="3.4" fill="var(--pink)"/><circle cx="50" cy="55" r="3.8" fill="var(--cyan)"/><circle cx="70" cy="55" r="3.4" fill="var(--pink)"/>'},
    cape: {vb: '0 0 100 130', svg:
      '<path d="M30 4Q50 13 70 4L97 116Q74 102 50 124Q26 102 3 116Z" fill="var(--red)" fill-opacity=".9" stroke="var(--pink-hi)" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<path d="M36 14Q50 20 64 14L84 106Q68 96 50 112Q32 96 16 106Z" fill="var(--purple)" fill-opacity=".55"/>' +
      '<circle cx="50" cy="10" r="5" fill="var(--yellow)" stroke="var(--amber)" stroke-width="2"/>'},
  };

  /* the drawn parts of the effects (everything else is CSS in theme.css, section "Skins") */
  const star4 = (x, y, s, cls = '') => `<path class="${cls}" transform="translate(${x} ${y}) scale(${s})" d="M0 -6L1.4 -1.4L6 0L1.4 1.4L0 6L-1.4 1.4L-6 0L-1.4 -1.4Z"/>`;
  const flame = (x, b, w, h, i) => `<g class="sk-tongue" style="--i:${i}">` +
    `<path d="M${x} ${b}C${x - w} ${b} ${x - w * .9} ${b - h * .5} ${x} ${b - h}C${x + w * .9} ${b - h * .5} ${x + w} ${b} ${x}${' '}${b}Z" fill="var(--red)" opacity=".6"/>` +
    `<path d="M${x} ${b}C${x - w * .6} ${b} ${x - w * .5} ${b - h * .38} ${x} ${b - h * .72}C${x + w * .5} ${b - h * .38} ${x + w * .6} ${b} ${x} ${b}Z" fill="var(--amber)"/>` +
    `<path d="M${x} ${b}C${x - w * .3} ${b} ${x - w * .25} ${b - h * .2} ${x} ${b - h * .4}C${x + w * .25} ${b - h * .2} ${x + w * .3} ${b} ${x} ${b}Z" fill="var(--yellow)"/></g>`;
  const FLAMES = [[8, 100, 9, 34], [22, 100, 11, 48], [37, 100, 11, 58], [50, 100, 12, 66], [63, 100, 11, 56], [78, 100, 11, 50], [92, 100, 9, 36],
    [5, 74, 6, 26], [95, 76, 6, 28]];
  const AURA = {
    flame: `<svg class="sk-aura" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${FLAMES.map((f, i) => flame(...f, i)).join('')}</svg>`,
  };
  const SPARKS = [[18, 22, .9], [82, 18, .7], [88, 62, 1], [12, 70, .75], [50, 8, .6], [64, 88, .8], [30, 46, .5]];
  const FX = {
    sparkle: `<svg class="sk-sparks" viewBox="0 0 100 100" aria-hidden="true">${SPARKS.map(([x, y, s], i) => `<g style="--i:${i}">${star4(x, y, s, 'sk-spark')}</g>`).join('')}</svg>`,
    sweep: '', shimmer: '',
  };

  const byId = {}; SKINS.forEach(s => { byId[s.id] = s; });
  const get = id => byId[id] || null;
  const UNLOCK_ALL = !!(A.DEMO && A.params && A.params.has('unlockall'));
  const hasGame = id => !A.GAMES || A.GAMES.some(g => g.id === id);
  const st = () => A.store;
  const milestone = s => !!(s && s.unlock && s.unlock.stars && !s.unlock.game);     // a per-instrument star goal

  /** is this skin unlocked for this instrument member? */
  function isUnlocked(skin, member) {
    const s = typeof skin === 'string' ? get(skin) : skin, u = s && s.unlock;
    if (!u) return false;
    if (u.always || UNLOCK_ALL) return true;
    if (milestone(s)) return !!member && st().allStars(member) >= u.stars;
    if (!u.game || !hasGame(u.game)) return false;
    if (u.badge) return Object.keys((st().gameData(u.game) || {}).badges || {}).length > 0;
    if (u.level) return st().bestLevelStars(u.game, u.level) >= (u.stars || 1);
    return false;
  }
  /** what a locked skin asks for, in student words */
  function requirement(skin) {
    const u = skin.unlock || {};
    if (u.always) return 'Always yours';
    if (milestone(skin)) return `Earn ${u.stars} ★ to unlock`;
    return u.text || 'Keep playing to unlock';
  }
  /** "37 of 50 ★" for star skins on this member, else '' */
  function progress(skin, member) {
    const u = skin.unlock || {};
    return milestone(skin) && member ? `${Math.min(st().allStars(member), u.stars)} of ${u.stars} ★ on this instrument` : '';
  }
  const seenKey = (skin, member) => milestone(skin) ? member : '*';

  const Skins = A.Skins = {
    LIST: SKINS, ANCHORS, ACC_ART, UNLOCK_ALL, get, isUnlocked, requirement, progress, milestone,
    colors: () => SKINS.filter(s => s.kind === 'color'),
    accessories: () => SKINS.filter(s => s.kind === 'acc'),
    /** the equipped {color, acc} for a member (a locked choice falls back to Classic Neon / none) */
    equipped(member) {
      if (!member || !ANCHORS[member]) return {color: 'classic', acc: null};
      const e = st().skin(member);
      return {color: get(e.color) && isUnlocked(e.color, member) ? e.color : 'classic',
              acc: e.acc && get(e.acc) && isUnlocked(e.acc, member) ? e.acc : null};
    },
    /** equip a color skin or accessory ({color: id} | {acc: id | null}) on this member */
    equip(member, patch, {sound = true} = {}) {
      st().setSkin(member, patch);
      if (sound) sfx('skin-equip');
    },
    /** the words screen readers hear after the instrument name: 'Flame skin, Crown' ('' for plain Classic Neon) */
    label(eq) {
      const parts = [];
      if (eq && eq.color && eq.color !== 'classic' && get(eq.color)) parts.push(get(eq.color).name + ' skin');
      if (eq && eq.acc && get(eq.acc)) parts.push(get(eq.acc).name);
      return parts.join(', ');
    },
    /** skins this member has unlocked but whose UNLOCKED! card hasn't been shown (never counts ?unlockall) */
    fresh(member) {
      if (UNLOCK_ALL) return [];
      const seenM = member ? st().skinsSeen(member) : {}, seenAll = st().skinsSeen('*');
      return SKINS.filter(s => !s.unlock.always && !(milestone(s) && !member) && isUnlocked(s, member) &&
        !(seenKey(s, member) === '*' ? seenAll : seenM)[s.id]);
    },
    markSeen(member, list) {
      const mine = list.filter(s => seenKey(s, member) !== '*').map(s => s.id), all = list.filter(s => seenKey(s, member) === '*').map(s => s.id);
      if (mine.length && member) st().markSkinsSeen(member, mine);
      if (all.length) st().markSkinsSeen('*', all);
    },

    /** everything portraits.js needs to draw a skinned portrait of `id` at `size` */
    decorate(id, eq, size) {
      const c = get(eq && eq.color) || get('classic'), a = eq && eq.acc ? get(eq.acc) : null, look = c.look || {};
      const cls = ['sk-c-' + c.id], parts = {before: '', after: '', cape: ''};
      const [c1, c2] = look.colors || [];
      if (c1) cls.push('sk-rim');
      if (look.backdrop) cls.push('sk-bg-' + look.backdrop);
      if (look.aura) cls.push('sk-aura-' + look.aura);
      if (look.fx) cls.push('sk-fx-' + look.fx);
      if (look.pixel) cls.push('sk-pixel');
      if (look.ghost) cls.push('sk-ghost');
      if (look.backdrop || look.aura || look.pixel) parts.before = `<span class="sk-back" aria-hidden="true">${look.aura ? AURA[look.aura] || '' : ''}</span>`;
      if (look.fx) parts.after = `<span class="sk-fx" aria-hidden="true">${FX[look.fx] || ''}</span>`;
      if (a && ACC_ART[a.id] && ANCHORS[id]) {
        cls.push('has-acc', 'acc-' + a.id);
        const html = accHTML(id, a);
        if (a.art === 'back') parts.cape = html; else parts.after += html;
      }
      const style = c1 ? `--sk1:var(--${c1});--sk2:var(--${c2 || c1})` : '';
      return {cls: cls.join(' '), style, parts, svgColor: c1 ? `var(--${c1 === 'white' ? 'white-hi' : c1})` : undefined,
              svgGlow: c2 ? `var(--${c2 === 'white' ? 'white-hi' : c2})` : undefined, variants: {c: c.id === 'classic' ? null : c.id, a: a ? a.id : null}};
    },
    /** the accessory by itself, e.g. for the locker's accessory buttons */
    accSVG(accId, cls = '') { const art = ACC_ART[accId]; return art ? `<svg class="sk-acc-solo ${cls}" viewBox="${art.vb}" aria-hidden="true" overflow="visible">${art.svg}</svg>` : ''; },

    /** the UNLOCKED! card for newly earned skins, shown with `member`'s portrait (null: the skin by itself) */
    cardHTML(list, member) {
      const eq = member ? Skins.equipped(member) : {color: 'classic', acc: null};
      const pic = s => member && A.portraitHTML
        ? A.portraitHTML(member, {size: 'tile', skin: s.kind === 'acc' ? {color: eq.color, acc: s.id} : {color: s.id, acc: eq.acc}})
        : s.kind === 'acc' ? Skins.accSVG(s.id) : `<span class="sk-swatch" style="--sk1:var(--${((s.look || {}).colors || ['cyan'])[0]})"></span>`;
      const m = member && A.memberById ? A.memberById(member) : null;
      return `<div class="sk-unlock" role="status"><p class="sk-u-title">UNLOCKED!</p><div class="sk-u-list">` + list.map(s =>
        `<div class="sk-u-item"><span class="sk-u-pic">${pic(s)}</span><b class="sk-u-name">${s.name}</b>` +
        `<small>${s.kind === 'acc' ? 'Accessory' : 'Skin'}${milestone(s) ? (m ? ` for ${m.short}` : '') : ' for every instrument'} · ${milestone(s) ? `${s.unlock.stars} ★` : s.unlock.text}</small>` +
        (member ? `<button type="button" class="btn btn-gold btn-small sk-u-equip" data-skin="${s.id}">Equip now</button>` : '') + `</div>`).join('') + `</div></div>`;
    },
    /** check the unlock rules now (results screens): if anything new is unlocked, put the UNLOCKED! card into
        `host` (a results panel: after the stars and the result, above its buttons) and remember it was shown. members: whose star milestones to check (default the
        saved player). Returns the new skins. */
    announce(host, {members, member} = {}) {
      if (!host) return [];
      host.querySelectorAll('.sk-unlock').forEach(el => el.remove());
      const list = (members || [st().player]).filter((m, i, a) => a.indexOf(m) === i);
      let found = [], shownFor = member || list.find(Boolean) || null;
      list.forEach(m => { found = found.concat(Skins.fresh(m).filter(s => !found.some(f => f.id === s.id))); });
      if (!found.length) return [];
      list.forEach(m => Skins.markSeen(m, found));
      const wrap = document.createElement('div'); wrap.innerHTML = Skins.cardHTML(found, shownFor);
      const card = wrap.firstChild, acts = [...host.children].find(c => c.classList.contains('acts'));
      if (acts) host.insertBefore(card, acts); else host.appendChild(card);         // after the stars and the result, above the buttons
      const ov = host.closest('.overlay'); if (ov) ov.classList.add('sk-tall');      // a taller panel scrolls
      wire(card, shownFor);
      setTimeout(() => sfx('skin-unlocked'), 650);
      return found;
    },
    /** Select Player: a card for everything unlocked since the student last looked (existing progress included) */
    catchUp(member, {onEquip} = {}) {
      const found = Skins.fresh(member);
      if (!found.length) return [];
      Skins.markSeen(member, found);
      const ov = document.createElement('div');
      ov.className = 'overlay sk-catchup';
      ov.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-label="New skins unlocked">${Skins.cardHTML(found, member)}` +
        `<p class="muted sk-u-foot">Find all your skins in the <b>SKINS</b> locker on the player card.</p>` +
        `<div class="acts"><button type="button" class="btn btn-ghost" data-close>OK</button></div></div>`;
      document.body.appendChild(ov);
      wire(ov, member, onEquip);
      const close = () => { ov.remove(); document.removeEventListener('keydown', esc); };
      const esc = e => { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', esc);
      ov.querySelector('[data-close]').addEventListener('click', close);
      ov.querySelector('.sk-u-equip, [data-close]').focus();
      setTimeout(() => sfx('skin-unlocked'), 250);
      return found;
    },
  };

  function accHTML(id, a) {
    const art = ACC_ART[a.id], an = ANCHORS[id], img = an.img, svg = an.svg || img, full = an.full || img;
    const pick = set => {
      if (a.art === 'head') return set.head.slice(0, 3).concat(0);
      const [x, y, w, r = 0] = set.face;
      if (a.art === 'back') return set.back ? set.back.slice(0, 3).concat(0) : [x, y - w * .35, w * 2.2, 0];
      return [x, y, w, r];
    };
    const v = (k, [x, y, w, r]) => `--${k}x:${x};--${k}y:${y};--${k}w:${w};--${k}r:${r}`;
    return `<svg class="sk-acc sk-acc-${a.art}" viewBox="${art.vb}" overflow="visible" aria-hidden="true" ` +
      `style="${v('s', pick(svg))};${v('i', pick(img))};${v('f', pick(full))}">${art.svg}</svg>`;
  }
  function wire(root, member, onEquip) {
    root.querySelectorAll('.sk-u-equip').forEach(b => b.addEventListener('click', () => {
      const s = get(b.dataset.skin); if (!s || !member) return;
      Skins.equip(member, s.kind === 'acc' ? {acc: s.id} : {color: s.id});
      b.textContent = 'Equipped!'; b.disabled = true;
      document.querySelectorAll('.pt-box[data-pt="' + member + '"]').forEach(refresh);
      if (onEquip) onEquip(s);
    }));
  }
  /** redraw a portrait already on the page with its instrument's current skin (keeps its size and options) */
  function refresh(box) {
    if (!A.portraitHTML || !box.dataset.opts || box.closest('.sk-u-pic, .sk-locker .sk-opt')) return;
    const o = JSON.parse(box.dataset.opts); delete o.skin;
    const w = document.createElement('span'); w.innerHTML = A.portraitHTML(box.dataset.pt, o);
    box.replaceWith(w.firstChild);
  }
  Skins.refresh = member => document.querySelectorAll(`.pt-box[data-pt="${member}"]`).forEach(refresh);
  function sfx(name) {
    if (!A.Sfx) return;
    if (A.Pitch && A.Pitch.suppress) A.Pitch.suppress(600);     // a listening game (Neon Face-Off): mute the detector
    A.Sfx.event(name);
  }
})(window.Arcade);
