/* Band Arcade: THE FIGHTING AVATAR (any game; Button Masher's fighter). The student's own avatar, holding their
   instrument, in the FIGHT POSES drawn by shared/avatar.js (Avatar.fightSprites: idle, strike, hit, dizzy, ko,
   victory, bow), facing right. Load after avatar.js, avatar-bg.js and avatar-fx.js, with shared/instrument-sprites.js
   on the page. Styles: .avf-* in theme.css.

     Arcade.AvatarFight.mount(el, {member, avatar, pet, effect})   the live fighter in el; returns a controller:
         .set(pose)        'idle' | 'strike' | 'hit' | 'dizzy' | 'ko' | 'victory' | 'bow' (the new pose starts on its first frame)
         .react(kind)      the pet in the corner: 'cheer' (a hop) | 'worry' (a nervous shiver); nothing without a pet
         .mouth()          where the sound-wave blast starts: {x, y} in page pixels (the instrument's end)
         .destroy()
     Arcade.AvatarFight.stillHTML(member, pose, {cls})   a small STILL copy (results): one frame, never animated
     Arcade.AvatarFight.blastHTML(member)                the neon SOUND-WAVE blast (three arcs), colored by the
                                                         instrument's family: woodwinds pink, brass amber, percussion cyan
     Arcade.AvatarFight.ready()                          true when the fight poses can be drawn (instrument sprites loaded)

   ONE LIVE FIGHTER: the mounted one plays its frames (each pose's own fps, 1–6 a second, the avatar's style); every
   frame is drawn once per avatar + instrument (avatar.js caches them) and only copied onto one small canvas here, so
   fast combos cost nothing. Nothing moves while the page is hidden. prefers-reduced-motion: every pose is its first
   frame only (a simple change of pose), and the pet doesn't hop or shiver.
   PHOTOSENSITIVITY: nothing here flashes; the blast is three arcs that fade in and out once per strike (a strike is at
   most about once a second), never full-screen. */
window.Arcade = window.Arcade || {};
(function (A) {
  'use strict';
  const RM = (window.Arcade.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)'));
  const FAMILY = {woodwind: 'pink', brass: 'amber', percussion: 'cyan'};
  const familyOf = member => { const m = member && A.memberById ? A.memberById(member) : null; return (m && m.family) || 'brass'; };
  const ready = () => !!(A.Avatar && A.Avatar.fightSprites && window.QUEST_ART && window.QUEST_ART.POSES);
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

  function mount(el, {member, avatar, pet = true, effect = true} = {}) {
    if (!ready()) return null;
    const S = A.Avatar.fightSprites(member, {avatar});
    if (!S) return null;
    const av = avatar || A.Avatar.get();
    // the avatar's EFFECT (an aura, notes, sparkles…) as still pictures in a square around the figure (shared/avatar-fx.js);
    // its empty middle (the bust's face area) falls on the figure. The avatar's own background is not shown: the stage has one.
    const fx = effect && av.effect && av.effect !== 'none' && A.AvatarFx ? A.AvatarFx.stillURLs(av.effect, av.effectColor, 192) : null;
    el.innerHTML = `<span class="avf avf-${familyOf(member)}${S.chair ? ' avf-chair' : ''}" style="--avf-ar:${S.w / S.h}" aria-hidden="true">` +
      (fx ? `<img class="avf-fx avf-fx-b" alt="" src="${fx.back}">` : '') +
      `<canvas class="avf-cv" width="${S.w}" height="${S.h}"></canvas>` +
      (fx ? `<img class="avf-fx avf-fx-f" alt="" src="${fx.front}">` : '') +
      (pet && S.pet ? `<span class="avf-pet"><canvas width="10" height="10"></canvas></span>` : '') + `</span>`;
    const root = el.firstChild, cv = root.querySelector('.avf-cv'), g = cv.getContext('2d');
    const pc = root.querySelector('.avf-pet canvas'), pg = pc && pc.getContext('2d');
    let pose = 'idle', t0 = performance.now(), shown = '', petShown = -1, raf = 0, alive = true;
    const draw = now => {
      const P = S.poses[pose] || S.poses.idle, still = RM.matches;
      const i = still ? 0 : Math.floor(Math.max(0, now - t0) * P.fps / 1000) % P.frames.length;   // a rAF time can be a little before t0
      if (shown !== pose + i) { g.clearRect(0, 0, S.w, S.h); g.drawImage(P.frames[i], 0, 0); shown = pose + i; }
      if (pg) {
        const k = still ? 0 : Math.floor(now * S.pet.fps / 1000) % S.pet.frames.length;
        if (k !== petShown) { pg.clearRect(0, 0, 10, 10); pg.drawImage(S.pet.frames[k], 0, 0); petShown = k; }
      }
    };
    const loop = now => {
      if (!alive) return;
      if (!root.isConnected) { alive = false; return; }
      if (!document.hidden) draw(now);
      raf = requestAnimationFrame(loop);
    };
    draw(performance.now());
    raf = requestAnimationFrame(loop);
    let reactT = 0;
    return {
      el: root, sprites: S,
      get pose() { return pose; },
      set(p) { if (!S.poses[p]) p = 'idle'; pose = p; t0 = performance.now(); root.dataset.pose = p; draw(t0); },
      react(kind) {
        const box = root.querySelector('.avf-pet'); if (!box) return;
        box.classList.remove('cheer', 'worry'); void box.offsetWidth; box.classList.add(kind);
        clearTimeout(reactT); reactT = setTimeout(() => box.classList.remove(kind), 1000);
      },
      /** the blast's start: the instrument's end, in page pixels (the figure faces right; its mouth is about 60 % across) */
      mouth() {
        const r = cv.getBoundingClientRect(), k = r.height / S.h;
        return {x: r.left + (S.x + 25) * k, y: r.top + (S.y + 12) * k};
      },
      destroy() { alive = false; cancelAnimationFrame(raf); clearTimeout(reactT); },
    };
  }
  /** a small still copy (results): the pose's first frame, or BOW's bowed frame; marked .av-box so a results panel knows
      it already shows the avatar (Avatar.stampResults adds only the name) */
  function stillHTML(member, pose = 'idle', {cls = ''} = {}) {
    if (!ready()) return '';
    const S = A.Avatar.fightSprites(member); if (!S) return '';
    const P = S.poses[pose] || S.poses.idle, c = P.frames[pose === 'bow' ? P.frames.length - 1 : 0];
    let url = ''; try { url = c.toDataURL('image/png'); } catch (e) { return ''; }
    return `<span class="av-box avf-still ${esc(cls)}" style="--avf-ar:${S.w / S.h}"><img class="avf-img" src="${url}" alt="${esc(A.Avatar.nameOf(A.Avatar.get()))}" draggable="false"></span>`;
  }
  function blastHTML(member) {
    return `<i class="avf-blast avf-${familyOf(member)}" style="--avf-c:var(--${FAMILY[familyOf(member)]}-hi)"><b></b><b></b><b></b></i>`;
  }
  A.AvatarFight = {mount, stillHTML, blastHTML, ready, familyOf, FAMILY};
})(window.Arcade);
