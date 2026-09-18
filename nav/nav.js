'use strict';

// ============================================================================
// THE SITE NAV — single source of truth for every public page's top bar.
//
// Six pages carry this nav. Until this file existed each one hand-wrote its own
// copy, and they drifted: "Games" was added to the homepage in 9fe4d19 and to
// nowhere else, so a visitor on /about/ or /for-teachers/ had no route to the
// games hub at all, and /privacy.html and /terms.html had no route to a lesson
// or to sign in from anywhere. That is the same failure scripts/build-css.js was
// written to stop — a hand-maintained copy that nothing could notice, review or
// correct — so this follows the same shape: one definition here, generated into
// the pages, and `npm run check:nav` in CI to fail a build where the committed
// markup no longer matches.
//
// Generated at BUILD time, deliberately not rendered at runtime. These pages
// ship zero third-party requests and render on first byte; a nav injected by JS
// would show a beat of empty bar on the slow Chromebooks this product runs on,
// which is the exact thing the session script below is written to avoid.
//
// Run `npm run build:nav` after editing this file.
// ============================================================================

// --- The link set. Every page gets all of these, in this order. ------------
//
// `href` may be a function of the page slug: Contact is an in-page anchor on
// /about/ (where the contact section lives) and a cross-page link everywhere
// else. `current` marks which page the link represents, so the generator can
// flag it as the one you are on.
const LINKS = [
    { label: 'Games',        href: () => '/educational-games/', current: 'games' },
    { label: 'For teachers', href: () => '/for-teachers/',      current: 'for-teachers' },
    { label: 'About',        href: () => '/about/',             current: 'about' },
    { label: 'Contact',      href: page => (page === 'about' ? '#contact' : '/about/#contact') },
];

// The nav's one button. Points at a real lesson, not at /dashboard/ and not at a
// menu: the product needs no account to start, and this is the same GoodBlock
// the homepage hero's "I'm a student" CTA has always used. Sign in sits beside
// it as a plain text link — available, not advertised.
const CTA = { label: 'Try a lesson', href: '/jsh/digital-decisions-lab/social-intelligence/' };
const SIGNIN = { label: 'Sign in', href: '/dashboard/?signin=1' };

// --- The session script, emitted inline directly under the bar. -------------
//
// One control, two states. A visitor who already has a session should never be
// told to sign in — they press Home on their dashboard, land here, and the
// top-right still said "Sign in", which reads as "your session is gone".
//
// Deliberately synchronous and deliberately HERE, immediately after the markup
// rather than at the end of the body: this runs during parse, before first
// paint, so a slow Chromebook never shows a beat of the wrong label.
//
// Keyed on ag_signed_in (any session, guests included) and NOT ag_account,
// because a guest mid-way through a Lab Pack is exactly who needs the way back.
//
// The flag only ever changes a WORD and one destination. It grants no access and
// reveals nothing — the dashboard enforces its own entry either way — so reading
// the looser of the two flags is safe here in a way it would not be for a gate.
//
// Known, accepted: on a shared Chromebook a stale flag can offer "Your dashboard"
// to the next student, pointing at someone else's progress. It costs one tap and
// self-corrects; it is not a disclosure, since nothing is shown until /dashboard/
// resolves a real session. Do not "fix" this by naming the student here.
//
// Sign in carries a real href, so its destination and the dashboard's graceful
// return-to-homepage fallback both survive with JS off. The handler below only
// ever intercepts to send an existing session straight to /dashboard/ instead.
//
// Sign in deliberately hands off to the real identity gate (/js/identity-gate.js),
// which lives on the dashboard with the styles it was built against. Do NOT load
// auth-core.js from these pages to do it here: that pulls Firebase from gstatic.com
// on first paint, and these pages ship with zero third-party requests by design.
// /dashboard/?signin=1 opens that gate and returns the visitor here if they dismiss
// it, so someone without an account is never stranded.
//
// One more thing not to undo: the responsive rules in each page's CSS collapse
// .nav-link but exempt .nav-signin (`.nav-link:not(.nav-signin)`). Before that
// exemption the way back in simply did not exist on a phone. Keep it.
const SESSION_SCRIPT = `<script>
(function(){
  var a=document.querySelector('.nav-signin');
  if(!a)return;
  var signedIn=false;
  try{signedIn=localStorage.getItem('ag_signed_in')==='1';}catch(e){/* storage blocked - stays "Sign in", the safe default */}
  if(signedIn)a.textContent='Your dashboard';
  a.addEventListener('click',function(e){
    var now=false;
    try{now=localStorage.getItem('ag_signed_in')==='1';}catch(e){}
    if(now){e.preventDefault();location.href='/dashboard/';}
  });
})();
<\/script>`;

