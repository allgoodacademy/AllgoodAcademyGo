// Welcome video (K1): a click-to-load YouTube modal shared by the homepage and /for-teachers/.
//
// Privacy contract: nothing is requested from YouTube until a person presses the button.
// No thumbnail, no preconnect, no iframe in the markup. The poster behind the frame is our
// own /assets/dashboard/orbit.jpg (see welcome-video.css). On open we insert a
// youtube-nocookie.com iframe; on close we remove it, which is what stops playback.
//
// Markup on the page: <button type="button" data-welcome-video="home">…</button>
// (the attribute value is the GA "page" label). GA itself is the page's own gtag; this file
// only calls it if it is already there, so it never adds analytics to a page that has none.
(function () {
  'use strict';
  var VIDEO_ID = 'iJIFkJJiCcQ';
  var SRC = 'https://www.youtube-nocookie.com/embed/' + VIDEO_ID + '?autoplay=1&rel=0';
  var TITLE = 'Welcome to Allgood Academy: a quick tour for teachers';

  var dialog, frame, closeBtn, opener, savedOverflow, savedPadding;

  function build() {
    dialog = document.createElement('div');
    dialog.className = 'wv-backdrop';
    dialog.hidden = true;
    dialog.innerHTML =
      '<div class="wv-dialog" role="dialog" aria-modal="true" aria-labelledby="wv-title">' +
        '<div class="wv-head">' +
          '<h2 class="wv-title" id="wv-title">' + TITLE + '</h2>' +
          '<button type="button" class="wv-close" aria-label="Close video">' +
            '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">' +
              '<path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="wv-frame">' +
          '<div class="wv-poster" aria-hidden="true"><span class="wv-play"></span><span class="wv-time">1:22</span></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dialog);
    frame = dialog.querySelector('.wv-frame');
    closeBtn = dialog.querySelector('.wv-close');
    closeBtn.addEventListener('click', close);
    // A click on the dimmed area outside the dialog also closes it.
    dialog.addEventListener('mousedown', function (e) { if (e.target === dialog) close(); });
    dialog.addEventListener('keydown', onKey);
  }

  function focusables() {
    return Array.prototype.slice.call(
      dialog.querySelectorAll('button, iframe, [href], [tabindex]:not([tabindex="-1"])')
    );
  }

  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // Focus that lands outside the dialog while it is open (e.g. from the iframe losing it)
  // is pulled back in.
  function onFocusIn(e) {
    if (dialog && !dialog.hidden && !dialog.contains(e.target)) closeBtn.focus();
  }
  // Escape pressed while focus is inside the YouTube iframe never reaches us (it is a
  // different origin), so a document-level listener catches it once focus is back here.
  function onDocKey(e) {
    if (dialog && !dialog.hidden && (e.key === 'Escape' || e.key === 'Esc') && !dialog.contains(e.target)) close();
  }

  function open(btn) {
    if (!dialog) build();
    if (!dialog.hidden) return;
    opener = btn;
    var iframe = document.createElement('iframe');
    iframe.src = SRC;
    iframe.title = TITLE;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.appendChild(iframe);

    var de = document.documentElement;
    var scrollbar = window.innerWidth - de.clientWidth;
    savedOverflow = de.style.overflow;
    savedPadding = document.body.style.paddingRight;
    de.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = scrollbar + 'px';

    dialog.hidden = false;
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onDocKey);
    closeBtn.focus();

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'video_play', { video: 'welcome', page: btn.getAttribute('data-welcome-video') });
    }
  }

  function close() {
    if (!dialog || dialog.hidden) return;
    var iframe = frame.querySelector('iframe');
    if (iframe) frame.removeChild(iframe);
    dialog.hidden = true;
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('keydown', onDocKey);
    document.documentElement.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPadding;
    if (opener) opener.focus();
  }

  function init() {
    var btns = document.querySelectorAll('[data-welcome-video]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function (e) { e.preventDefault(); open(e.currentTarget); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
