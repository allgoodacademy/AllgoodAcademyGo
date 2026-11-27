'use strict';

// ============================================================================
// THE SITE NAV — single source of truth for every public page's top bar.
//
// Every student-facing page carries this nav (the list is PAGES, below): the site
// pages, every hub, and every lesson, game and simulation — and, since 2026-11-25,
// Mission Control, where its "Teacher sign in" link is marked as the page you are on.
// Insider, Join and the printable teacher sheets do not.
// Originally six pages carried it. Until this file existed each one hand-wrote its own
// copy, and they drifted: "Games" was added to the homepage in 9fe4d19 and to
// nowhere else, so a visitor on /about/ or /for-teachers/ had no route to the
// games hub at all, and /privacy.html and /terms.html had no route to a lesson
// from anywhere. That is the same failure scripts/build-css.js was
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
    { label: 'Simulations',  href: () => '/simulations/',       current: 'simulations' },
    { label: 'For teachers', href: () => '/for-teachers/',      current: 'for-teachers' },
    { label: 'About',        href: () => '/about/',             current: 'about' },
    { label: 'Contact',      href: page => (page === 'about' ? '#contact' : '/about/#contact') },
];

// The nav's one button: the student dashboard, which reaches every lesson,
// Challenge, game and simulation, with no sign-in in front of it. It reads
// "Start learning" for a new visitor and "My dashboard" (same place) for a
// browser that already has a session — see the session script. The homepage
// hero's "I'm a student" goes to the same place.
//
// "Teacher sign in" is the ONLY sign-in anywhere on the site (founder decision,
// 2026-11-23): teachers sign in with Google or email on /mission-control/. It sits beside
// the button as a plain text link — available, not advertised, and labelled so
// no student mistakes it for something they need.
const CTA = { label: 'Start learning', href: '/dashboard/' };
const SIGNIN = { label: 'Teacher sign in', href: '/mission-control/' };

// --- The session script, emitted inline directly under the bar. -------------
//
// Two things change, nothing else:
//   - a browser with a session (ag_signed_in — every student who has played
//     anything) reads "My dashboard" in place of "Start learning": same link,
//     but it tells a returning student their work is there;
//   - a signed-in teacher (ag_account) reads "My dashboard" too, and loses the
//     "Teacher sign in" link (2026-11-27, one dashboard): their class is
//     Mission Control inside the dashboard, so the button is the one way in.
//     Signed out, everyone still sees "Teacher sign in".
//
// Deliberately synchronous and deliberately HERE, immediately after the markup:
// it runs during parse, before first paint, so a slow Chromebook never shows a
// beat of the wrong label. The flags are routing hints, never access: nothing is
// shown on /dashboard/ or /mission-control/ until Firebase resolves a session.
// These pages load no Firebase themselves (zero third-party requests by design).
//
// Do not undo: each page's responsive CSS collapses .nav-link but exempts
// .nav-signin, so Teacher sign in stays reachable on a phone.
const SESSION_SCRIPT = `<script>
(function(){
  var s=false,a=false;
  try{s=localStorage.getItem('ag_signed_in')==='1';a=localStorage.getItem('ag_account')==='1';}catch(e){/* storage blocked - the defaults stand */}
  var cta=document.querySelector('.nav-cta'),signin=document.querySelector('.nav-signin');
  if((s||a)&&cta)cta.textContent='My dashboard';
  if(a&&signin)signin.remove();
  // Where this visit came from, kept for the visit (sessionStorage) so a click from a hub
  // into a simulation still reads 'email'. Cookie-free; the referrer HOST only. /js/telemetry.js
  // writes it onto the session doc. See docs/insider-analytics.md.
  try{if(!sessionStorage.getItem('ag_src')){var q=new URLSearchParams(location.search),c=function(v){v=String(v||'').toLowerCase();return /^[a-z0-9._-]{1,40}$/.test(v)?v:(v?'other':'');},r='';try{var h=document.referrer?new URL(document.referrer).host:'';r=h&&h!==location.host?c(h):'';}catch(e){}var o={src:c(q.get('src')),utmSource:c(q.get('utm_source')),utmMedium:c(q.get('utm_medium')),utmCampaign:c(q.get('utm_campaign')),refHost:r};sessionStorage.setItem('ag_src',JSON.stringify(o));}}catch(e){/* storage blocked - no source recorded */}
  var nav=document.querySelector('.site-nav'),btn=nav&&nav.querySelector('.nav-menu');
  if(!btn)return;
  nav.classList.add('has-menu');
  function set(o){nav.classList.toggle('open',o);btn.setAttribute('aria-expanded',o?'true':'false');btn.setAttribute('aria-label',o?'Close menu':'Menu');}
  btn.addEventListener('click',function(){set(!nav.classList.contains('open'));});
  nav.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.nav-links a'))set(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&nav.classList.contains('open')){set(false);btn.focus();}});
  document.addEventListener('click',function(e){if(!nav.contains(e.target))set(false);});
})();
<\/script>`;

