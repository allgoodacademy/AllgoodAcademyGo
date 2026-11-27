/* ============================================================================
   ALLGOOD ACADEMY — ADJUSTABLE TIME LIMITS
   WCAG 2.2.1 Timing Adjustable. AA-6, 2026-11-27.

   Every countdown on the site that ends, locks or auto-picks a student action
   runs through AGTime.countdown(), so each one can be extended or turned off:

   SOLO (a student on their own device)
     - A small "Turn off timer" button sits beside the countdown. Turning it off
       is remembered for the visit (sessionStorage 'ag-no-timer'; if storage is
       blocked it just lasts for this page) and applies to every timed activity.
     - From 20 seconds before the end (or from the start, if the whole timer is
       shorter than that) a "Need more time?" prompt offers "+ more time". Each
       tap adds the timer's full length again. There is no cap on taps.
   PRESENT (a teacher projecting: URL #present or ?present=1, or body.present)
     - The teacher controls the timer: Pause / Resume, +30s and Timer off. The
       student prompt is not shown.
   Untouched, a timer behaves exactly as it always has; the prompt is the only
   new thing a student sees.

   USAGE
     var t = AGTime.countdown({
       seconds: 30,                 // the limit
       mount: element,              // where the controls go (appended inside it)
       tickMs: 1000,                // how often onTick fires (default 1000)
       onTick: function (s) {},     // s = { elapsed, left, total, off } (seconds)
       onExpire: function () {},    // the page's existing time-up behaviour
       endLabel: 'Stop the feed',   // optional: with the timer off, a button
                                    // that runs onExpire when the student is ready
       theme: 'dark' | 'light'      // optional; default light
     });
     t.stop();                      // student acted; removes the controls
     t.pause(); t.resume(); t.extend(seconds); t.turnOff();
   With the timer off, onTick still fires (off: true, left: Infinity) so the
   page can keep scripted events moving and hide its bar; onExpire never fires
   by itself.

   No telemetry: nothing about these controls is recorded.
   ============================================================================ */
