/* Band Arcade — "Turn on the microphone" screen.
   Arcade.requireMic(fn): runs fn right away if the mic is on; otherwise shows the
   prompt, starts the mic on tap, then runs fn. Shows fix-it steps if the mic is blocked. */
window.Arcade = window.Arcade || {};
(function (A) {
  "use strict";
  let el = null, pending = null;

  function build() {
    el = document.createElement('div');
    el.className = 'overlay'; el.hidden = true;
    el.innerHTML = `
      <div class="panel" role="dialog" aria-modal="true" aria-labelledby="micGateTitle">
        <h2 id="micGateTitle">Turn on the microphone</h2>
        <p>The game listens to your instrument to check your notes. Nothing is recorded or saved.</p>
        <div class="err" hidden></div>
        <div class="acts">
          <button class="btn btn-gold" data-act="go">Turn on microphone</button>
          <button class="btn btn-ghost" data-act="cancel">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('[data-act="cancel"]').addEventListener('click', () => { el.hidden = true; pending = null; });
    el.querySelector('[data-act="go"]').addEventListener('click', go);
  }

  function finish() {
    el.hidden = true;
    const fn = pending; pending = null;
    if (fn) fn();
  }

  async function go() {
    const box = el.querySelector('.err');
    try {
      await A.Pitch.start();
      finish();
    } catch (e) {
      if (A.DEMO) { A.Pitch.demoReady = true; finish(); return; }
      box.hidden = false;
      const name = e && e.name;
      if (name === 'Insecure') {
        box.innerHTML = 'This page has to be opened from its <b>https://</b> link to use the microphone. Ask your director for the game link.';
      } else if (name === 'NotAllowedError' || name === 'SecurityError') {
        box.innerHTML = 'The microphone is blocked. To allow it:<ul>' +
          '<li><b>Chromebook:</b> click the camera/mic icon at the right end of the address bar, choose Allow, then reload.</li>' +
          '<li><b>iPad:</b> tap <b>aA</b> in the address bar → Website Settings → Microphone → Allow. If that is missing: Settings → Safari → Microphone → Allow.</li></ul>';
      } else if (name === 'NotFoundError') {
        box.textContent = 'No microphone was found on this device.';
      } else {
        box.textContent = 'The microphone could not start. Close other apps that use the mic and try again.';
      }
    }
  }

  A.requireMic = function (fn) {
    if (A.Pitch.active || A.Pitch.demoReady) return fn();
    if (!el) build();
    pending = fn;
    el.querySelector('.err').hidden = true;
    el.hidden = false;
    el.querySelector('[data-act="go"]').focus();
  };
})(window.Arcade);
