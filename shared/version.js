/* THE SITE VERSION: stops students from getting an old game (or a mix of old and new files) after an update.
   GitHub Pages lets browsers keep every file for about 10 minutes (school devices sometimes longer). So:
     - Every page asks for THIS file fresh on every load (version.js?t=<time>, the first script in each page's <head>).
     - The deploy workflow (.github/workflows/pages.yml) writes the commit's short id into VERSION below, and adds
       ?v=<that id> to every .js and .css file each page loads (tools/stamp-version.py). A new version = new file
       addresses, so browsers fetch every changed file at once instead of mixing old and new.
     - Each page's own copy of the version is in its Arcade.checkVersion('…') line. If the page itself came out of
       a browser's cache (older than this file), it reloads once with fresh HTML.
     - Pictures loaded by code (portraits, marquee art, Arcade Quest art, three.js) go through Arcade.v(url).
       Sounds keep their own SOUNDS_VERSION (top of sounds.js): they're big, so they only reload when Mat bumps it.
   THE APP (installable, offline): checkVersion also writes the page's app tags into its <head> (the manifest, the
   home-screen icon, the iPad "web app" tags) and loads shared/app.js (the service worker sw.js, the update banner,
   install help, the first-launch "Bring your progress" panel), so no page has to list them. A page that must not
   (the avatar card, shown inside other sites) has <meta name="arcade-app" content="off"> above its version lines.
   THE UI KIT: checkVersion also loads shared/ui-kit.css (before the page's own stylesheets, so a game can re-theme a
   piece) and shared/ui-kit.js (Arcade.UI: pause, results, settings, intro, confirm, toast) on every page, and
   shared/tokens.js (Arcade.Tokens: the shared wallet, whose line "+3 ★ = 15 tokens at the Prize Counter" every results
   screen shows).
   MOTION: Arcade.reducedMotion.matches is true when the device asks for less motion OR the Settings panel's Motion
   switch is off; html.no-motion is set here, before anything draws. Scripts read it instead of their own matchMedia.
   NEVER EDIT VERSION BY HAND: in the repository it stays 'dev', which switches all of this off (opening a page from
   a file, python3 -m http.server…); the deploy stamps the real one. */
