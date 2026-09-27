/* ARCADE QUEST ENGINE: talking and the overworld's panels.
   Q.talk.npc(id, npc)    a conversation from data/dialogue.js (the first `talk` choice whose `if` is true; see there)
   Q.talk.thing(thing)    a sign or object from a map: `say` (data/dialogue.js QUEST_SIGNS) and/or `use`
                          ('jukebox' saves, 'booth' = Token Booth Terry, 'shop' = Rusty)
   Q.talk.sign(id)        one sign's lines
   Q.talk.pause()         the pause menu (B): your stats, bag and band, SETTINGS, back to the title
   Q.talk.hud()           the little status line (LV, HP, tokens) and the MENU button (touch)
   THE TOKEN BOOTH turns stars from the other arcade games into Arcade Tokens: RATE tokens per star. It counts the
   player's instrument (store.allStars(member): every game and mode) plus games with a fixed player (Chime Heist,
   Ancient Ninja Scrolls) that instrument doesn't already cover, and remembers each source's stars in
   save.converted, so a star is only ever turned in once. It also SELLS: avatar items (shared/avatar-parts.js items with
   unlock {shop: price}: the arcade's own, owned forever and worn everywhere: Arcade.store.ownItem) and CHARMS
   (data/items.js QUEST_CHARMS with a price; ARCADE QUEST ONLY). Q.talk.charms() = the CHARMS panel (pause menu):
   2 slots, owned charms to wear, and how to find the rest. */
