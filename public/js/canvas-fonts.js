/* ============================================================================
   ALLGOOD ACADEMY — CANVAS TEXT WAITS FOR THE WEB FONTS
   AA-6, 2026-11-27. Loaded in <head> on the pages that draw text on a <canvas>
   (the four simulations and Take the Bait).

   HTML text can swap fonts in place; canvas text cannot. Whatever font is
   available at the moment of fillText() is baked into the pixels, so on a cold
   cache the first frames of a sim were drawn in Verdana/Georgia and stayed that
   way until something redrew. This:

     1. hides every <canvas> on the page (visibility only; layout is unchanged
        and the sim's own code keeps running) until Gelasio and Atkinson
        Hyperlegible Next have loaded, or 1.5 seconds have passed, whichever
        comes first. A font that fails or is slow never blocks the sim: after
        1.5s it shows in the fallback face, as before;
     2. then shows the canvases and calls every AGFonts.ready(fn) callback, so a
        sim that only draws on demand can redraw once with the right font. Sims
        with a running animation loop pick the font up on their next frame.

   Without document.fonts (very old browsers) it does nothing.
   ============================================================================ */
(function () {
  'use strict';
  var FONTS = [
    '400 16px "Atkinson Hyperlegible Next"',
    '700 16px "Atkinson Hyperlegible Next"',
    '400 16px "Gelasio"',
    '700 16px "Gelasio"'
  ];
  var html = document.documentElement;
  var done = false;
  var queue = [];

  function finish() {
    if (done) return;
    done = true;
    html.removeAttribute('data-ag-fonts');
    var q = queue; queue = [];
    q.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  window.AGFonts = {
    ready: function (fn) { if (done) { try { fn(); } catch (e) {} } else queue.push(fn); },
    isReady: function () { return done; }
  };

  if (!document.fonts || typeof document.fonts.load !== 'function') { done = true; return; }

  html.setAttribute('data-ag-fonts', 'wait');
  try {
    var st = document.createElement('style');
    st.textContent = 'html[data-ag-fonts="wait"] canvas{visibility:hidden}';
    (document.head || html).appendChild(st);
  } catch (e) {}
  setTimeout(finish, 1500);

  // fonts.css may be linked after this script, and document.fonts.load() on a face
  // that isn't declared yet resolves at once with nothing. So ask once the
  // stylesheets have been parsed.
  function load() {
    Promise.all(FONTS.map(function (f) { return document.fonts.load(f); }))
      .then(function () { return document.fonts.ready; })
      .then(finish, finish);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
