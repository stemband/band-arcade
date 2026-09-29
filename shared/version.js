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
  /** a file address with this version added (unchanged in 'dev'), for files loaded by code. It's the version the
      PAGE was deployed with (its checkVersion line), so everything a page loads belongs to one version, even when an
      old page is kept (offline, or a reload that didn't help). */
  A.v = function (url) {
    const ver = A.pageVersion || A.VERSION;
    if (!ver || ver === 'dev' || !url || /^(data|blob):/.test(url)) return url;
    return url + (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + encodeURIComponent(ver);
  };
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
