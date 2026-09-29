/* Band Arcade: THE APP (install it to the Home Screen, play offline). Loaded on every page by shared/version.js,
   right after the version check, in the <head> (so it runs before everything else and never waits for the page).

   - THE OFFLINE COPY: registers sw.js (the site root) on the DEPLOYED site only. In the repository ('dev': a
     double-clicked file, python3 -m http.server) there's no service worker at all, and a leftover one is removed.
   - UPDATES: sw.js checks for a new version on every page load, when the app comes back on screen, and every 30
     minutes. The new version downloads in the background. If this page already IS that version (the usual case:
     pages are always fetched fresh), it quietly takes over. If this page is OLDER (the app was left open), a small
     banner says "New version ready — tap to update": the tap reloads onto the new version. Ignored, it's applied
     the next time the app opens. One page never mixes two versions (see sw.js).
   - INSTALL HELP: Arcade.App.installButton(el) (the floor's sound panel) = INSTALL THE APP, only when
     Arcade.TEACHER.SHOW_INSTALL_PROMPT is true (shared/teacher-settings.js) and not already in the app. Chrome /
     Chromebook: the browser's own install prompt; iPad / iPhone: the steps with pictures; else Chrome's menu steps.
   - BRING YOUR PROGRESS: on an iPad the Home Screen app keeps its OWN storage (nothing from Safari). The app's first
     launch on the floor (standalone, nothing saved yet) asks for a Backup Code first ("Start fresh" skips it).
     Arcade.App.welcome(then) (arcade.js, before CHOOSE YOUR INSTRUMENT) shows it and returns true, else false.
   - Arcade.App.standalone: running as the installed app (display-mode standalone, or iOS navigator.standalone).
   ?standalone (tests, previews) pretends to be the installed app. Arcade.App.state() for tests. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  const params = new URLSearchParams(location.search);
  const standalone = params.has('standalone') || navigator.standalone === true ||
    ['standalone', 'fullscreen', 'minimal-ui'].some(m => matchMedia(`(display-mode: ${m})`).matches);
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const http = /^https?:$/.test(location.protocol);
  const live = A.VERSION && A.VERSION !== 'dev';
  const ls = {get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }};
  const S = {standalone, ios, reg: null, waiting: null, banner: false, installEvent: null, installed: false, welcome: false, swError: null};

  // the app's first launch: read BEFORE any other script can save something (this file runs first)
  const WELCOME = 'bandarcade.app-welcome';
  if (standalone && ls.get(WELCOME) === null && ls.get('bandarcade.v1') === null && ls.get('ghostnotes.v1') === null) ls.set(WELCOME, 'ask');

  const onReady = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, {once: true}) : fn();
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  const sfx = n => { if (A.Sfx) A.Sfx.event(n); };

  /* ---------- the service worker + updates ---------- */
  function askVersion(w) {
    return new Promise(res => {
      const ch = new MessageChannel(), t = setTimeout(() => res(null), 1500);
      ch.port1.onmessage = e => { clearTimeout(t); res(e.data && e.data.version); };
      try { w.postMessage({type: 'version'}, [ch.port2]); } catch (e) { clearTimeout(t); res(null); }
    });
  }
  let reloadOnChange = false;
  async function waiting(w) {
    if (!w || S.waiting === w) return;
    S.waiting = w;
    const v = await askVersion(w);
    if (v && v === A.pageVersion) { w.postMessage({type: 'skip-waiting'}); return; }   // this page is already that version
    showBanner(w);
  }
  function showBanner(w) {
    onReady(() => {
      if (document.querySelector('.app-update')) return;
      const b = el('<button type="button" class="app-update" aria-live="polite">New version ready — tap to update</button>');
      b.addEventListener('click', () => {
        b.disabled = true; b.textContent = 'Updating…';
        reloadOnChange = true;
        w.postMessage({type: 'skip-waiting'});
        setTimeout(() => location.reload(), 4000);          // in case the takeover is never reported
      });
      document.body.appendChild(b);
      S.banner = true;
    });
  }
  function watch(reg) {
    S.reg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) waiting(reg.waiting);
    else if (reg.waiting) reg.waiting.postMessage({type: 'skip-waiting'});      // the very first copy: nothing to replace
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (w) w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) waiting(w);
      });
    });
    let last = Date.now();
    const check = () => { if (Date.now() - last > 60 * 1000) { last = Date.now(); reg.update().catch(() => {}); } };
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    setInterval(() => { last = 0; check(); }, 30 * 60 * 1000);
  }
  if (http && 'serviceWorker' in navigator && window.self === window.top) {
    const root = A.ROOT || new URL('./', location.href).href;
    if (live) {
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadOnChange) location.reload(); });
      navigator.serviceWorker.register(root + 'sw.js', {scope: root, updateViaCache: 'none'})
        .then(watch).catch(e => { S.swError = String(e && e.message || e); });
    } else {
      // 'dev': no offline copy; remove one left over from a test of a deployed copy at this same address
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => { if (r.scope === root) r.unregister(); })).catch(() => {});
    }
  }

  /* ---------- install help ---------- */
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvent = e; });   // offered only by our button
  addEventListener('appinstalled', () => { S.installed = true; S.installEvent = null; document.querySelectorAll('.app-install').forEach(b => b.remove()); });

  const shareIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M8 10H6v11h12V10h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const addIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const menuIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>';
  const installIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v7M9 11l3 3 3-3M8 20h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function panel(html, onClose) {
    const prev = document.activeElement;
    const ov = el(`<div class="overlay app-overlay"><div class="panel app-panel" role="dialog" aria-modal="true" aria-labelledby="appT">${html}</div></div>`);
    document.body.appendChild(ov);
    const close = () => { ov.remove(); removeEventListener('keydown', key, true); if (prev && prev.focus) prev.focus(); if (onClose) onClose(); };
    const key = e => { if (e.key === 'Escape' && !ov.dataset.noEsc) { e.stopPropagation(); close(); } };
    addEventListener('keydown', key, true);
    ov.addEventListener('click', e => { if (e.target === ov && !ov.dataset.noEsc) close(); });
    ov.querySelectorAll('.app-close').forEach(b => b.addEventListener('click', close));
    return {ov, close, $: s => ov.querySelector(s)};
  }

  function steps() {
    if (ios) return `<h2 id="appT">Install Band Arcade</h2>
      <ol class="app-steps">
        <li><span class="app-pic">${shareIcon}</span><span>Tap <b>Share</b> at the top of Safari.</span></li>
        <li><span class="app-pic">${addIcon}</span><span>Scroll down and tap <b>Add to Home Screen</b>.</span></li>
        <li><span class="app-pic app-pic-icon" style="background-image:url('${A.ROOT}shared/app/apple-touch-icon.png')"></span><span>Tap <b>Add</b>. Band Arcade is now on your Home Screen!</span></li>
      </ol>
      <p class="app-note"><b>Your progress:</b> the app keeps its own copy. First tap <b>Backup / Restore</b> here and copy your code, then paste it when the app opens.</p>`;
    return `<h2 id="appT">Install Band Arcade</h2>
      <ol class="app-steps">
        <li><span class="app-pic">${installIcon}</span><span>Click the <b>Install</b> icon at the right end of the address bar,</span></li>
        <li><span class="app-pic">${menuIcon}</span><span>or open Chrome's <b>⋮</b> menu → <b>Cast, save and share</b> → <b>Install page</b>.</span></li>
      </ol>
      <p class="app-note">The app opens full screen and works on weak Wi-Fi. Your progress comes with it.</p>`;
  }
  async function install() {
    sfx('ui-toggle');
    if (S.installEvent) {
      const e = S.installEvent; S.installEvent = null;
      try { e.prompt(); const c = await e.userChoice; if (c && c.outcome === 'accepted') S.installed = true; return; } catch (err) { /* fall through to the steps */ }
    }
    const p = panel(steps() + '<div class="acts"><button type="button" class="btn btn-primary app-close">Got it</button></div>');
    p.$('.app-close').focus();
  }
  function canOffer() { return !!(A.TEACHER && A.TEACHER.SHOW_INSTALL_PROMPT) && !standalone && http && !S.installed; }
  function installButton(host, cls = 'btn btn-secondary btn-small') {
    if (!host || !canOffer()) return null;
    const b = document.createElement('button');
    b.type = 'button'; b.className = cls + ' app-install'; b.textContent = 'Install the app';
    b.addEventListener('click', e => { e.stopPropagation(); install(); });
    host.appendChild(b);
    return b;
  }

  /* ---------- BRING YOUR PROGRESS (the app's first launch) ---------- */
  function welcome(then) {
    const ask = ls.get(WELCOME) === 'ask';
    if (!ask || !A.Backup || !A.store || A.store.player) { if (ask) ls.set(WELCOME, 'done'); return false; }
    S.welcome = true;
    const p = panel(`<h2 id="appT">Bring your progress</h2>
      <p class="app-lead">This app keeps its own copy of your stars. To bring them here:</p>
      <ol class="app-steps app-steps-small">
        <li><span class="app-num">1</span><span>Open Band Arcade in <b>Safari</b>.</span></li>
        <li><span class="app-num">2</span><span>Tap the speaker button → <b>Backup / Restore</b> → <b>Make my backup code</b> → <b>Copy</b>.</span></li>
        <li><span class="app-num">3</span><span>Come back here and paste it below.</span></li>
      </ol>
      <label class="bk-lbl" for="appCode">Your backup code</label>
      <textarea id="appCode" class="bk-in" rows="3" spellcheck="false" autocapitalize="characters" autocomplete="off"></textarea>
      <p class="bk-msg app-msg" role="alert"></p>
      <div class="acts"><button type="button" class="btn btn-primary app-restore">Bring my progress</button>
        <button type="button" class="btn btn-secondary app-fresh">Start fresh</button></div>`, null);
    p.ov.dataset.noEsc = '1';
    p.ov.classList.add('app-welcome');
    // typing and tapping here belong to this panel only (not PRESS START's "any key", not the floor's keys)
    ['keydown', 'pointerdown', 'click'].forEach(t => p.ov.addEventListener(t, e => e.stopPropagation()));
    const msg = (t, cls = '') => { const m = p.$('.app-msg'); m.textContent = t; m.className = 'bk-msg app-msg ' + cls; };
    p.$('.app-fresh').addEventListener('click', () => { ls.set(WELCOME, 'done'); S.welcome = false; sfx('ui-toggle'); p.close(); if (then) then(); });
    p.$('.app-restore').addEventListener('click', async () => {
      const res = await A.Backup.fullDecode(p.$('#appCode').value);
      if (!res.ok) { msg(res.error, 'bad'); sfx('note-wrong'); return; }
      if (!A.store.importAll(res.data)) { msg(A.Backup.BAD, 'bad'); return; }
      ls.set(WELCOME, 'done');
      msg('Welcome back! Loading your progress…', 'good'); sfx('ui-toggle');
      setTimeout(() => location.reload(), 700);
    });
    p.$('#appCode').focus();
    return true;
  }

  /* ---------- the microphone in the app ---------- */
  /** a line for the microphone panel (shared/mic-gate.js) when the mic won't start inside the Home Screen app */
  function micHelp() {
    if (!standalone) return '';
    return ios ? 'In the Home Screen app the microphone may be switched off. Open <b>Band Arcade in Safari</b> instead (your Backup Code brings your progress).'
      : 'If the microphone won’t start in the app, open Band Arcade in the browser instead.';
  }

  A.App = {
    standalone, ios, install, installButton, canOffer, welcome, micHelp,
    state: () => ({standalone, ios, live, registered: !!S.reg, controlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      waiting: !!S.waiting, banner: S.banner, installEvent: !!S.installEvent, welcome: S.welcome, ask: ls.get(WELCOME), swError: S.swError}),
  };
  if (standalone) document.documentElement.classList.add('app-standalone');
})(window.Arcade);