(function (A) {
  "use strict";
  const Q = A.Quest;
  const RATE = 5, REGINALD_NEEDS = 8;
  const DLG = () => window.QUEST_DIALOGUE || {}, SIGNS = () => window.QUEST_SIGNS || {}, ITEMS = () => window.QUEST_ITEMS || {};
  const unpitched = () => { const i = A.currentInstrument && A.currentInstrument(); return !!(i && i.pitched === false); };

  /* ---------- the overworld's HTML ---------- */
  Q.talk = {};
  Q.talk.mount = function () {
    Q.ui.innerHTML = `<div class="q-whud" id="qWHud" aria-live="off"></div><p class="q-area" id="qArea" aria-live="polite"></p>` +
      `<button type="button" class="q-menu-btn" id="qMenuBtn">Menu</button>` +
      `<p class="q-mictag" id="qMicTag" hidden><span class="q-dot"></span> The mic is listening</p>`;
    Q.$('qMenuBtn').addEventListener('click', () => Q.input.press('b'));
  };
  Q.talk.hud = function () {
    const el = Q.$('qWHud'); if (!el) return;
    const s = Q.save.get();
    el.innerHTML = `<b>LV ${s.level}</b> <span>HP ${s.hp}/${s.maxHp}</span> <span class="q-tok"><i class="q-coin" aria-hidden="true"></i>${s.tokens}<span class="sr"> tokens</span></span>`;
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
      await Q.say([`You found a charm: the ${Q.charms.get(th.charm).name}! ${Q.charms.get(th.charm).desc}`, 'Wear it from the Menu: CHARMS. (Charms work in Arcade Quest only.)']);
      return;
    }
    if (th.say) await Q.talk.sign(th.say);
    if (th.use === 'jukebox') await jukebox();
  };
  Q.talk.intro = () => Q.say(['Whoa! The Ghost Notes cabinet pulled you right through the screen!',
    'You land on a dusty carpet. Candles flicker. Somewhere, a ghost is singing.']);

  /* ---------- a panel with a menu (shop, booth, pause, yes/no) ---------- */
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
  function ask(question, yes = 'Yes', no = 'No') {
    return new Promise(done => panel(question, '', [{id: true, label: yes}, {id: false, label: no}], {cols: 2, cls: 'q-ask',
      onPick: (it, i, api) => { api.close(); done(it.id === true); }}));
  }

  /* ---------- the Save Jukebox ---------- */
  async function jukebox() {
    if (!(await ask('Save your game here?', 'Save', 'Not now'))) return;
    const s = Q.save.get(), here = Q.world.here();
    s.world = here; s.hp = s.maxHp; Q.save.write();
    Q.sfx('quest-save'); Q.talk.hud();
    await Q.say(['Saved! The jukebox plays your theme song. Your HP is full again.']);
    await Q.talk.showCode();
  }
  /** the SAVE CODE panel: this save as 40 characters (shared/backup.js), to write down or copy */
  Q.talk.showCode = function () {
    const code = Q.save.code();
    if (!code) return Promise.resolve();
    return new Promise(done => {
      const p = panel('Your save code', `<p class="q-code" aria-label="Save code: ${code.split('').join(' ')}">${code}</p>` +
        `<p class="q-small">Write it down! On any device, pick ENTER SAVE CODE on the title screen to carry on from here.</p><p class="q-small q-copied" aria-live="polite"></p>`,
        [{id: 'copy', label: 'Copy'}, {id: null, label: 'Done'}], {cols: 2, cls: 'q-codep', onPick: (it, i, api) => {
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
        `<label class="q-small" for="qCodeIn">40 letters and numbers (older codes: 25). Spaces and dashes don't matter.</label>` +
        `<input id="qCodeIn" class="q-codein" type="text" maxlength="60" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX">` +
        `<p class="q-codemsg" role="alert"></p><div class="q-pmenu q-coderow"><button type="button" class="q-btn" data-a="load">Load</button><button type="button" class="q-btn" data-a="back">Back</button></div></div>`;
      Q.ui.appendChild(p);
      const inp = p.querySelector('#qCodeIn'), msg = p.querySelector('.q-codemsg');
      let confirming = false;
      const close = ok => { off(); p.remove(); done(ok); };
      const off = Q.input.on(btn => { if (btn === 'b') close(false); return true; });
      inp.addEventListener('input', () => {                   // tidy as they type: upper case, groups of 5
        const raw = inp.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 40);
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
      p.querySelector('[data-a="back"]').addEventListener('click', () => close(false));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); load(); } else if (e.key === 'Escape') close(false); });
      setTimeout(() => inp.focus(), 30);
    });
  };

  /* ---------- Token Booth Terry ---------- */
  function starSources() {
    const m = A.currentMember(), st = A.store, groups = A.groupsOf(m.id).map(g => g.id);
    const list = [{key: 'm:' + m.id, label: `${m.name} stars`, stars: st.allStars(m.id)}];
    (A.ALL_GAMES || A.GAMES).forEach(g => {
      if (!g.player || !g.maxStars || groups.includes(g.player)) return;           // bells already count Chime Heist
      list.push({key: 'g:' + g.id, label: g.name, stars: st.allStars(g.player, g.id)});
    });
    const s = Q.save.get(), conv = s.converted || (s.converted = {});
    if (s.convertedLeft > 0) {                           // a save code's turned-in stars: spread over this device's sources
      list.forEach(x => { const n = Math.min(s.convertedLeft, Math.max(0, x.stars - (conv[x.key] || 0))); conv[x.key] = (conv[x.key] || 0) + n; s.convertedLeft -= n; });
      Q.save.write();
    }
    list.forEach(s => { s.done = Math.min(s.stars, conv[s.key] || 0); s.fresh = Math.max(0, s.stars - (conv[s.key] || 0)); });
    return list;
  }
  Q.talk.starSources = starSources;
  function booth(D) {
    return new Promise(done => {
      const render = () => {
        const src = starSources(), fresh = src.reduce((n, s) => n + s.fresh, 0);
        return {fresh, html: `<table class="q-stars"><tr><th>Where</th><th>Stars</th><th>New</th></tr>` +
          src.map(s => `<tr><td>${s.label}</td><td>${s.stars}</td><td>${s.fresh}</td></tr>`).join('') + `</table>` +
          `<p>${fresh ? `${fresh} new star${fresh === 1 ? '' : 's'} = <b>${fresh * RATE} Arcade Tokens</b> (${RATE} per star)` : 'No new stars yet. Earn stars in the other arcade games, then come back!'}</p>` +
          `<p class="q-small">You have <i class="q-coin" aria-hidden="true"></i><b>${Q.save.get().tokens}</b> tokens.</p>`};
      };
      let r = render();
      const items = () => (r.fresh ? [{id: 'turn', label: `Turn in ${r.fresh} ★`}] : []).concat([{id: 'looks', label: 'Player items', sub: 'For your avatar'},
        {id: 'charms', label: 'Charms', sub: 'Arcade Quest only'}, {id: null, label: 'Done'}]);
      panel('Token Booth', r.html, items(), {cols: 2, cls: 'q-booth', onPick: async (it, i, api) => {
        if (it.id === 'looks' || it.id === 'charms') {
          api.el.hidden = true;
          await (it.id === 'looks' ? cosmeticShop() : charmShop());
          api.el.hidden = false; r = render(); api.body.innerHTML = r.html; api.rebuild(items());
          return;
        }
        if (it.id === 'turn') {
          const s = Q.save.get(); s.converted = s.converted || {};
          starSources().forEach(x => { s.converted[x.key] = x.stars; });
          s.tokens += r.fresh * RATE; Q.save.write(); Q.sfx('quest-tokens'); Q.talk.hud();
          r = render(); api.body.innerHTML = r.html + `<p class="q-good">Ka-ching! Pleasure doing business.</p>`; api.rebuild(items());
          return;
        }
        api.close(); done();
      }});
    });
  }

  /* ---------- the Token Booth's shelves: avatar items and charms ---------- */
  const tokensLine = msg => `<p>You have <i class="q-coin" aria-hidden="true"></i><b>${Q.save.get().tokens}</b> tokens.</p>` + (msg ? `<p class="${msg.cls}">${msg.text}</p>` : '');
  /** avatar items for tokens (shared/avatar-parts.js unlock {shop}): owned forever, worn everywhere in the arcade */
  function cosmeticShop() {
    return new Promise(done => {
      const AV = A.Avatar, stock = AV ? AV.items().filter(it => it.shop) : [];
      const bgOf = it => it.field === 'bg' && A.AvatarBg ? ` style="background-image:url(${A.AvatarBg.stillURL(it.id, 128)})"` : '';   // a background: behind you
      const pic = it => `<img class="q-cos${it.field === 'bg' ? ' q-cos-bg' : ''}" alt=""${bgOf(it)} src="${AV.bustURL(Object.assign(AV.get(), {[it.field]: it.id}), {color: 'classic', acc: null})}">`;
      const own = it => !!A.store.ownedItems[it.key] || AV.isUnlocked(it.field, it.id);
      const list = () => stock.map(it => ({id: it.key, label: `${pic(it)}${it.name}`, sub: own(it) ? 'OWNED' : `${it.shop} tokens`, cls: own(it) ? 'q-owned' : ''}))
        .concat([{id: null, label: 'Back'}]);
      panel('Player items', tokensLine({cls: 'q-small', text: 'For your player, everywhere in the arcade. Yours forever!'}), list(), {cols: 4, cls: 'q-shop q-cosshop', onPick: (it, i, api) => {
        if (!it.id) { api.close(); done(); return; }
        const item = stock.find(x => x.key === it.id), s = Q.save.get();
        if (own(item)) { api.body.innerHTML = tokensLine({cls: 'q-good', text: `You own the ${item.name}. Wear it from the LOCKER or EDIT PLAYER.`}); return; }
        if (s.tokens < item.shop) { api.body.innerHTML = tokensLine({cls: 'q-bad', text: `The ${item.name} costs ${item.shop} tokens. Turn in stars to get more!`}); Q.sfx('note-wrong'); return; }
        s.tokens -= item.shop; Q.save.write(); A.store.ownItem(item.key); Q.sfx('item-purchase'); Q.talk.hud();
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
        const c = C[it.id], s = Q.save.get();
        if (Q.charms.owned(it.id)) { api.body.innerHTML = tokensLine({cls: 'q-good', text: `You have the ${c.name}. Wear it from the Menu: CHARMS.`}); return; }
        if (s.tokens < c.price) { api.body.innerHTML = tokensLine({cls: 'q-bad', text: `The ${c.name} costs ${c.price} tokens.`}); Q.sfx('note-wrong'); return; }
        s.tokens -= c.price; Q.charms.give(it.id); Q.save.write(); Q.sfx('item-purchase'); Q.talk.hud();
        if (Q.charms.equipped().includes(null)) Q.charms.equip(Q.charms.equipped().indexOf(null), it.id);   // a free slot: wear it
        api.body.innerHTML = tokensLine({cls: 'q-good', text: `The ${c.name} is yours!${Q.charms.equipped().includes(it.id) ? ' You\'re wearing it.' : ' Wear it from the Menu: CHARMS.'}`}); api.rebuild(list());
      }});
    });
  }
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
      const html = msg => `<p>You have <i class="q-coin" aria-hidden="true"></i><b>${Q.save.get().tokens}</b> tokens.</p>` + (msg ? `<p class="${msg.cls}">${msg.text}</p>` : '');
      const list = () => stock.map(k => ({id: k, label: `${ITEMS()[k].name} · ${ITEMS()[k].price} tokens`, sub: `${ITEMS()[k].desc} You have ${Q.save.get().items[k] || 0}.`}))
        .concat([{id: null, label: 'Done'}]);
      panel('Rusty\'s Supplies', html(), list(), {cols: 2, cls: 'q-shop', onPick: (it, i, api) => {
        if (!it.id) { api.close(); Q.say(['Come back soon! Or don\'t! No pressure! Ahh!'], {name: D.name, portrait: D.sprite}).then(done); return; }
        const s = Q.save.get(), item = ITEMS()[it.id];
        if (s.tokens < item.price) { api.body.innerHTML = html({cls: 'q-bad', text: `Not enough tokens for the ${item.name}. Terry can turn stars into tokens!`}); return; }
        s.tokens -= item.price; s.items[it.id] = (s.items[it.id] || 0) + 1; Q.save.write(); Q.sfx('quest-tokens'); Q.talk.hud();
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

  /* ---------- the pause menu ---------- */
  Q.talk.pause = function () {
    let done;
    const wait = new Promise(r => { done = r; });
    show();
    return wait;
    function show() {
      const s = Q.save.get(), E = window.QUEST_ENEMIES || [];
      const bag = Object.keys(s.items).filter(k => s.items[k] > 0 && ITEMS()[k]).map(k => `${ITEMS()[k].name} ×${s.items[k]}`).join(', ') || 'empty';
      const band = s.roster.map(id => (E.find(e => e.id === id) || {name: id}).name).join(', ') || 'nobody yet';
      const html = `<p><b>${A.currentMember().name}</b> · LV ${s.level} · HP ${s.hp}/${s.maxHp} · XP ${s.xp}/${Q.save.xpToNext(s.level)} · ` +
        `<i class="q-coin" aria-hidden="true"></i>${s.tokens}</p><p>Bag: ${bag}</p><p>Your band: ${band}</p>` +
        `<p>Ghosts helped: ${Q.save.helped()}${Q.save.flag('songBb') ? ' · You know the B♭ Blast' : ''}</p>` +
        `<p>Charms: ${Q.charms.equipped().filter(Boolean).map(id => Q.charms.get(id).name).join(', ') || 'none worn'}</p>` +
        `<p class="q-small">Save your spot at a Save Jukebox. Your level, items and friends save on their own.</p>`;
      panel('Paused', html, [{id: 'resume', label: 'Back to the game'}, {id: 'charms', label: 'Charms'}, {id: 'settings', label: 'Settings'}, {id: 'title', label: 'Title screen'}], {cols: 4, cls: 'q-pause',
        onPick: async (it, i, api) => {
          if (it.id === 'settings') { Q.settings.open(); return; }
          if (it.id === 'charms') { api.close(); await Q.talk.charms(); show(); return; }
          api.close();
          if (it.id === 'title') { done(); Q.go('title'); return; }
          done();
        }});
    }
  };
})(window.Arcade);
