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
   NEVER EDIT VERSION BY HAND: in the repository it stays 'dev', which switches all of this off (opening a page from
   a file, python3 -m http.server…); the deploy stamps the real one. */
window.Arcade = window.Arcade || {};
window.Arcade.VERSION = 'dev';
(function (A) {
  "use strict";
  const on = () => A.VERSION && A.VERSION !== 'dev';
  /** a file address with this version added (unchanged in 'dev'), for files loaded by code */
  A.v = function (url) {
    if (!on() || !url || /^(data|blob):/.test(url)) return url;
    return url + (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + encodeURIComponent(A.VERSION);
  };
  /** baked = the version this page's HTML was deployed with. An older page (from a browser's cache) reloads once,
      with ?v=<new version> in its address so the browser has to fetch fresh HTML; the rest of the old page is never
      run (it's turned into hidden text). Never loops: a page already asked for with this version stays. */
  A.checkVersion = function (baked) {
    if (!on() || baked === 'dev' || baked === A.VERSION) return;
    const v = encodeURIComponent(A.VERSION), had = /[?&]v=([^&#]*)/.exec(location.search);
    if (had && had[1] === v) return;                  // already reloaded once (the server may still be updating)
    const rest = location.search.replace(/([?&])v=[^&#]*&?/, '$1').replace(/[?&]$/, '');   // every other flag kept as written
    A.reloading = true;
    location.replace(location.pathname + (rest ? rest + '&' : '?') + 'v=' + v + location.hash);
    document.write('<plaintext hidden>');               // stop here: none of the old page's scripts run
  };
})(window.Arcade);
