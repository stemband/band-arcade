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
   save.converted, so a star is only ever turned in once. */
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
  const vars = () => ({you: A.currentMember().short, need: Math.max(0, REGINALD_NEEDS - Q.save.helped()), n: Q.save.helped()});
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
  }

  /* ---------- Token Booth Terry ---------- */
  function starSources() {
    const m = A.currentMember(), st = A.store, groups = A.groupsOf(m.id).map(g => g.id);
    const list = [{key: 'm:' + m.id, label: `${m.name} stars`, stars: st.allStars(m.id)}];
    (A.ALL_GAMES || A.GAMES).forEach(g => {
      if (!g.player || !g.maxStars || groups.includes(g.player)) return;           // bells already count Chime Heist
      list.push({key: 'g:' + g.id, label: g.name, stars: st.allStars(g.player, g.id)});
    });
    const conv = Q.save.get().converted || {};
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
      const items = () => (r.fresh ? [{id: 'turn', label: `Turn in ${r.fresh} ★`}, {id: null, label: 'Done'}] : [{id: null, label: 'Done'}]);
      panel('Token Booth', r.html, items(), {cols: 2, cls: 'q-booth', onPick: (it, i, api) => {
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
    return new Promise(done => {
      const s = Q.save.get(), E = window.QUEST_ENEMIES || [];
      const bag = Object.keys(s.items).filter(k => s.items[k] > 0 && ITEMS()[k]).map(k => `${ITEMS()[k].name} ×${s.items[k]}`).join(', ') || 'empty';
      const band = s.roster.map(id => (E.find(e => e.id === id) || {name: id}).name).join(', ') || 'nobody yet';
      const html = `<p><b>${A.currentMember().name}</b> · LV ${s.level} · HP ${s.hp}/${s.maxHp} · XP ${s.xp}/${Q.save.xpToNext(s.level)} · ` +
        `<i class="q-coin" aria-hidden="true"></i>${s.tokens}</p><p>Bag: ${bag}</p><p>Your band: ${band}</p>` +
        `<p>Ghosts helped: ${Q.save.helped()}${Q.save.flag('songBb') ? ' · You know the B♭ Blast' : ''}</p>` +
        `<p class="q-small">Save your spot at a Save Jukebox. Your level, items and friends save on their own.</p>`;
      panel('Paused', html, [{id: 'resume', label: 'Back to the game'}, {id: 'settings', label: 'Settings'}, {id: 'title', label: 'Title screen'}], {cols: 3, cls: 'q-pause',
        onPick: (it, i, api) => {
          if (it.id === 'settings') { Q.settings.open(); return; }
          api.close();
          if (it.id === 'title') { done(); Q.go('title'); return; }
          done();
        }});
    });
  };
})(window.Arcade);
