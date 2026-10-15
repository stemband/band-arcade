/* PEDAL POINT: THE SAMPLE TUNER (pedal-point/index.html?tune-samples). Mr. Graham's page, not linked for students
   (the Sound Board's Pedal Point row links it). Every recorded take in samples.js, grouped by pitch: ▶ DRUM (the take
   at its own rate), ▶ PIPE (the pitch pipe at the row's hz), ▶ BOTH (the drum, then the pipe 0.3 s later under its
   ring), the hz with its nearest note ± cents, and −5 / −1 / +1 / +5 cent nudges. Nudge until the drum and the pipe
   sound in tune, then COPY CHANGED LINES and paste them over the same lines in pedal-point/samples.js (or give them to
   Claude Code). NOTHING IS SAVED: leaving the page forgets the nudges. Every sound goes through timpani.js (the audio
   rules: SOUND OFF, the EFFECTS slider, never while a microphone listens). Arcade.PPTuner = {open(), state()}. */
(function (A) {
  'use strict';
  const {$} = A;
  const T = A.Timpani, D = A.PPDrums;
  const BOTH_GAP_MS = 300, PIPE_SEC = 2.5;
  const rows = T.samples.map(s => ({s, orig: s.hz, nudge: 0}));
  let source = null;                                       // samples.js's own text (each line's VCSL comment)
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const MINUS = '−';
  const noteOf = hz => { const m = 69 + 12 * Math.log2(hz / 440), r = Math.round(m), c = (m - r) * 100; return {name: D.label(r), c}; };
  const token = file => (/^timp-([a-g][bs]?\d)-/.exec(file) || [])[1] || '?';
  const tokenName = t => t === '?' ? '?' : t[0].toUpperCase() + (t[1] === 'b' ? '♭' : t[1] === 's' ? '♯' : '') + t.slice(-1);
  const hzOf = r => r.orig * Math.pow(2, r.nudge / 1200);
  const changed = () => rows.filter(r => r.nudge !== 0);

  /** a ready-to-paste PP_SAMPLES line (the same format; the VCSL comment kept from samples.js) */
  function line(r) {
    const s = r.s, hz = hzOf(r).toFixed(2);
    const m = source && new RegExp(`^(\\s*\\['${s.file}',\\s*)[0-9.]+(,.*)$`, 'm').exec(source);
    if (m) return m[1] + hz + m[2];
    return `    ['${s.file}', ${hz}, '${s.layer}', ${s.sec.toFixed(2)}],`;
  }
  const lines = () => changed().map(line).join('\n');

  function draw() {
    const groups = [];
    rows.forEach((r, i) => { const t = token(r.s.file); let g = groups[groups.length - 1]; if (!g || g.t !== t) groups.push(g = {t, list: []}); g.list.push(i); });
    $('tunerList').innerHTML = groups.map(g => `<h3 class="ui-section tn-pitch">${tokenName(g.t)}</h3>` + g.list.map(i => {
      const r = rows[i];
      return `<div class="tn-row" data-i="${i}"><span class="tn-file">${esc(r.s.file)} <small>${r.s.layer}</small></span>
        <span class="tn-play"><button type="button" class="btn btn-secondary btn-small" data-act="drum">▶ Drum</button><button type="button" class="btn btn-secondary btn-small" data-act="pipe">▶ Pipe</button><button type="button" class="btn btn-secondary btn-small" data-act="both">▶ Both</button></span>
        <span class="tn-hz" data-hz></span>
        <span class="tn-nudge"><button type="button" class="btn btn-secondary btn-small" data-c="-5">${MINUS}5</button><button type="button" class="btn btn-secondary btn-small" data-c="-1">${MINUS}1</button><button type="button" class="btn btn-secondary btn-small" data-c="1">+1</button><button type="button" class="btn btn-secondary btn-small" data-c="5">+5</button></span></div>`;
    }).join('')).join('');
    rows.forEach((r, i) => drawRow(i));
    drawBottom();
  }
  function drawRow(i) {
    const r = rows[i], el = $('tunerList').querySelector(`.tn-row[data-i="${i}"]`); if (!el) return;
    const hz = hzOf(r), n = noteOf(hz), c = Math.round(n.c);
    el.querySelector('[data-hz]').innerHTML = `<b>${hz.toFixed(2)} Hz</b> ${n.name} ${c > 0 ? '+' : c < 0 ? MINUS : '±'}${Math.abs(c)}¢` +
      (r.nudge ? ` <em>(${r.nudge > 0 ? '+' : MINUS}${Math.abs(r.nudge)}¢ from ${r.orig.toFixed(2)})</em>` : '');
    el.classList.toggle('tn-changed', r.nudge !== 0);
    el.querySelectorAll('[data-act="drum"],[data-act="both"]').forEach(b => { b.disabled = !r.s.buf; });
  }
  function drawBottom() {
    const n = changed().length, st = T.samplesState(), got = T.test.samples();
    $('tunerCount').textContent = `changed: ${n}`;
    $('tunerCopy').disabled = !n;
    $('tunerStatus').textContent = st === 'missing' ? 'The recorded drums could not load here (no files in shared/sounds/timpani/, offline, or a double-clicked page). ▶ PIPE still works.'
      : st === 'ready' ? `${got.loaded} of ${got.total} takes loaded.` : `Loading the recorded drums… ${got.loaded} of ${got.total}. (Tap anywhere first: the browser needs a tap before any sound.)`;
  }

  let both = 0;
  function act(i, what) {
    const r = rows[i]; clearTimeout(both);
    T.stopAll();
    if (what === 'drum' || what === 'both') T.playSample(r.s.file);
    if (what === 'pipe') T.pipe(hzOf(r), {sec: PIPE_SEC});
    if (what === 'both') both = setTimeout(() => T.pipe(hzOf(r), {sec: PIPE_SEC}), BOTH_GAP_MS);
  }
  function nudge(i, c) { const r = rows[i]; r.nudge += c; r.s.hz = hzOf(r); drawRow(i); drawBottom(); }
  function copy() {
    const text = lines();
    $('tunerOut').value = text; $('tunerOut').hidden = !text;
    $('tunerOut').select();
    let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).catch(() => {}); ok = true; } } catch (e) {}
    try { if (!ok) ok = document.execCommand('copy'); } catch (e) {}
    $('tunerCopied').textContent = ok ? 'Copied. Paste them over the same lines in pedal-point/samples.js.' : 'Select the lines below and copy them.';
  }

  function open() {
    ['hub', 'play', 'modeRow', 'practice'].forEach(id => { const el = $(id); if (el) el.hidden = true; });
    $('tuner').hidden = false;
    A.Sfx.gameMenuMusic('pedal-point', false);
    // PRESS START's tap would start the menu music: this page wants quiet
    const quiet = () => setTimeout(() => A.Sfx.gameMenuMusic('pedal-point', false), 60);
    addEventListener('pointerdown', quiet, {once: true, capture: true}); addEventListener('keydown', quiet, {once: true, capture: true});
    T.preload();
    T.onSamples(() => { rows.forEach((r, i) => drawRow(i)); drawBottom(); });
    const tick = setInterval(() => { rows.forEach((r, i) => drawRow(i)); drawBottom(); if (T.samplesState() !== 'loading' && T.samplesState() !== 'idle') clearInterval(tick); }, 500);
    $('tunerList').addEventListener('click', e => {
      const b = e.target.closest('button'), row = e.target.closest('.tn-row'); if (!b || !row) return;
      const i = +row.dataset.i;
      if (b.dataset.act) act(i, b.dataset.act); else if (b.dataset.c) nudge(i, +b.dataset.c);
    });
    $('tunerCopy').addEventListener('click', copy);
    try { fetch(A.v ? A.v('samples.js') : 'samples.js').then(r => r.ok ? r.text() : null).then(t => { if (t) source = t; }, () => {}); } catch (e) {}
    draw();
  }

  A.PPTuner = {
    open,
    state: () => ({rows: rows.map(r => ({file: r.s.file, hz: hzOf(r), orig: r.orig, nudge: r.nudge, loaded: !!r.s.buf})), changed: changed().length, lines: lines(), source: !!source}),
  };
})(window.Arcade);