// --- Skins. -----------------------------------------------------------------
//
// Two visual treatments, deliberately kept apart. The drift this file fixes was
// in WHICH LINKS EXIST, never in styling, so the dark games-hub bar keeps its own
// look and the light pill bar keeps its own. Each skin owns its class names and
// its wrapper; both are fed the identical link set above.
const SKINS = {
    // /, /about/, /for-teachers/, /privacy.html, /terms.html
    light: {
        activeClass: 'here',
        // One flex row: links, then Sign in, then the button. The responsive
        // rules that collapse .nav-link exempt .nav-signin, so Sign in stays
        // reachable on a phone.
        render(links, actions) {
            return `<div class="nav-shell">
  <div class="wrap">
    <nav class="nav">
      <a class="wordmark" href="/">Allgood<em>Academy</em></a>
      <div class="nav-right">
${links}
${actions}
      </div>
    </nav>
  </div>
</div>`;
        },
        link: (href, label, active) =>
            `        <a class="nav-link${active ? ' here' : ''}" href="${href}">${label}</a>`,
        signin: href => `        <a class="nav-link nav-signin" href="${href}">${SIGNIN.label}</a>`,
        cta: href => `        <a class="nav-cta" href="${href}">${CTA.label}</a>`,
    },

    // /educational-games/ — dark bar, its own class names, logo split in two.
    dark: {
        activeClass: 'active',
        // The four page links sit in .nav-links, which collapses below 960px.
        // Sign in and the CTA sit outside it in .nav-right so they survive that
        // breakpoint — losing the way into a lesson on a phone is the opposite
        // of the point.
        render(links, actions) {
            return `<nav>
  <a href="/" class="nav-logo">Allgood<span>Academy</span></a>
  <div class="nav-links">
${links}
  </div>
  <div class="nav-right">
${actions}
  </div>
</nav>`;
        },
        link: (href, label, active) =>
            `    <a href="${href}" class="nav-link${active ? ' active' : ''}">${label}</a>`,
        signin: href => `    <a href="${href}" class="nav-link nav-signin">${SIGNIN.label}</a>`,
        cta: href => `    <a href="${href}" class="nav-cta">${CTA.label}</a>`,
    },
};

// --- The pages. -------------------------------------------------------------
const PAGES = [
    { file: 'public/index.html',                   slug: 'home',         skin: 'light' },
    { file: 'public/about/index.html',             slug: 'about',        skin: 'light' },
    { file: 'public/for-teachers/index.html',      slug: 'for-teachers', skin: 'light' },
    { file: 'public/privacy.html',                 slug: 'privacy',      skin: 'light' },
    { file: 'public/terms.html',                   slug: 'terms',        skin: 'light' },
    { file: 'public/educational-games/index.html', slug: 'games',        skin: 'dark'  },
    // Pattern Lab's landing page. The LINKING IS ONE-WAY and that is the whole point:
    // this page carries the site nav so a visitor who arrived from a search result has a
    // route into allgoodacademy.com, while the site itself links nowhere near Pattern Lab
    // (it is \`hidden: true\` in the module registry, and check-modules.js asserts its
    // absence from every surface). Listing a page here only generates the bar INTO it —
    // it adds nothing to LINKS, so no other page gains a Pattern Lab link.
    { file: 'public/pattern-lab/index.html',       slug: 'pattern-lab',  skin: 'dark'  },
];

const BEGIN = '<!-- BEGIN GENERATED NAV -->';
const END = '<!-- END GENERATED NAV -->';

const PREAMBLE =
    `${BEGIN}\n` +
    `<!-- Generated from nav/nav.js by \`npm run build:nav\`. Do NOT hand-edit: the next\n` +
    `     build overwrites it, and \`npm run check:nav\` fails CI when it drifts. Add or\n` +
    `     change a link in nav/nav.js and every page picks it up. -->\n`;

// Builds the full generated region for one page.
function renderNav(page) {
    const skin = SKINS[page.skin];
    const links = LINKS.map(l => skin.link(l.href(page.slug), l.label, l.current === page.slug));
    const actions = [skin.signin(SIGNIN.href), skin.cta(CTA.href)];
    const body = skin.render(links.join('\n'), actions.join('\n'));
    return `${PREAMBLE}${body}\n${SESSION_SCRIPT}\n${END}`;
}

module.exports = { LINKS, CTA, SIGNIN, SKINS, PAGES, BEGIN, END, renderNav };
