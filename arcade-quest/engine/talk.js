/* ARCADE QUEST ENGINE: talking and the overworld's panels.
   Q.talk.npc(id, npc)    a conversation from data/dialogue.js (the first `talk` choice whose `if` is true; see there)
   Q.talk.thing(thing)    a sign or object from a map: `say` (data/dialogue.js QUEST_SIGNS) and/or `use`
                          ('jukebox' saves, 'booth' = Token Booth Terry, 'shop' = Rusty)
   Q.talk.sign(id)        one sign's lines
   Q.talk.hud()           the little status line (LV, HP, tokens)
   (THE PAUSE MENU is the arcade's shared one: engine/world.js mounts Arcade.UI.pause; its CHARMS opens Q.talk.charms.)
   THE TOKEN BOOTH turns stars from the other arcade games into Arcade Tokens. ONE WALLET, TWO COUNTERS: the wallet,
   the star sources, the rate, the prices and buying are shared/tokens.js (Arcade.Tokens), shared with the arcade's own
   PRIZE COUNTER (shared/prizes.js), so a star turned in at either counter is never counted again and an item bought at
   either shows OWNED at the other. The booth SELLS: avatar items (shared/avatar-parts.js items with unlock {shop:
   price}: owned forever and worn everywhere), including the MANOR COLLECTION (unlock.booth 'quest': only here, tagged
   "MANOR COLLECTION: only here!"), the SEASONAL SHOP's items during their event (first, "SEASONAL: gone in 12 days!"), the PRIZE OF THE WEEK at its discount (⭐ WEEKLY), and CHARMS (data/items.js
   QUEST_CHARMS with a price; ARCADE QUEST ONLY). Q.talk.charms() = the CHARMS panel (pause menu): 2 slots, owned
   charms to wear, and how to find the rest. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const REGINALD_NEEDS = 8;
  const T = () => A.Tokens;                                    // THE SHARED WALLET (shared/tokens.js)
  const coin = () => T().iconHTML({pixel: true});             // THE TOKEN ICON, pixel style (the season's picture: shared/tokens.css)
  const DLG = () => window.QUEST_DIALOGUE || {}, SIGNS = () => window.QUEST_SIGNS || {}, ITEMS = () => window.QUEST_ITEMS || {};
  const unpitched = () => { const i = A.currentInstrument && A.currentInstrument(); return !!(i && i.pitched === false); };

  /* ---------- the overworld's HTML ---------- */
  Q.talk = {};
  Q.talk.mount = function () {
    Q.ui.innerHTML = `<div class="q-whud" id="qWHud" aria-live="off"></div><p class="q-area" id="qArea" aria-live="polite"></p>` +
      `<p class="q-mictag" id="qMicTag" hidden><span class="q-dot"></span> The mic is listening</p>`;
  };
  Q.talk.hud = function () {
    const el = Q.$('qWHud'); if (!el) return;
    const s = Q.save.get();
    el.innerHTML = `<b>LV ${s.level}</b> <span>HP ${s.hp}/${s.maxHp}</span> <span class="q-tok">${coin()}${T().balance()}<span class="sr"> tokens</span></span>`;
  };
  let bannerT = 0;
  Q.talk.banner = function (name) {
    const el = Q.$('qArea'); if (!el) return;
    el.textContent = name; el.classList.add('on');
    clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('on'), 2200);
  };

  /* ---------- conversations ---------- */
  function cond(c) {
    if (!c) return true;
    if (c[0] === '!') return !cond(c.slice(1));
    if (c === 'snare') return unpitched();
    const m = /^helped>=(\d+)$/.exec(c);
    if (m) return Q.save.helped() >= +m[1];
    return Q.save.flag(c);
  }
  const vars = () => ({you: A.currentMember().short, hero: Q.hero(), need: Math.max(0, REGINALD_NEEDS - Q.save.helped()), n: Q.save.helped()});
  const fill = (t, v) => String(t).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
  /** say lines, switching name + portrait when a line starts with '@speaker ' */
  async function sayAs(D, lines) {
    const v = vars(), groups = [];
    lines.forEach(l => {
      const m = /^@(\w+)\s+(.*)$/.exec(l), who = m && D.speakers && D.speakers[m[1]];
      const sp = who || {name: D.name, sprite: D.sprite}, text = fill(m && who ? m[2] : l, v);
      const g = groups[groups.length - 1];
      if (g && g.sp === sp) g.lines.push(text); else groups.push({sp, lines: [text]});
    });
    for (const g of groups) await Q.say(g.lines, {name: g.sp.name, portrait: g.sp.sprite});
  }
  const cycles = {};
  Q.talk.npc = async function (id, npc) {
    const D = DLG()[id]; if (!D) return;
    let i = D.talk.findIndex(n => cond(n.if)); if (i < 0) i = D.talk.length - 1;
    let node = D.talk[i];
    for (;;) {
      let lines = node.lines;
      if (!lines && node.cycle) { const k = (cycles[id] || 0); cycles[id] = k + 1; lines = node.cycle[k % node.cycle.length]; }
      await sayAs(D, lines || []);
      if (node.set) Q.save.setFlag(node.set);
      if (!node.next) break;                                  // next: true = carry on with the next choice that fits
      const j = D.talk.findIndex((n, k) => k > i && cond(n.if)); if (j < 0) break;
      i = j; node = D.talk[j];
    }
    if (node.do === 'shop') await shop(D);
    else if (node.do === 'booth') await booth(D);
    else if (node.do === 'teach') await teach(D, node);
    else if (node.do === 'wake') { Q.save.setFlag('reginaldAwake'); if (npc && npc.src.moved) Q.world.moveNpc(id, npc.src.moved.at); }
  };
  Q.talk.sign = id => Q.say(SIGNS()[id] || [id]);
  Q.talk.thing = async function (th) {
    if (th.use === 'booth') return Q.talk.npc('terry');
    if (th.use === 'shop') return Q.talk.npc('rusty');
    if (th.charm && Q.charms.get(th.charm) && !Q.charms.owned(th.charm)) {       // a hidden charm (data/maps: charm)
      await Q.talk.sign(th.found || th.say);
      Q.charms.give(th.charm); Q.sfx('quest-item');
      await Q.say([`You found a charm: the ${Q.charms.get(th.charm).name}! ${Q.charms.get(th.charm).desc}`, 'Wear it from the Pause menu: CHARMS. (Charms work in Arcade Quest only.)']);
      return;
    }
    if (th.say) await Q.talk.sign(th.say);
    if (th.use === 'jukebox') await jukebox();
  };
  Q.talk.intro = () => Q.say(['Whoa! The Ghost Notes cabinet pulled you right through the screen!',
    'You land on a dusty carpet. Candles flicker. Somewhere, a ghost is singing.']);

  /* ---------- a panel with a menu (shop, booth, charms, save code) ---------- */
  function panel(title, html, items, {cols = 1, onPick, cls = ''} = {}) {
    const p = Q.el('div', 'q-overlay');
    p.innerHTML = `<div class="q-panel q-wpanel ${cls}" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2><div class="q-pbody">${html}</div><div class="q-pmenu"></div></div>`;
    Q.ui.appendChild(p);
    let m = null;
    const build = list => { if (m) m.destroy(); m = Q.menu(p.querySelector('.q-pmenu'), list, {cols, label: title, onPick: (it, i) => onPick(it, i, api), onBack: () => onPick({id: null}, -1, api)}); };
    const api = {el: p, body: p.querySelector('.q-pbody'), rebuild: build, close() { if (m) m.destroy(); p.remove(); }};
    build(items);
    return api;
  }

  /* ---------- the Save Jukebox: SAVE (where you are + full HP + the save code) or YOUR BAND ---------- */
  async function jukebox() {
    for (;;) {
      const pick = await new Promise(done => {
        const p = panel('Save Jukebox', '<p>The jukebox saves where you are and fills your HP.</p>',
          [{id: 'save', label: 'Save here'}, {id: 'band', label: Q.text('bandTitle')}, {id: null, label: 'Not now'}],
          {cols: 3, cls: 'q-juke', onPick: it => { p.close(); done(it.id); }});
      });
      if (pick === 'band') { await Q.talk.band(); continue; }
      if (pick === 'save') break;
      return;
    }
    const s = Q.save.get(), here = Q.world.here();
    s.world = here; s.hp = s.maxHp; Q.save.write();
    Q.sfx('quest-save'); Q.talk.hud();
    await Q.say(['Saved! The jukebox plays your theme song. Your HP is full again.']);
    await Q.talk.showCode();
  }
  /** the SAVE CODE panel: this save as 65 characters (shared/backup.js version 5), to write down or copy */
  Q.talk.showCode = function () {
    const code = Q.save.code();
    if (!code) return Promise.resolve();
    return new Promise(done => {
      const p = panel('Your save code', `<p class="q-code" aria-label="Save code: ${code.split('').join(' ')}">${code}</p>` +
        `<p class="q-small">Write it down! On any device, pick ENTER SAVE CODE on the title screen to carry on from here.</p><p class="q-small q-copied" aria-live="polite"></p>`,
        [{id: 'copy', label: 'Copy'}].concat(A.Backup ? [{id: 'backup', label: 'Backup'}] : [], [{id: null, label: 'Done'}]), {cols: A.Backup ? 3 : 2, cls: 'q-codep', onPick: (it, i, api) => {
          if (it.id === 'backup') { A.Backup.open(); return; }        // the whole arcade's BACKUP / RESTORE, on top of this panel
          if (it.id === 'copy') {
            const ok = () => { api.el.querySelector('.q-copied').textContent = 'Copied!'; };
            if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, () => {}); return;
          }
          api.close(); done();
        }});
    });
  };
  /** ENTER SAVE CODE (the title screen): type a code, check it, ask before replacing a save. Resolves true = loaded */
  Q.talk.enterCode = function () {
    return new Promise(done => {
      const p = Q.el('div', 'q-overlay');
      p.innerHTML = `<div class="q-panel q-wpanel q-codep" role="dialog" aria-modal="true" aria-labelledby="qCodeT"><h2 id="qCodeT">Enter save code</h2>` +
        `<label class="q-small" for="qCodeIn">65 letters and numbers (older codes: 60, 45, 40 or 25). Spaces and dashes don't matter.</label>` +
        `<input id="qCodeIn" class="q-codein" type="text" maxlength="90" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX">` +
        `<p class="q-codemsg" role="alert"></p><div class="q-pmenu q-coderow"><button type="button" class="q-btn" data-a="load">Load</button>${A.Backup ? '<button type="button" class="q-btn" data-a="backup">Backup</button>' : ''}<button type="button" class="q-btn" data-a="back">Back</button></div></div>`;
      Q.ui.appendChild(p);
      const inp = p.querySelector('#qCodeIn'), msg = p.querySelector('.q-codemsg');
      let confirming = false;
      const close = ok => { off(); p.remove(); done(ok); };
      const off = Q.input.on(btn => { if (btn === 'b') close(false); return true; });
      inp.addEventListener('input', () => {                   // tidy as they type: upper case, groups of 5
        const raw = inp.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 65);
        inp.value = (raw.match(/.{1,5}/g) || []).join('-'); msg.textContent = ''; confirming = false;
      });
      const load = () => {
        const check = A.Backup && A.Backup.questDecode(inp.value);
        if (!check || !check.ok) { msg.textContent = check ? check.error : 'Save codes are not available.'; msg.className = 'q-codemsg q-bad'; Q.sfx('note-wrong'); return; }
        const s = Q.save.get(), started = !!(s.world || (s.battles && s.battles.won) || Object.keys(s.flags || {}).length);
        if (started && !confirming) {
          confirming = true; msg.className = 'q-codemsg q-warn';
          msg.textContent = 'This will replace your Arcade Quest save on this device. Press Load again to continue.'; return;
        }
        Q.save.fromCode(inp.value); Q.sfx('quest-save'); close(true);
      };
      p.querySelector('[data-a="load"]').addEventListener('click', load);
      const bk = p.querySelector('[data-a="backup"]');               // the whole arcade's BACKUP / RESTORE (a full backup code), on top
      if (bk) bk.addEventListener('click', () => A.Backup.open());
      p.querySelector('[data-a="back"]').addEventListener('click', () => close(false));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); load(); } else if (e.key === 'Escape') close(false); });
      setTimeout(() => { if (!document.body.classList.contains('ui-modal')) inp.focus(); }, 30);
    });
  };

  /* ---------- Token Booth Terry (the wallet: shared/tokens.js) ---------- */
  const starSources = () => { Q.save.get(); return T().starSources(); };
  Q.talk.starSources = starSources;
  function booth(D) {
    return new Promise(done => {
      const render = () => {
        const src = starSources(), fresh = src.reduce((n, s) => n + s.fresh, 0), RATE = T().RATE;
        return {fresh, html: `<table class="q-stars"><tr><th>Where</th><th>Stars</th><th>New</th></tr>` +
          src.map(s => `<tr><td>${s.label}</td><td>${s.stars}</td><td>${s.fresh}</td></tr>`).join('') + `</table>` +
          `<p>${fresh ? `${fresh} new star${fresh === 1 ? '' : 's'} = <b>${fresh * RATE} Arcade Tokens</b> (${RATE} per star)` : 'No new stars yet. Earn stars in the other arcade games, then come back!'}</p>` +
          `<p class="q-small">You have ${coin()}<b>${T().balance()}</b> tokens. (The same tokens as the arcade's Prize Counter.)</p>`};
      };
      let r = render();
      const items = () => (r.fresh ? [{id: 'turn', label: `Turn in ${r.fresh} ★`}] : []).concat([{id: 'looks', label: 'Player items', sub: 'For your avatar'},
        {id: 'charms', label: 'Charms', sub: 'Arcade Quest only'}].concat(A.BandNinja ? [{id: 'code', label: 'Enter a code', sub: 'Band Ninja belt codes'}] : []).concat([{id: null, label: 'Done'}]));
      panel('Token Booth', r.html, items(), {cols: 2, cls: 'q-booth', onPick: async (it, i, api) => {
        if (it.id === 'looks' || it.id === 'charms' || it.id === 'code') {
          api.el.hidden = true;
          await (it.id === 'looks' ? cosmeticShop() : it.id === 'code' ? Q.talk.beltCode() : charmShop());
          api.el.hidden = false; r = render(); api.body.innerHTML = r.html; api.rebuild(items());
          return;
        }
        if (it.id === 'turn') {
          Q.save.get(); T().turnIn(); Q.sfx('quest-tokens'); Q.talk.hud();
          r = render(); api.body.innerHTML = r.html + `<p class="q-good">Ka-ching! Pleasure doing business.</p>`; api.rebuild(items());
          return;
        }
        api.close(); done();
      }});
    });
  }

  /* ---------- ENTER A CODE: a Band Ninja belt code (shared/bandninja.js) opens that belt's OFFICIAL BAND NINJA GEAR.
     Nothing is sent anywhere: the code is checked right here. Wrong codes: 10 tries a minute. ---------- */
  Q.talk.beltCode = function () {
    const BN = A.BandNinja;
    if (!BN) return Promise.resolve(false);
    return new Promise(done => {
      const p = Q.el('div', 'q-overlay');
      p.innerHTML = `<div class="q-panel q-wpanel q-codep q-beltcode" role="dialog" aria-modal="true" aria-labelledby="qBeltT"><h2 id="qBeltT">Enter a code</h2>` +
        `<label class="q-small" for="qBeltIn">A belt code from your Band Ninja page, like ABC-1234. It opens official Band Ninja gear for your player.</label>` +
        `<input id="qBeltIn" class="q-codein" type="text" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC-XXXX">` +
        `<p class="q-codemsg" role="alert"></p><div class="q-pmenu q-coderow"><button type="button" class="q-btn" data-a="go">Check</button><button type="button" class="q-btn" data-a="back">Back</button></div></div>`;
      Q.ui.appendChild(p);
      const inp = p.querySelector('#qBeltIn'), msg = p.querySelector('.q-codemsg');
      const close = ok => { off(); p.remove(); done(ok); };
      const off = Q.input.on(btn => { if (btn === 'b' && !p.hidden) close(false); return true; });
      inp.addEventListener('input', () => { msg.textContent = ''; });
      const check = () => {
        const r = BN.redeem(inp.value);
        msg.textContent = r.msg; msg.className = 'q-codemsg ' + (r.ok ? 'q-good' : 'q-bad');
        if (!r.ok) { Q.sfx('note-wrong'); return; }
        if (r.again) return;
        // this belt's gear, and the LEGENDARY Grandmaster's Aura when this was the last of the 10 codes
        const keys = A.Avatar.items().filter(it => it.unlock.bandninja === r.belt || (it.unlock.bandninja === 'all' && BN.hasAll && BN.hasAll())).map(it => it.key);
        inp.value = '';
        if (A.Skins && A.Skins.catchUp) {                   // the arcade's own UNLOCKED! card (+ item-unlocked)
          p.hidden = true;
          A.Skins.catchUp(A.store.player, {only: keys});
          const card = document.querySelector('body>.overlay.sk-catchup');
          const back = () => { p.hidden = false; setTimeout(() => inp.focus(), 30); if (Q.onSettings) Q.onSettings(); };
          if (card) new MutationObserver((l, o) => { if (!card.isConnected) { o.disconnect(); back(); } }).observe(document.body, {childList: true});
          else back();
        } else Q.sfx('item-unlocked');
      };
      p.querySelector('[data-a="go"]').addEventListener('click', check);
      p.querySelector('[data-a="back"]').addEventListener('click', () => close(false));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } else if (e.key === 'Escape') close(false); e.stopPropagation(); });
      setTimeout(() => inp.focus(), 30);
    });
  };

  /* ---------- the Token Booth's shelves: avatar items and charms ---------- */
  const tokensLine = msg => `<p>You have ${coin()}<b>${T().balance()}</b> tokens.</p>` + (msg ? `<p class="${msg.cls}">${msg.text}</p>` : '');
  /** avatar items for tokens (shared/avatar-parts.js unlock {shop}): owned forever, worn everywhere in the arcade */
  function cosmeticShop() {
    return new Promise(done => {
      // every item for tokens (shared/tokens.js catalog): the Manor Collection first (only here!), then by price
      // SEASONAL items (the seasonal shop) only while their event runs, first, tagged "SEASONAL"
      const AV = A.Avatar, stock = AV ? T().catalog().filter(it => it.onSale).sort((a, b) => (!!b.season - !!a.season) || (b.questOnly - a.questOnly) || (a.full - b.full)) : [];
      const sea = T().seasonal();
      const bgOf = it => it.field === 'bg' && A.AvatarBg ? ` style="background-image:url(${A.AvatarBg.stillURL(it.id, 128)})"` : '';   // a background: behind you
      const bust = it => AV.bustURL(Object.assign(AV.get(), {[it.field]: it.id}), {color: 'classic', acc: null});
      const pic = it => {
        if (it.field === 'plate') return `<span class="q-cos q-cos-plate"><span class="av-plate av-plate-${it.id}">${AV.nameOf(AV.get()).split(' ').slice(-1)[0]}</span></span>`;
        const fx = it.field === 'effect' && A.AvatarFx ? A.AvatarFx.stillURLs(it.id, AV.get().effectColor, 96) : null;   // an effect: around your bust
        if (fx) return `<span class="q-cos q-cos-fx"><img alt="" src="${fx.back}"><img alt="" src="${bust(it)}"><img alt="" src="${fx.front}"></span>`;
        return `<img class="q-cos${it.field === 'bg' ? ' q-cos-bg' : ''}" alt=""${bgOf(it)} src="${bust(it)}">`;
      };
      const own = it => T().owned(it.key);
      const tags = it => (it.season && sea ? `<span class="q-tag q-season">SEASONAL: ${sea.left}</span>` : '') + (it.questOnly ? '<span class="q-tag q-manor">MANOR COLLECTION: only here!</span>' : '') + (T().price(it.key).weekly ? '<span class="q-tag q-weekly">⭐ WEEKLY</span>' : '');
      const cost = it => { const p = T().price(it.key); return p.weekly ? `<s>${p.full}</s> ${p.price} tokens` : `${p.price} tokens`; };
      const list = () => stock.map(it => ({id: it.key, label: `${pic(it)}${it.name}${tags(it)}`, sub: own(it) ? 'OWNED' : cost(it), cls: (own(it) ? 'q-owned' : '') + (it.questOnly ? ' q-manoritem' : '')}))
        .concat([{id: null, label: 'Back'}]);
      panel('Player items', tokensLine({cls: 'q-small', text: 'For your player, everywhere in the arcade. Yours forever!'}), list(), {cols: 4, cls: 'q-shop q-cosshop', onPick: (it, i, api) => {
        if (!it.id) { api.close(); done(); return; }
        const item = stock.find(x => x.key === it.id);
        if (own(item)) { api.body.innerHTML = tokensLine({cls: 'q-good', text: `You own the ${item.name}. Wear it from the LOCKER or EDIT PLAYER.`}); return; }
        Q.save.get();
        const r = T().buy(item.key, {counter: 'quest'});
        if (!r.ok) { api.body.innerHTML = tokensLine({cls: 'q-bad', text: `The ${item.name} costs ${r.price} tokens. Turn in stars to get more!`}); Q.sfx('note-wrong'); return; }
        Q.sfx('item-purchase'); Q.talk.hud();
        const av = AV.get(); av[item.field] = item.id; AV.set(av);                     // wear it right away
        if (Q.onSettings) Q.onSettings();
        api.body.innerHTML = tokensLine({cls: 'q-good', text: `The ${item.name} is yours! You're wearing it now (change it any time in the LOCKER).`}); api.rebuild(list());
      }});
    });
  }
  /** how to get a charm you don't have yet */
  function charmHow(c) {
    const E = window.QUEST_ENEMIES || [], M = window.QUEST_MAPS || {};
    return [c.price ? `${c.price} tokens at the Token Booth` : '', c.found ? `hidden in ${(M[c.found] || {}).name || 'the manor'}` : '',
      c.reward ? `befriend ${(E.find(e => e.id === c.reward) || {}).name || 'a ghost'}` : ''].filter(Boolean).join(', or ');
  }
  function charmShop() {
    return new Promise(done => {
      const C = Q.charms.list(), stock = Object.keys(C).filter(id => C[id].price);
      const list = () => stock.map(id => ({id, label: C[id].name, sub: Q.charms.owned(id) ? 'OWNED' : `${C[id].price} tokens · ${C[id].desc}`, cls: Q.charms.owned(id) ? 'q-owned' : ''}))
        .concat([{id: null, label: 'Back'}]);
      const note = {cls: 'q-small', text: 'ARCADE QUEST ONLY: charms power you up in Quest battles. They never change the other games.'};
      panel('Charms', tokensLine(note), list(), {cols: 2, cls: 'q-shop', onPick: (it, i, api) => {
        if (!it.id) { api.close(); done(); return; }
        const c = C[it.id];
        Q.save.get();
        if (Q.charms.owned(it.id)) { api.body.innerHTML = tokensLine({cls: 'q-good', text: `You have the ${c.name}. Wear it from the Pause menu: CHARMS.`}); return; }
        if (!T().spend(c.price)) { api.body.innerHTML = tokensLine({cls: 'q-bad', text: `The ${c.name} costs ${c.price} tokens.`}); Q.sfx('note-wrong'); return; }
        Q.charms.give(it.id); Q.save.write(); Q.sfx('item-purchase'); Q.talk.hud();
        if (Q.charms.equipped().includes(null)) Q.charms.equip(Q.charms.equipped().indexOf(null), it.id);   // a free slot: wear it
        api.body.innerHTML = tokensLine({cls: 'q-good', text: `The ${c.name} is yours!${Q.charms.equipped().includes(it.id) ? ' You\'re wearing it.' : ' Wear it from the Pause menu: CHARMS.'}`}); api.rebuild(list());
      }});
    });
  }
  /** THE BAND panel (the pause menu, the Save Jukebox, the Test Arena): pick up to 2 befriended ghosts to play beside
      you in battle (engine/save.js Q.band). A third pick sends the one picked longest ago on a break. */
  Q.talk.band = function () {
    return new Promise(done => {
      const E = id => Q.band.enemy(id), T = Q.text;
      const perk = c => { const k = Object.keys(c.perk || {})[0]; return k === 'calm' ? T('bandPerkCalm') : k === 'heal' ? T('bandPerkHeal') : T('bandPerkPower'); };
      const body = msg => {
        const now = Q.band.members(), can = Q.band.choices();
        return `<p>${!can.length ? T('bandEmpty') : now.length ? T('bandNow', {list: now.map(id => E(id).name).join(' and ')}) : T('bandSolo')}</p>` +
          (can.length && Q.band.auto() ? `<p class="q-small">${T('bandAuto')}</p>` : '') +
          `<p class="q-small">${T('bandHow')}</p><p class="q-small">${T('bandKind')}</p>` + (msg ? `<p class="q-good">${msg}</p>` : '');
      };
      const list = () => Q.band.choices().map(id => {
        const on = Q.band.members().includes(id), c = E(id).companion;
        return {id, label: (on ? '✓ ' : '') + E(id).name, sub: `${on ? T('bandIn') + ' · ' : ''}${perk(c)} · ${T('bandPowerOf', {n: Math.round(c.power * 100)})}`, cls: on ? 'q-owned' : ''};
      }).concat([{id: null, label: 'Done'}]);
      panel(T('bandTitle'), body(), list(), {cols: 2, cls: 'q-shop q-band', onPick: (it, i, api) => {
        if (!it.id) { api.close(); done(); return; }
        let now = Q.band.members(), msg;
        if (now.includes(it.id)) { now = now.filter(x => x !== it.id); msg = T('bandLeft', {band: E(it.id).name}); }
        else {
          if (now.length >= Q.band.MAX) { msg = T('bandFull', {band: E(now[0]).name, name: E(it.id).name}); now = now.slice(1); }
          else msg = T('bandPicked', {band: E(it.id).name});
          now.push(it.id);
        }
        Q.band.set(now); Q.sfx('charm-equip');
        api.body.innerHTML = body(msg); api.rebuild(list());
      }});
    });
  };
  /** the CHARMS panel (pause menu): 2 slots; pick an owned charm to wear or take it off */
  Q.talk.charms = function () {
    return new Promise(done => {
      const C = Q.charms.list(), ids = Object.keys(C);
      const body = msg => {
        const eq = Q.charms.equipped();
        return `<p class="q-only">ARCADE QUEST ONLY</p><div class="q-slots">` + eq.map((id, i) => `<p class="q-slot${id ? ' on' : ''}">Slot ${i + 1}: <b>${id ? C[id].name : 'empty'}</b></p>`).join('') + `</div>` +
          `<p class="q-small">Charms power you up in Arcade Quest battles only. Your stars in the other games always show what you really played.</p>` +
          (msg ? `<p class="${msg.cls}">${msg.text}</p>` : '');
      };
      const list = () => ids.map(id => {
        const own = Q.charms.owned(id), on = Q.charms.equipped().includes(id);
        return {id, label: (on ? '✓ ' : '') + C[id].name, sub: own ? C[id].desc : `Not found yet: ${charmHow(C[id])}`, disabled: !own, cls: on ? 'q-owned' : ''};
      }).concat([{id: null, label: 'Done'}]);
      panel('Charms', body(), list(), {cols: 2, cls: 'q-shop q-charms', onPick: (it, i, api) => {
        if (!it.id) { api.close(); done(); return; }
        const eq = Q.charms.equipped(), c = C[it.id];
        let text;
        if (eq.includes(it.id)) { Q.charms.equip(eq.indexOf(it.id), null); text = `Took off the ${c.name}.`; }
        else {
          const slot = eq.indexOf(null);
          if (slot >= 0) Q.charms.equip(slot, it.id);
          else { Q.charms.equip(0, eq[1]); Q.charms.equip(1, it.id); }             // both full: the older one comes off
          text = `Wearing the ${c.name}!${slot < 0 ? ` (The ${C[eq[0]].name} came off.)` : ''}`;
        }
        Q.sfx('charm-equip'); Q.talk.hud(); if (Q.onSettings) Q.onSettings();
        api.body.innerHTML = body({cls: 'q-good', text}); api.rebuild(list());
      }});
    });
  };

  /* ---------- Rusty's shop ---------- */
  function shop(D) {
    return new Promise(done => {
      const stock = Object.keys(ITEMS()).filter(k => ITEMS()[k].price);
      const html = msg => `<p>You have ${coin()}<b>${T().balance()}</b> tokens.</p>` + (msg ? `<p class="${msg.cls}">${msg.text}</p>` : '');
      const list = () => stock.map(k => ({id: k, label: `${ITEMS()[k].name} · ${ITEMS()[k].price} tokens`, sub: `${ITEMS()[k].desc} You have ${Q.save.get().items[k] || 0}.`}))
        .concat([{id: null, label: 'Done'}]);
      panel('Rusty\'s Supplies', html(), list(), {cols: 2, cls: 'q-shop', onPick: (it, i, api) => {
        if (!it.id) { api.close(); Q.say(['Come back soon! Or don\'t! No pressure! Ahh!'], {name: D.name, portrait: D.sprite}).then(done); return; }
        const s = Q.save.get(), item = ITEMS()[it.id];
        if (!T().spend(item.price)) { api.body.innerHTML = html({cls: 'q-bad', text: `Not enough tokens for the ${item.name}. Terry can turn stars into tokens!`}); return; }
        s.items[it.id] = (s.items[it.id] || 0) + 1; Q.save.write(); Q.sfx('quest-tokens'); Q.talk.hud();
        api.body.innerHTML = html({cls: 'q-good', text: Q.text('bought', {item: item.name})}); api.rebuild(list());
      }});
    });
  }

  /* ---------- the Butler's song: the B♭ Blast ---------- */
  async function teach(D, node) {
    if (!(await Q.micReady())) { await Q.say(Q.text('micHint')); return; }
    const res = await Q.challenge.blast(true);
    const ok = res.acc >= 0.75;
    if (ok) { Q.save.setFlag('songBb'); Q.sfx('quest-levelup'); }
    await sayAs(D, ok ? node.yes : node.no);
  }

})(window.Arcade);