// --- The phone and tablet layout, emitted with the bar. ------------------------
//
// Generated here, once, for BOTH skins, instead of living in seven page stylesheets.
// Each page used to hide its section links below 960px and squeeze the wordmark,
// "Teacher sign in" and the button into one row; on a phone the button overflowed
// the bar (iPhone SE, iPhone 13) and Games / Simulations / For teachers were simply
// not there. Below 960px the bar is now two rows: the wordmark and the button on
// the first, every link (including Teacher sign in) below them, wrapping onto a
// further line on a narrow phone rather than hiding any of them. Layout only — no colours — so
// each skin keeps its own look. Selectors start at .site-nav so they outrank the
// pages' own collapse rules without !important.
const PHONE_STYLE = `<style>
.site-nav .nav-links{display:flex;align-items:center;gap:4px}
.nav-shell .nav-menu{display:none}
@media(max-width:960px){
  .site-nav{flex-wrap:wrap;height:auto;row-gap:2px}
  .site-nav.nav{border-radius:22px;padding:10px 12px 6px 18px}
  nav.site-nav:not(.nav){padding-top:10px;padding-bottom:4px}
  .site-nav .nav-right{display:contents}
  .site-nav .nav-cta{order:1;margin-left:auto;flex:none}
  .site-nav .nav-links{order:2;flex:1 0 100%;min-width:0;flex-wrap:wrap;margin:0 -8px;gap:0}
  .site-nav .nav-links .nav-link{display:inline-block;flex:none;white-space:nowrap;max-width:none;line-height:1.3;padding:9px 10px}
  .nav-shell{padding-top:10px}
  .nav-shell .wrap{padding-left:12px;padding-right:12px}
  .site-nav.has-menu.nav{flex-wrap:wrap;gap:6px;row-gap:0;border-radius:26px;padding:6px 6px 6px 18px}
  .site-nav.has-menu .wordmark{font-size:20px;margin-right:auto;min-width:0;overflow:hidden;text-overflow:clip}
  .site-nav.has-menu .nav-cta{order:1;margin-left:0;padding:8px 16px}
  .site-nav.has-menu .nav-menu{order:2;display:inline-flex;align-items:center;justify-content:center;flex:none;width:42px;height:42px;padding:0;margin:0;border:0;border-radius:999px;background:var(--color-teal-wash);color:var(--color-teal-deep);cursor:pointer}
  .site-nav.has-menu .nav-menu svg{display:block;width:20px;height:20px}
  .site-nav.has-menu .nav-menu .x,.site-nav.has-menu.open .nav-menu .bars{display:none}
  .site-nav.has-menu.open .nav-menu .x{display:block}
  .site-nav.has-menu .nav-links{order:3;display:none;margin:8px 0 4px;padding:6px 12px 0 0;border-top:1px solid var(--color-teal-wash)}
  .site-nav.has-menu.open .nav-links{display:flex;flex-direction:column;align-items:stretch;flex-wrap:nowrap}
  .site-nav.has-menu.open .nav-links .nav-link{display:block;font-size:15px;line-height:1.4;padding:12px 14px;border-radius:14px;white-space:normal;max-width:none;text-align:left}
}
@media(max-width:380px){
  .nav-shell .wrap{padding-left:10px;padding-right:10px}
  .site-nav.nav{padding-left:14px;padding-right:8px}
  .site-nav .wordmark{font-size:18px}
  .site-nav .nav-cta{padding-left:12px;padding-right:12px}
  .site-nav .nav-links .nav-link{padding-left:8px;padding-right:8px}
  .site-nav.has-menu.nav{padding-left:14px;padding-right:6px;gap:4px}
  .site-nav.has-menu .wordmark{font-size:17px}
  .site-nav.has-menu .nav-cta{padding:8px 11px;font-size:12px}
  .site-nav.has-menu .nav-menu{width:38px;height:38px}
}
</style>`;