(function () {
  'use strict';
  var KEY = 'ag-no-timer';
  var memoryOff = false;

  function storedOff() {
    try { return window.sessionStorage.getItem(KEY) === '1'; } catch (e) { return memoryOff; }
  }
  function storeOff(on) {
    memoryOff = !!on;
    try {
      if (on) window.sessionStorage.setItem(KEY, '1');
      else window.sessionStorage.removeItem(KEY);
    } catch (e) {}
  }
  function isPresent() {
    try {
      if (/(^#|&)present(=1)?(&|$)/.test(location.hash)) return true;
      if (/[?&]present(=1|=true)?(&|$)/.test(location.search)) return true;
      return !!(document.body && document.body.classList.contains('present'));
    } catch (e) { return false; }
  }

  var CSS = '' +
    '.agt{font-family:var(--font-ui,inherit);font-size:13px;line-height:1.4;margin:10px 0;width:100%;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px}' +
    '.agt button{font:inherit;font-weight:700;min-height:32px;padding:5px 12px;border-radius:999px;cursor:pointer}' +
    '.agt .agt-quiet{background:transparent;border:1.5px solid currentColor;color:inherit}' +
    '.agt-light{color:var(--color-ink-soft,#5C6E75)}' +
    '.agt-dark{color:rgba(255,255,255,.85)}' +
    '.agt .agt-state{font-weight:700}' +
    '.agt-ask{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:10px;background:var(--color-surface,#fff);color:var(--color-ink,#17272C);' +
      'border:2px solid var(--color-orange-deep,#B23A0F);border-radius:12px;padding:8px 12px}' +
    '.agt-ask[hidden]{display:none}' +
    '.agt-ask strong{font-weight:700}' +
    '.agt .agt-more{background:var(--color-teal-deep,#2D6473);border:0;color:#fff}' +
    '.agt button:focus-visible{outline:3px solid var(--color-orange,#CF4616);outline-offset:2px}' +
    '.agt-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}';
  function injectCss() {
    if (document.getElementById('agt-css')) return;
    var st = document.createElement('style');
    st.id = 'agt-css';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(cls, text) { var b = el('button', cls, text); b.type = 'button'; return b; }

  function countdown(opts) {
    opts = opts || {};
    var total = Math.max(1, +opts.seconds || 30);
    var base = total;
    var tickMs = +opts.tickMs || 1000;
    var present = isPresent();
    var off = storedOff();
    var paused = false, done = false;
    var elapsedMs = 0, last = Date.now(), iv = null;
    var warnAt = Math.min(20, total);

    // --- controls --------------------------------------------------------
    injectCss();
    var box = el('div', 'agt ' + (opts.theme === 'dark' ? 'agt-dark' : 'agt-light'));
    box.setAttribute('data-agt', '');
    var live = el('span', 'agt-sr');
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    var state = el('span', 'agt-state');
    var offBtn = btn('agt-quiet', present ? 'Timer off' : 'Turn off timer');
    var pauseBtn = present ? btn('agt-quiet', 'Pause') : null;
    var plus30 = present ? btn('agt-quiet', '+30s') : null;
    var endBtn = opts.endLabel ? btn('agt-quiet', opts.endLabel) : null;
    var ask = el('div', 'agt-ask');
    ask.hidden = true;
    var askText = el('span', null);
    askText.appendChild(el('strong', null, 'Need more time? '));
    var askLeft = el('span', null, '');
    askText.appendChild(askLeft);
    var moreBtn = btn('agt-more', '+ more time');
    ask.appendChild(askText);
    ask.appendChild(moreBtn);

    box.appendChild(state);
    if (pauseBtn) box.appendChild(pauseBtn);
    if (plus30) box.appendChild(plus30);
    box.appendChild(offBtn);
    if (endBtn) box.appendChild(endBtn);
    if (!present) box.appendChild(ask);
    box.appendChild(live);
    if (opts.mount) opts.mount.appendChild(box);

    function left() { return Math.max(0, total - elapsedMs / 1000); }
    function say(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 30); }
    function render() {
      if (done) return;
      var l = Math.ceil(left());
      if (off) {
        state.textContent = 'Timer off';
        offBtn.hidden = true;
        if (pauseBtn) pauseBtn.hidden = true;
        if (plus30) plus30.hidden = true;
        ask.hidden = true;
        if (endBtn) endBtn.hidden = false;
        return;
      }
      if (endBtn) endBtn.hidden = true;
      state.textContent = paused ? 'Paused · ' + l + 's left' : l + 's left';
      if (pauseBtn) pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      var showAsk = !present && l <= warnAt && l > 0;
      if (showAsk && ask.hidden) say('Need more time? ' + l + ' seconds left. You can add more time or turn the timer off.');
      ask.hidden = !showAsk;
      askLeft.textContent = l + 's left.';
    }
    function tick() {
      var now = Date.now();
      if (!paused && !done) elapsedMs += now - last;
      last = now;
      if (done) return;
      var l = left();
      if (typeof opts.onTick === 'function') {
        try { opts.onTick({ elapsed: elapsedMs / 1000, left: off ? Infinity : l, total: off ? Infinity : total, off: off, paused: paused }); } catch (e) {}
      }
      render();
      if (!off && !paused && l <= 0) expire();
    }
    function expire() {
      if (done) return;
      stop();
      if (typeof opts.onExpire === 'function') opts.onExpire();
    }
    function stop() {
      done = true;
      if (iv) clearInterval(iv);
      iv = null;
      if (box.parentNode) box.parentNode.removeChild(box);
    }
    function extend(s) {
      if (done) return;
      total += Math.max(1, +s || base);
      render();
      say('Added time. ' + Math.ceil(left()) + ' seconds left.');
    }
    function turnOff() {
      if (done) return;
      off = true;
      storeOff(true);
      say('Timer off. Take as long as you need.');
      tick();
      if (endBtn) { try { endBtn.focus(); } catch (e) {} }
    }

    moreBtn.addEventListener('click', function () { extend(base); });
    offBtn.addEventListener('click', turnOff);
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      paused = !paused; last = Date.now(); render();
      say(paused ? 'Timer paused.' : 'Timer running.');
    });
    if (plus30) plus30.addEventListener('click', function () { extend(30); });
    if (endBtn) endBtn.addEventListener('click', expire);

    iv = setInterval(tick, tickMs);
    // First paint straight away (the old timers drew their full bar on start).
    setTimeout(tick, 0);

    return {
      stop: stop,
      pause: function () { paused = true; last = Date.now(); render(); },
      resume: function () { paused = false; last = Date.now(); render(); },
      extend: extend,
      turnOff: turnOff,
      isOff: function () { return off; },
      left: left,
      elapsed: function () { return elapsedMs / 1000; }
    };
  }

  window.AGTime = {
    countdown: countdown,
    isOff: storedOff,
    setOff: storeOff,
    isPresent: isPresent
  };
})();
