/* Band Arcade: THE "SAVE YOUR PROGRESS" NUDGE (the lobby). Everything a student earns lives in ONE browser's storage:
   a cleared Chromebook, a reset iPad or Safari's storage cleanup (about 7 days without a visit, unless the arcade is on
   the Home Screen) wipes it, and the Arcade Backup Code (shared/backup.js) is the only way back. Now and then, a slim
   banner under the lobby cards says so: SAVE NOW (the backup panel, its code made and ready to copy) or Not now.
   Small and always loaded on the floor page (and Arcade Quest, so saving there counts too); it never needs
   backup.js until SAVE NOW is tapped. MR. GRAHAM: the SETTINGS block just below is the only part to edit.

   WHAT COUNTS AS SAVED: the student COPIED the Arcade Backup Code (the panel's Copy worked), saved it with SAVE TO
   FILE, or restored a Backup Code (the device now matches a backup). Opening the panel, or making the code without
   copying it, is not saved. backup.js and app.js report every one of them through Arcade.BackupNudge.saved().
   Saved in gameData('backup-nudge') (so it travels in the Backup Code like every gameData):
     {savedAt: 'YYYY-MM-DD', starsAtSave, snoozeUntil: 'YYYY-MM-DD' | null, shown: ['YYYY-MM-DD'…] (the last 10)}
   Arcade.BackupNudge.status(day?)  -> {kind: null | 'stars' | 'new' | 'break', show, why, newStars, days, total, …}
   Arcade.BackupNudge.refresh()     draws or hides the banner (lobby.js calls it every time the lobby is drawn)
   Arcade.BackupNudge.saved({restored})  the student saved: savedAt = today, starsAtSave = the star total now
   Arcade.BackupNudge.NUDGE         the SETTINGS below (tests change them) */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  /* ======================================= SETTINGS (Mr. Graham edits these) =======================================
     Update `breaks` each August. */
  const NUDGE = {
    stars: 25,          // new stars since the last backup that make it worth saving
    days: 14,           // OR this many days with progress since the last backup
    firstAfterStars: 10,// a brand-new player: the first nudge once they have this many stars
    snoozeDays: 4,      // "Not now" waits this long
    maxPerWeek: 1,      // never more often than this
    // Days before a long break: everyone with ANY unsaved progress gets the nudge that day and the school day before.
    // 'YYYY-MM-DD' = the last school day. Edit each year.
    breaks: ['2026-11-20', '2026-12-18', '2027-03-26', '2027-05-21'],
  };
  /* ================================================================================================================ */

  const KEY = 'backup-nudge';
  const rec = () => A.store.gameData(KEY);
  const put = () => A.store.saveGameData(KEY);
  const dayKey = d => A.store.dayKey(d);
  const at = key => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (key, n) => { const d = at(key); d.setDate(d.getDate() + n); return dayKey(d); };
  /** the next weekday (Monday–Friday) after this day */
  const nextSchoolDay = key => { let k = addDays(key, 1); while ([0, 6].includes(at(k).getDay())) k = addDays(k, 1); return k; };
  /** the Monday of this day's week (weeks start Monday) */
  const monday = key => addDays(key, -((at(key).getDay() + 6) % 7));

  /** should the lobby nudge today? (pure: reads the saved data, changes nothing) */
  function status(today = dayKey()) {
    const r = rec(), total = A.store.allStars('*'), since = r.savedAt || '';
    const newStars = Math.max(0, total - (since ? (+r.starsAtSave || 0) : 0));
    const log = A.store.activity;
    const days = Object.keys(log).filter(k => k > since && k <= today && (log[k].s || 0) > 0).length;
    const unsaved = newStars > 0 || days > 0;
    const brk = NUDGE.breaks.includes(today) || NUDGE.breaks.includes(nextSchoolDay(today));
    let kind = null;
    if (unsaved) {
      if (brk) kind = 'break';
      else if (!since) { if (total >= NUDGE.firstAfterStars || days >= NUDGE.days) kind = 'new'; }
      else if (newStars >= NUDGE.stars || days >= NUDGE.days) kind = 'stars';
    }
    const shown = (r.shown || []).filter(k => k >= monday(today) && k < today);
    let why = !unsaved ? 'nothing new' : !kind ? 'under the thresholds' : '';
    if (kind && r.snoozeUntil && today < r.snoozeUntil) why = 'snoozed';
    // the weekly limit: a day it already showed may show again (until saved or "Not now"); a break nudge always may
    else if (kind && kind !== 'break' && !(r.shown || []).includes(today) && shown.length >= NUDGE.maxPerWeek) why = 'this week';
    return {kind, show: !!kind && !why, why, newStars, days, total, savedAt: r.savedAt || null};
  }

  /* ---------- the banner (FLAT HTML/CSS in #saveNudge, under the lobby cards; styles .bn-* in arcade.css) ---------- */
  const DISK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 3.5h11.8l3.2 3.2v12.8a1 1 0 0 1-1 1h-14a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z"/>' +
    '<path d="M7.5 3.5v5h7.5v-5M12.2 5.2v1.8"/><rect x="7" y="13" width="10" height="7.5" rx=".8"/><path d="M9.5 15.6h5M9.5 18h5"/></svg>';
  const slot = () => document.getElementById('saveNudge');
  let faded = false, wait = null;
  const ios = () => A.App ? A.App.ios : /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installed = () => A.App ? A.App.standalone : navigator.standalone === true;
  /** a panel, PRESS START or pick mode on top: the banner waits (never on top of play or a question) */
  function busy() {
    const ps = document.getElementById('pressStart'), lobby = document.getElementById('lobby');
    if (!lobby || lobby.hidden || (ps && !ps.hidden) || document.body.classList.contains('in-select')) return true;
    if (A.UI && ((A.UI.isOpen && A.UI.isOpen()) || (A.UI.layer && A.UI.layer.top && A.UI.layer.top()))) return true;
    return [...document.querySelectorAll('body > .overlay')].some(o => !o.hidden && getComputedStyle(o).display !== 'none');
  }
  function message(s) {
    if (s.kind === 'break') return '<b>Break is coming!</b> Save your progress so nothing gets lost.';
    if (s.kind === 'new') return '<b>Keep your stars safe:</b> make a Backup Code.';
    return s.newStars > 0
      ? `<b>Save your progress!</b> You've earned ${s.newStars} <span aria-hidden="true">★</span><span class="sr">stars</span> since your last backup.`
      : `<b>Save your progress!</b> You've played on ${s.days} days since your last backup.`;
  }
  function refresh() {
    const box = slot();
    if (!box || !A.store) return;
    clearTimeout(wait); wait = null;
    if (!A.store.player) { box.innerHTML = ''; return; }
    const s = status();
    if (!s.show) { box.innerHTML = ''; return; }
    if (busy()) { box.innerHTML = ''; wait = setTimeout(refresh, 1000); return; }      // try again once the panel closes
    const r = rec(), today = dayKey();
    if (!(r.shown || []).includes(today)) { r.shown = (r.shown || []).concat(today).slice(-10); put(); }
    const tip = (s.kind === 'new' || s.kind === 'break') && ios() && !installed();
    const card = box.querySelector('.bn-card');
    const html = `<span class="bn-icon">${DISK}</span>` +
      `<div class="bn-text"><p class="bn-msg">${message(s)}</p>` +
      (tip ? `<p class="bn-tip">Tip: Add Band Arcade to your Home Screen so iPad keeps your progress.</p>` : '') + `</div>` +
      `<div class="bn-acts"><button type="button" class="btn btn-primary bn-save">Save now</button>` +
      (tip ? `<button type="button" class="btn btn-secondary bn-how">Show me how</button>` : '') +
      `<button type="button" class="btn btn-secondary bn-later">Not now</button></div>`;
    if (card && card.dataset.kind === s.kind && card.innerHTML === html) return;          // nothing changed: no new fade
    box.innerHTML = `<div class="bn-card bn-${s.kind}${faded ? '' : ' bn-in'}" data-kind="${s.kind}">${html}</div>`;
    faded = true;
    const $ = q => box.querySelector(q);
    $('.bn-save').addEventListener('click', saveNow);
    $('.bn-later').addEventListener('click', () => {
      if (A.Sfx) A.Sfx.event('ui-toggle');
      const r = rec(); r.snoozeUntil = addDays(dayKey(), NUDGE.snoozeDays); put();
      box.innerHTML = '';
      const z = document.querySelector('#zones .zsign'); if (z) z.focus({preventScroll: true});   // the focus stays in the lobby
    });
    if (tip) $('.bn-how').addEventListener('click', () => { if (A.App && A.App.install) A.App.install(); });
  }
  /** SAVE NOW: the backup panel, its code made and ready to copy (backup.js may load on demand: Arcade.need) */
  function saveNow() {
    const ready = A.need ? A.need(['shared/backup.js']) : Promise.resolve();
    Promise.resolve(ready).then(() => { if (A.Backup) A.Backup.open({make: true}); });
  }
  /** the student saved (Copy, SAVE TO FILE) or restored a Backup Code: nothing is unsaved now */
  function saved({restored = false} = {}) {
    if (!A.store) return;
    const r = rec();
    r.savedAt = dayKey(); r.starsAtSave = A.store.allStars('*'); r.snoozeUntil = null;
    put();
    if (restored) return;                                     // the page reloads onto the restored progress
    const box = slot();
    if (box) box.innerHTML = '';
    if (A.UI && A.UI.toast) A.UI.toast('Saved! Keep that code somewhere safe 💾', {kind: 'good', ms: 3000});
  }
  if (document.getElementById('lobby')) {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    addEventListener('storage', e => { if (!e.key || e.key === 'bandarcade.v1') refresh(); });
  }

  A.BackupNudge = {NUDGE, status, refresh, saved, nextSchoolDay, monday};
})(window.Arcade);