// --- The look, emitted with the bar. ------------------------------------------
//
// The bar used to take its look from each page's own stylesheet, so only pages that
// had copied the homepage's CSS could carry it, and the games hub, the simulations
// hub, the dashboard and every lesson, game and simulation grew a bar of their own:
// five different top bars on one site (founder, 2026-11-25: "they all look like
// different websites"). Now every rule the bar needs ships inside the generated
// region, scoped to .nav-shell and written in brand tokens, so any page that lists
// itself in PAGES gets the homepage's bar exactly, whatever its own CSS, Tailwind
// preflight or dark palette. It comes BEFORE PHONE_STYLE, which wins ties.
//
// Activity pages (inside a simulation, game or lesson) pass `activity: true`: the
// bar looks identical but scrolls away instead of sticking, so the activity keeps
// the screen, and it hides in Present mode (body.present), where the activity's own
// row carries "Exit present". Pages on a dark canvas set --nav-fade on :root to
// their background (and --nav-fade-end, for a solid strip) so the band behind the sticky pill matches.
const NAV_STYLE = `<style>
.nav-shell{padding:16px 0 0;position:sticky;top:0;z-index:50;background:linear-gradient(var(--nav-fade,var(--color-canvas)) 72%,var(--nav-fade-end,transparent))}
.nav-shell.activity{position:relative;z-index:auto;flex:0 0 auto;background:transparent;padding-bottom:12px}
body.present .nav-shell.activity{display:none}
.nav-shell,.nav-shell *{box-sizing:border-box}
.nav-shell .wordmark,.nav-shell .nav-right,.nav-shell .nav-links,.nav-shell .nav-link{margin:0;min-height:0;float:none}
.nav-shell .wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.nav-shell .nav{position:relative;width:auto;max-width:none;height:auto;min-height:0;border:0;backdrop-filter:none;background:var(--color-surface);border-radius:999px;box-shadow:0 2px 10px -2px color-mix(in srgb,var(--color-ink) 14%,transparent);padding:11px 14px 11px 26px;display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0;color:var(--color-ink);font-family:var(--font-display);font-size:17px;line-height:1.7;text-align:left}
.nav-shell .wordmark{display:block;font-family:var(--font-display);font-size:22px;font-weight:700;font-style:normal;color:var(--color-teal-deep);text-decoration:none;letter-spacing:-.03em;white-space:nowrap;line-height:1.7;opacity:1}
.nav-shell .wordmark em{font-style:normal;color:var(--color-orange)}
.nav-shell .nav-right{display:flex;align-items:center;gap:4px}
.nav-shell .nav-link{display:inline-block;font-family:var(--font-ui);font-size:13px;font-weight:400;color:var(--color-ink-soft);text-decoration:none;padding:10px 15px;border-radius:999px;letter-spacing:-.01em;white-space:nowrap;line-height:1.7;background:transparent}
.nav-shell .nav-link:hover{background:var(--color-teal-wash);color:var(--color-teal-deep)}
.nav-shell .nav-link.here{background:var(--color-teal-wash);color:var(--color-teal-deep);font-weight:700}
.nav-shell .nav-signin{font-weight:700;color:var(--color-ink)}
.nav-shell .nav-cta{font-family:var(--font-ui);font-size:13px;font-weight:700;background:var(--color-orange);border:1.5px solid var(--color-orange);color:var(--color-surface);padding:10px 22px;border-radius:999px;cursor:pointer;margin-left:6px;letter-spacing:-.01em;white-space:nowrap;text-decoration:none;display:inline-block;line-height:1.7}
.nav-shell .nav-cta:hover{background:var(--color-orange-deep);border-color:var(--color-orange-deep);color:var(--color-surface)}
.nav-shell :focus-visible{outline:3px solid var(--color-orange);outline-offset:4px;border-radius:6px}
@media(max-width:440px){ .nav-shell .nav-cta{padding:10px 15px} }
</style>`;