window.Arcade = window.Arcade || {};
window.Arcade.VERSION = 'dev';
(function (A) {
  "use strict";
  const on = () => A.VERSION && A.VERSION !== 'dev';
  // the site's root folder, from this file's own address (…/shared/version.js?t=…)
  const me = document.currentScript && document.currentScript.src;
  A.ROOT = me ? me.replace(/shared\/version\.js(\?.*)?$/, '') : '';
  /** THE PLAY SESSION: things that happen once per play session (the "Turn on the microphone" reminder, Music
      Highway's first-song timing check). A session = from opening the arcade until the tab is closed or a page is
      RELOADED. The flags live in memory on Arcade.session; since every game is its own page, they're handed to the
      next page of the same tab through window.name (never localStorage/sessionStorage: nothing is stored, and it goes
      with the tab). A reload (the browser's reload, or pull-to-refresh) starts a new session. */
  A.session = (function () {
    const KEY = 'bandarcade-session:';
    let data = {};
    try {
      const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      const reload = nav ? nav.type === 'reload' : !!(performance.navigation && performance.navigation.type === 1);
      if (!reload && typeof window.name === 'string' && window.name.indexOf(KEY) === 0) data = JSON.parse(window.name.slice(KEY.length)) || {};
    } catch (e) { data = {}; }
    const keep = () => { try { window.name = KEY + JSON.stringify(data); } catch (e) {} };
    keep();
    return {
      /** has this happened yet in this play session? */
      has: k => !!data[k],
      /** mark it as done for the rest of the play session */
      mark(k) { data[k] = 1; keep(); },
      /** tests: forget everything (as a reload does) */
      reset() { data = {}; keep(); },
    };
  })();
  /** a file address with this version added (unchanged in 'dev'), for files loaded by code. It's the version the
      PAGE was deployed with (its checkVersion line), so everything a page loads belongs to one version, even when an
      old page is kept (offline, or a reload that didn't help). */
  A.v = function (url) {
    const ver = A.pageVersion || A.VERSION;
    if (!ver || ver === 'dev' || !url || /^(data|blob):/.test(url)) return url;
    return url + (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + encodeURIComponent(ver);
  };
  /** MOTION: the device's "reduce motion" OR the arcade's Motion switch (Settings; saved as gameData('bg').motion,
      which shared/storage.js keeps in localStorage 'bandarcade.v1'). Works like a MediaQueryList: .matches, and
      'change' listeners (called for both). */
  const mq = matchMedia('(prefers-reduced-motion: reduce)'), mlisteners = [];
  const switchOff = () => {
    try {
      if (A.store && A.store.gameData) return A.store.gameData('bg').motion === false;
      const d = JSON.parse(localStorage.getItem('bandarcade.v1') || 'null');
      return !!(d && d.gameData && d.gameData.bg && d.gameData.bg.motion === false);
    } catch (e) { return false; }
  };
  const syncClass = () => document.documentElement.classList.toggle('no-motion', switchOff());
  A.reducedMotion = {
    get matches() { return mq.matches || switchOff(); },
    get media() { return mq.media; },
    addEventListener(t, f) { if (t === 'change') mlisteners.push(f); },
    removeEventListener(t, f) { const i = mlisteners.indexOf(f); if (i >= 0) mlisteners.splice(i, 1); },
    addListener(f) { mlisteners.push(f); },
    removeListener(f) { this.removeEventListener('change', f); },
    /** the Motion switch changed (shared/ui-kit.js) */
    refresh() { syncClass(); const e = {matches: this.matches, media: mq.media}; mlisteners.slice().forEach(f => { try { f(e); } catch (x) { /* a listener's own problem */ } }); },
  };
  if (mq.addEventListener) mq.addEventListener('change', () => A.reducedMotion.refresh()); else if (mq.addListener) mq.addListener(() => A.reducedMotion.refresh());
  syncClass();
  /** THE APP TAGS (written once, right after the version check, while the <head> is still being read) */
  function appTags() {
    if (A.appTags || !A.ROOT) return;
    A.appTags = true;
    const off = document.querySelector('meta[name="arcade-app"][content="off"]');
    const R = A.ROOT, http = /^https?:/.test(location.protocol);
    let h = '';
    if (http) h += `<link rel="manifest" href="${R}manifest.webmanifest">`;          // file:// can't read a manifest
    h += `<link rel="apple-touch-icon" href="${R}shared/app/apple-touch-icon.png">` +
      '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">' +
      '<meta name="apple-mobile-web-app-title" content="Band Arcade">' +
      '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">';
    h += `<link rel="stylesheet" href="${A.v(R + 'shared/ui-kit.css')}"><script src="${A.v(R + 'shared/ui-kit.js')}"><\/script>`;
    h += `<script src="${A.v(R + 'shared/tokens.js')}"><\/script>`;              // THE SHARED WALLET (Arcade.Tokens): every page
    if (!off) h += `<script src="${A.v(R + 'shared/app.js')}"><\/script>`;
    document.write(h);
  }
  /** baked = the version this page's HTML was deployed with. An older page (from a browser's cache) reloads once,
      with ?v=<new version> in its address so the browser has to fetch fresh HTML; the rest of the old page is never
      run (it's turned into hidden text). Never loops: a page already asked for with this version stays. */
  A.checkVersion = function (baked) {
    if (baked && baked !== 'dev') A.pageVersion = baked;
    if (!on() || baked === 'dev' || baked === A.VERSION) return appTags();
    const v = encodeURIComponent(A.VERSION), had = /[?&]v=([^&#]*)/.exec(location.search);
    if (had && had[1] === v) return appTags();        // already reloaded once (the server may still be updating)
    const rest = location.search.replace(/([?&])v=[^&#]*&?/, '$1').replace(/[?&]$/, '');   // every other flag kept as written
    A.reloading = true;
    location.replace(location.pathname + (rest ? rest + '&' : '?') + 'v=' + v + location.hash);
    document.write('<plaintext hidden>');               // stop here: none of the old page's scripts run
  };
})(window.Arcade);
