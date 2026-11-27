/* ============================================================================
   ALLGOOD ACADEMY — REDUCED MOTION (site-wide)
   WCAG 2.1 2.3.3 Animation from Interactions / 2.2.2 Pause, Stop, Hide. AA-6.

   Load it in <head>, before any page script, on every page:
     <script src="/js/reduced-motion.js"></script>

   When the visitor's OS asks for reduced motion (prefers-reduced-motion: reduce)
   this does the parts CSS cannot reach. The CSS half is the @media block at the
   bottom of /assets/css/design-tokens.css, which ends every CSS animation and
   transition on its last frame (so anything that animates IN still shows).

     1. Smooth JS scrolling becomes an instant jump. scrollIntoView / scrollTo /
        scrollBy calls asking for behavior:'smooth' are given behavior:'auto'.
        CSS scroll-behavior cannot override a script's explicit 'smooth'.
     2. SVG (SMIL) animation, which CSS `animation:none` never touches:
          - a looping <animate>/<animateMotion>/<animateTransform> is removed, so
            the shape sits still at its base value;
          - a one-shot animation that freezes on its end value (fill="freeze", e.g.
            a bar chart drawing in) is replaced by that end value, so the
            information it reveals is there at once.
        Runs on load and again whenever a page inserts new SVG (scenes rendered
        with innerHTML).
     3. Web Animations (element.animate, unused today) run for 1ms, once, so a
        future one cannot loop.

   Pages read window.AG_REDUCED_MOTION (true/false) for their own canvas and
   JS-timed motion: show the end state instead of animating towards it.

   No dependencies. Everything is wrapped so a browser that lacks a feature
   just keeps the page's normal behaviour.
   ============================================================================ */
(function () {
  'use strict';
  var reduced = false;
  try { reduced = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  window.AG_REDUCED_MOTION = reduced;
  if (!reduced) return;

  // 1. Smooth scrolling → instant ------------------------------------------
  function instant(opts) {
    if (opts && typeof opts === 'object' && opts.behavior === 'smooth') {
      var copy = {};
      for (var k in opts) copy[k] = opts[k];
      copy.behavior = 'auto';
      return copy;
    }
    return opts;
  }
  try {
    var siv = Element.prototype.scrollIntoView;
    if (siv) Element.prototype.scrollIntoView = function (opts) {
      return arguments.length ? siv.call(this, instant(opts)) : siv.call(this);
    };
    ['scrollTo', 'scrollBy'].forEach(function (name) {
      var w = window[name];
      if (typeof w === 'function') window[name] = function (a) {
        return (a && typeof a === 'object') ? w.call(window, instant(a)) : w.apply(window, arguments);
      };
      var el = Element.prototype[name];
      if (typeof el === 'function') Element.prototype[name] = function (a) {
        return (a && typeof a === 'object') ? el.call(this, instant(a)) : el.apply(this, arguments);
      };
    });
  } catch (e) {}

  // 2. SVG (SMIL) animation ------------------------------------------------
  var SMIL = 'animate, animateMotion, animateTransform, set';
  function endValue(a) {
    if (a.hasAttribute('to')) return a.getAttribute('to');
    var vals = a.getAttribute('values');
    if (vals) { var list = vals.split(';'); return list[list.length - 1].trim(); }
    return null;
  }
  function still(a) {
    try {
      var looping = a.getAttribute('repeatCount') === 'indefinite' || a.getAttribute('repeatDur') === 'indefinite';
      var target = a.hasAttribute('href') || a.hasAttribute('xlink:href')
        ? document.getElementById((a.getAttribute('href') || a.getAttribute('xlink:href')).replace(/^#/, ''))
        : a.parentNode;
      var attr = a.getAttribute('attributeName');
      // A looping motion path (a plane flying a route): removing it would drop the shape
      // at the SVG's origin, so it is parked instead, still, 80% of the way along.
      if (looping && a.localName === 'animateMotion' && a.ownerSVGElement) {
        if (a.getAttribute('data-ag-still')) return;
        a.setAttribute('data-ag-still', '1');
        var svg = a.ownerSVGElement;
        var dur = parseFloat(a.getAttribute('dur')) || 0;
        if (/ms$/.test(a.getAttribute('dur') || '')) dur = dur / 1000;
        var park = function () { try { svg.setCurrentTime(dur * 0.8); svg.pauseAnimations(); } catch (e) {} };
        park();
        setTimeout(park, 0);
        return;
      }
      if (!looping && a.getAttribute('fill') === 'freeze' && target && attr && a.localName !== 'animateMotion') {
        var v = endValue(a);
        if (v !== null) {
          if (a.localName === 'animateTransform') {
            var type = a.getAttribute('type') || 'translate';
            target.setAttribute('transform', ((target.getAttribute('transform') || '') + ' ' + type + '(' + v + ')').trim());
          } else {
            target.setAttribute(attr, v);
          }
        }
      }
      if (a.parentNode) a.parentNode.removeChild(a);
    } catch (e) {}
  }
  function sweep(root) {
    try {
      if (root.matches && root.matches(SMIL)) { still(root); return; }
      if (root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll(SMIL), still);
    } catch (e) {}
  }
  function start() {
    sweep(document);
    try {
      new MutationObserver(function (records) {
        records.forEach(function (r) {
          Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) sweep(n); });
        });
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // 3. Web Animations: 1ms, one iteration -----------------------------------
  try {
    var anim = Element.prototype.animate;
    if (typeof anim === 'function') Element.prototype.animate = function (frames, opts) {
      var o = {};
      if (typeof opts === 'number') o.duration = opts;
      else if (opts && typeof opts === 'object') for (var k in opts) o[k] = opts[k];
      o.duration = 1;
      o.delay = 0;
      if (!o.iterations || o.iterations === Infinity) o.iterations = 1;
      return anim.call(this, frames, o);
    };
  } catch (e) {}
})();