// The phone/tablet menu button (hidden above 960px). Below 960px the session script
// adds .has-menu and the bar becomes ONE row — wordmark, the button, this — with the
// links dropping down under it on tap. Founder, 2026-11-25: the two-to-three-row
// sticky card it replaces covered a quarter of a phone screen. Without JS the
// button stays hidden and the links fall back to the wrapped rows above.
const MENU_BUTTON = `        <button class="nav-menu" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-nav-links"><svg class="bars" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h14M3 10h14M3 14.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><svg class="x" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`;

// --- Skins. -----------------------------------------------------------------
//
// One treatment: the homepage's white pill. (A dark games-hub skin lived here until
// 2026-11-25; every page now carries the same bar.)
const SKINS = {
    light: {
        activeClass: 'here',
        // One flex row: links, then Teacher sign in, then the button. The
        // responsive rules that collapse .nav-link exempt .nav-signin, so it
        // stays reachable on a phone.
        render(links, actions, page) {
            return `<div class="nav-shell${page.activity ? ' activity' : ''}">
  <div class="wrap">
    <nav class="nav site-nav">
      <a class="wordmark" href="/">Allgood<em>Academy</em></a>
      <div class="nav-right">
        <div class="nav-links" id="site-nav-links">
${links}
        </div>
${actions}
      </div>
    </nav>
  </div>
</div>`;
        },
        link: (href, label, active) =>
            `          <a class="nav-link${active ? ' here' : ''}" href="${href}">${label}</a>`,
        signin: (href, active) => `          <a class="nav-link nav-signin${active ? ' here' : ''}" href="${href}">${SIGNIN.label}</a>`,
        cta: href => `        <a class="nav-cta" href="${href}">${CTA.label}</a>\n${MENU_BUTTON}`,
    },
};

