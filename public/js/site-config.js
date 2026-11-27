// SITE CONFIG: feature flags that differ between staging and production (2026-11-27).
//
// Load as a CLASSIC script, before anything that reads it:
//   <script src="/js/site-config.js"></script>
//
// One build is deployed to both the live site and the staging / preview channels, so a flag
// that is "on for staging, off for production" can only be decided by WHERE the page is being
// served. Production is off by default: a flag is on only for the hosts named below, so a new
// domain, a typo or an unexpected host can never turn a flag on by accident.
//
// ESPANOL_CHECKS_ON: Embarque → Aduana in the Español stories (the before / after check, the
// passport, the postcard prompt), and the growth view and postcard rubric in Mission Control.
// The founder (a fluent former Spanish teacher) reviewed the item bank
// (public/espanol/<story>/checks.json) on 2026-11-27 and turned it ON IN PRODUCTION for all
// students: PRODUCTION_ESPANOL_CHECKS is true. Setting it back to false restores the old
// behaviour (on only for staging, preview channels and local development).
(function () {
    var PRODUCTION_ESPANOL_CHECKS = true;

    var host = '';
    try { host = String(window.location.hostname || '').toLowerCase(); } catch (e) { host = ''; }
    // allgood-academy--staging-xxxx.web.app and allgood-academy--pr123-xxxx.web.app are
    // Firebase Hosting channels; the live site is allgoodacademy.com and allgood-academy.web.app
    // (no "--"), which this does not match.
    var staging = /^allgood-academy--[a-z0-9-]+\.web\.app$/.test(host);
    var local = host === 'localhost' || host === '127.0.0.1';

    var CHECKS_ON = PRODUCTION_ESPANOL_CHECKS || staging || local;

    // ADMIN PREVIEW (2026-11-27). While the flag is off in production, the two admin accounts
    // can still look at Embarque / Aduana, the growth view and the rubric there, by adding
    // ?checks=preview to the page. BOTH are needed: the parameter does nothing for anyone
    // else, and an admin without it sees the site exactly as everyone does. The list is the
    // one firestore.rules trusts (isAllowlistedAdmin) and Insider uses; a unit test fails if
    // the three ever differ. The address must be verified, as the rules require. This only
    // decides what is SHOWN: what anyone can read or write is decided by firestore.rules.
    var ADMIN_EMAILS = ['balgood93@gmail.com', 'learning@allgoodacademy.com'];
    var previewAsked = false;
    try { previewAsked = /[?&]checks=preview(&|$)/.test(String(window.location.search || '')); } catch (e) { previewAsked = false; }
    function isAdmin(user) {
        return !!user && user.isAnonymous !== true && user.emailVerified === true
            && typeof user.email === 'string' && ADMIN_EMAILS.indexOf(user.email.toLowerCase()) >= 0;
    }

    window.AG_CONFIG = Object.freeze({
        staging: staging || local,
        ESPANOL_CHECKS_ON: CHECKS_ON,
        // True only when ?checks=preview is on the URL. On its own it turns nothing on.
        checksPreviewAsked: previewAsked,
        // Should THIS signed-in user see the checks? Everyone where the flag is on; where it
        // is off, only an admin account that asked for the preview.
        espanolChecksFor: function (user) { return CHECKS_ON || (previewAsked && isAdmin(user)); },
    });
})();