// --- The pages. -------------------------------------------------------------
const ACTIVITY_PAGES = [
    'public/simulations/watercycle/index.html',
    'public/simulations/seasons/index.html',
    'public/simulations/wolves-and-deer/index.html',
    'public/simulations/snowball/index.html',
    'public/jsh/digital-decisions-lab/digital-citizenship/index.html',
    'public/jsh/digital-decisions-lab/privacy-security/index.html',
    'public/jsh/digital-decisions-lab/professional-brand/index.html',
    'public/jsh/digital-decisions-lab/social-intelligence/index.html',
    'public/jsh/real-world-ready-lab/conflict-has-a-winner/index.html',
    'public/jsh/real-world-ready-lab/money-as-a-skill/index.html',
    'public/jsh/real-world-ready-lab/reading-the-room/index.html',
    'public/jsh/room-to-think-lab/ten-voices-one-source/index.html',
    'public/jsh/room-to-think-lab/the-cost-of-later/index.html',
    'public/jsh/room-to-think-lab/the-question-decides-the-answer/index.html',
    'public/jsh/room-to-think-lab/where-you-say-it/index.html',
    'public/educational-games/digital-decisions/index.html',
    'public/educational-games/real-world-ready/index.html',
    'public/educational-games/room-to-think/index.html',
    'public/educational-games/before-you-send/index.html',
    'public/educational-games/money-moves/index.html',
    'public/educational-games/read-the-signal/index.html',
    'public/educational-games/the-rumor-mill/index.html',
    'public/educational-games/pattern-lab/index.html',
    'public/educational-games/takethebait/index.html',
];
const PAGES = [
    // Site pages: the bar sticks to the top as you scroll.
    { file: 'public/index.html',                   slug: 'home',         skin: 'light' },
    { file: 'public/about/index.html',             slug: 'about',        skin: 'light' },
    { file: 'public/for-teachers/index.html',      slug: 'for-teachers', skin: 'light' },
    { file: 'public/privacy.html',                 slug: 'privacy',      skin: 'light' },
    { file: 'public/terms.html',                   slug: 'terms',        skin: 'light' },
    // Pattern Lab's landing page. The LINKING IS ONE-WAY and that is the whole point:
    // this page carries the site nav so a visitor who arrived from a search result has a
    // route into allgoodacademy.com, while the site itself links nowhere near Pattern Lab
    // (it is \`hidden: true\` in the module registry, and check-modules.js asserts its
    // absence from every surface). Listing a page here only generates the bar INTO it —
    // it adds nothing to LINKS, so no other page gains a Pattern Lab link.
    { file: 'public/pattern-lab/index.html',       slug: 'pattern-lab',  skin: 'light' },
    // Español (AA-7): the hub and its two stories carry the bar, ONE-WAY like Pattern Lab.
    // They are still unlinked and noindex until the founder launches them, so nothing is
    // added to LINKS. The stories keep their own bar (.hud) directly under this one.
    { file: 'public/espanol/index.html',            slug: 'espanol',       skin: 'light' },
    { file: 'public/espanol/el-viaje/index.html',   slug: 'espanol-story', skin: 'light' },
    { file: 'public/espanol/el-mundial/index.html', slug: 'espanol-story', skin: 'light' },
    // Hubs.
    { file: 'public/educational-games/index.html', slug: 'games',        skin: 'light' },
    { file: 'public/simulations/index.html',       slug: 'simulations',  skin: 'light' },
    { file: 'public/help/index.html',              slug: 'help',         skin: 'light' },
    { file: 'public/dashboard/index.html',         slug: 'dashboard',    skin: 'light' },
    // Teacher sign-in. Its "Teacher sign in" link is the one marked as here (and the link
    // is gone for a signed-in teacher, whose class is on /dashboard/ — see the session script).
    { file: 'public/mission-control/index.html',   slug: 'mission-control', skin: 'light' },
    { file: 'public/jsh/digital-decisions-lab/index.html', slug: 'lab-hub', skin: 'light', activity: true },
    { file: 'public/jsh/real-world-ready-lab/index.html',  slug: 'lab-hub', skin: 'light', activity: true },
    { file: 'public/jsh/room-to-think-lab/index.html',     slug: 'lab-hub', skin: 'light', activity: true },
    // Activities: same bar, scrolls away, hidden in Present mode. Each keeps its own
    // row underneath for what belongs to the activity (its name, Present, Comms,
    // progress, the jump-to menu).
    ...ACTIVITY_PAGES.map(file => ({ file, slug: 'activity', skin: 'light', activity: true })),
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
    // Teacher sign in rides with the page links (it is a link, not the button), so on a
    // phone it lands on the same scrollable row and never competes with the button.
    const body = skin.render([...links, skin.signin(SIGNIN.href, page.slug === 'mission-control')].join('\n'), skin.cta(CTA.href), page);
    return `${PREAMBLE}${body}\n${NAV_STYLE}\n${PHONE_STYLE}\n${SESSION_SCRIPT}\n${END}`;
}

module.exports = { LINKS, CTA, SIGNIN, SKINS, PAGES, BEGIN, END, renderNav };
