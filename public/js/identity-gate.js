// Shared identify gate for every Allgood Academy portal — the merged age + path
// decision described in the persona-system refinement: "Are you 13 or older?" and
// "how do you want to continue" are ONE screen, not two separate steps.
//
// Load this after auth-core.js (`<script type="module" src="/js/identity-gate.js">`)
// on any page that gates real content behind identity — today that's the dashboard,
// Digital Decisions, and Jolene's Lemonade. It injects its own modal markup, so a page
// doesn't need to carry a copy of this UI itself — one shared place to fix or extend
// this flow, instead of three (or more, as new modules ship) copies drifting apart.
//
// Two tiers reach "fully identified":
//   - 13+  : a real, non-anonymous account (Google or email/password). No anonymous
//            path remains for this tier — the whole point of this pass.
//   - under13: a Learner Recruit with a Recruit Code on file. Avatar is still
//            auto-assigned with zero picker screen, exactly as originally spec'd;
//            the passphrase now doubles as their display name from the first second.
//
// Three entry points, and which one you want depends on what you are protecting:
//
//   startGuestSession()  — what every GoodBlock and Challenge calls at power-up.
//       Guest-first (founder decision, 2026-09-09): nobody signs in to START anything.
//       An anonymous session and a readable auto-assigned name, then out of the way.
//   offerSave()          — the end-of-module offer to keep a guest run, plus the
//       always-available "Save my progress" affordance. Shown AFTER a completion
//       screen, never in front of one; declining hides nothing.
//   ensureIdentified()   — unchanged, and still the real bar. It resolves once the
//       *current* session is a real 13+ account or a Recruit with a code on file,
//       showing the gate UI first if it isn't. It guards the dashboard, any roster or
//       Task Force surface, the insider portal, and the save/claim action itself —
//       it is no longer on the path into a lesson.

function waitForAuthReady() {
    return new Promise((resolve) => {
        // Guard against a synchronous first callback (real Firebase always fires
        // async, but nothing about this function should depend on that): `unsub`
        // isn't assigned yet in that case, so just skip calling it once.
        let settled = false;
        let unsub;
        // No timeout here previously meant a slow/dropped network call during
        // Firebase Auth's own state determination left ensureIdentified() awaiting
        // forever with zero UI feedback - on mobile this read as the whole page
        // freezing for as long as the network stayed slow. Bounding the wait means
        // a bad connection degrades to "treated as signed out, gate shows" instead
        // of "frozen indefinitely."
        const timeout = setTimeout(() => {
            if (settled) return;
            settled = true;
            if (unsub) unsub();
            console.warn('[AuthGate] onAuthStateChanged did not resolve within 8s; proceeding as signed-out.');
            resolve(null);
        }, 8000);
        unsub = window.AuthCore.onAuthStateChanged(window.AuthCore.auth, (user) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            if (unsub) unsub();
            resolve(user);
        });
    });
}

// Minimal, dependency-free loading indicator (inline styles, no Tailwind custom
// colors) shown only during the one phase of ensureIdentified() that previously
// gave zero visual feedback: waiting on Firebase's first auth-state callback,
// before the gate modal (or anything else) has appeared. Self-contained the same
// way message-hq.js is, so it works identically on every page regardless of that
// page's own Tailwind config.
function showAuthSpinner() {
    let el = document.getElementById('ag-loading');
    if (!el) {
        el = document.createElement('div');
        el.id = 'ag-loading';
        el.style.cssText = 'position:fixed;inset:0;z-index:2147482999;background:rgba(255,255,255,0.6);display:flex;align-items:center;justify-content:center;';
        el.innerHTML = '<div style="width:32px;height:32px;border:3px solid #D34716;border-top-color:transparent;border-radius:50%;animation:ag-spin 0.7s linear infinite;"></div>' +
            '<style>@keyframes ag-spin{to{transform:rotate(360deg)}}</style>';
        document.body.appendChild(el);
    }
    el.style.display = 'flex';
}

function hideAuthSpinner() {
    const el = document.getElementById('ag-loading');
    if (el) el.style.display = 'none';
}

// A session is "identified" — meaning offerSave() has nothing further to offer — once it
// either has a real, non-anonymous account (any age tier that can have one, i.e. 13+) or
// holds a claimed Recruit Code (the code IS the identity, for under-13 and for a 13+ guest
// who claimed a code without ever creating a real account). Mission Control and every other
// real-account-only surface still checks `!user.isAnonymous` directly rather than this — a
// code-only 13+ guest is identified enough to skip the save offer, but a code is never a
// substitute for a real account where one is actually required.
function isFullyIdentified(user, account) {
    if (!user || !account) return false;
    if (!user.isAnonymous) return true;
    return !!account.recruitCode;
}

// The three properties that decide whether this gate is SEEN AT ALL are set inline, not by
// Tailwind classes — the same reasoning showAuthSpinner() and the save FAB already use, and
// for the same reason: this markup is injected into eleven different pages, each with its
// own CSS build, and it must not depend on what any of them happened to compile.
//
// Both halves of that mattered here, and together they were the "Sign In does nothing" bug:
//
//   position/inset — the div is appended to document.body, so `absolute inset-0` resolved
//   against the nearest POSITIONED ancestor, and the dashboard sets `body{position:relative}`.
//   The gate was laid out against the body box instead of the viewport and rendered ~700px
//   down, below the fold. It opened every time; nobody could see it. Lab pages were fine
//   only because their body is unpositioned, so absolute happened to hit the initial
//   containing block.
//
//   z-index — `z-[9999]` appears nowhere but this file, and the dashboard ships a PURGED
//   Tailwind bundle built by scanning .html only. The class was never compiled, so the gate
//   computed to `z-index:auto` and painted UNDERNEATH the profile modal (z-260), the slide-out
//   menu (z-100) and the power-up screen (z-5000). Opening it from any of those looked like
//   nothing happening. The classes are kept for pages that do compile them; the inline styles
//   are what actually guarantee it.
const TEMPLATE = `
<div id="ag-modal" style="position:fixed;inset:0;z-index:2147483000;" class="fixed inset-0 z-[9999] bg-allgood-dark/95 flex items-center justify-center p-6 hidden-modal modal-transition backdrop-blur-sm">
    <div class="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full text-center border-t-4 border-allgood-primary relative">
        <!-- The tap target is 44x44 (WCAG 2.5.5 minimum), sized inline for the same reason the
             z-index above is: the w-11/h-11 and flex-centering utilities it needs are not in
             every page's Tailwind bundle. The icon itself stays 20px - only the tappable area
             grows, so a child reaching for it on a phone can actually land on it. -->
        <button id="ag-btn-close" style="position:absolute;top:4px;right:4px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;" class="text-gray-400 hover:text-red-500 transition-colors" title="Close" aria-label="Close">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="mb-6"><h2 class="text-3xl font-heading font-bold text-allgood-dark">Allgood<span class="text-allgood-primary">Academy</span></h2></div>

        <!-- ROOT: age question and path choice merged into one decision. -->
        <div id="ag-root">
            <h2 class="text-xl font-bold text-allgood-dark mb-1 font-heading">Let's get you in.</h2>
            <p class="text-gray-500 text-xs mb-6 font-body">First — are you 13 or older?</p>
            <p id="ag-root-error" class="text-red-500 text-xs mb-2 hidden font-body"></p>
            <button id="ag-btn-13plus" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded shadow-md transition-transform transform hover:scale-[1.02] active:scale-[0.98] font-body uppercase mb-3">
                I'm 13 or older &mdash; Sign In
            </button>
            <button id="ag-btn-under13" class="w-full bg-white border-2 border-allgood-secondary text-allgood-secondary hover:bg-allgood-secondary hover:text-white font-bold py-3 rounded shadow-sm transition-all font-body uppercase mb-4">
                I'm younger than 13 &mdash; Get My Recruit Code
            </button>
            <button id="ag-link-have-code" class="text-xs text-gray-400 hover:text-allgood-primary underline decoration-dotted font-body block mx-auto mb-2">Already have a Recruit Code? Enter it here</button>
            <button id="ag-link-returning" class="text-xs text-allgood-primary hover:text-allgood-hover font-bold underline decoration-dotted font-body">Already have an account? Sign in</button>
        </div>

        <!-- RETURNING: the way back in for someone who already has an account, kept
             deliberately separate from ag-root. That panel opens with "are you 13 or
             older?", which is the right first question for a brand new visitor and the
             wrong one for a teacher or Recruit who only wants their own account back —
             answering it again led them straight into creating a SECOND identity, which
             is the trap this panel exists to remove. Both options here are the same
             calls the rest of the gate already uses; only the way in is new. -->
        <div id="ag-returning" class="hidden">
            <h2 class="text-xl font-bold text-allgood-dark mb-1 font-heading">Welcome back.</h2>
            <p class="text-gray-500 text-xs mb-5 font-body leading-relaxed">Sign in the same way you did before and everything comes back with you.</p>
            <p id="ag-returning-error" class="text-red-500 text-xs mb-2 hidden font-body"></p>

            <button id="ag-btn-returning-google" class="w-full p-3 rounded shadow-md hover:shadow-lg transition-all duration-200 bg-white border border-gray-300 flex items-center justify-center gap-3 font-bold text-sm text-allgood-dark uppercase mb-2">
                <svg class="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
            </button>
            <p class="text-[11px] text-gray-400 mb-4 font-body">For Agent Learners and Task Force Leaders (13+).</p>

            <div class="flex items-center gap-3 mb-4">
                <div class="flex-1 h-px bg-gray-200"></div>
                <span class="text-[10px] uppercase text-gray-400 font-bold">or</span>
                <div class="flex-1 h-px bg-gray-200"></div>
            </div>

            <button id="ag-btn-returning-passphrase" class="w-full bg-white border-2 border-allgood-secondary text-allgood-secondary hover:bg-allgood-secondary hover:text-white font-bold py-3 rounded shadow-sm transition-all font-body uppercase mb-2">
                I have a passphrase
            </button>
            <p class="text-[11px] text-gray-400 mb-4 font-body">Learner Recruits &mdash; the three words you were given, like <em>arctic-fox-trot</em>.</p>

            <button id="ag-btn-returning-email" class="text-xs text-gray-400 hover:text-allgood-primary underline decoration-dotted font-body block mx-auto mb-2">Used an email and password? Sign in that way</button>
            <button id="ag-link-returning-new" class="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase font-body">New here? Start fresh</button>
        </div>

        <!-- SIGN IN (13+): Google, or email/password create-account / existing-account. -->
        <div id="ag-signin" class="hidden">
            <h2 class="text-xl font-bold text-allgood-dark mb-2 font-heading">Sign In</h2>
            <p class="text-gray-500 text-xs mb-4 font-body leading-relaxed">A real account is required at 13+ &mdash; no anonymous option here.</p>

            <button id="ag-btn-google" class="w-full p-3 rounded shadow-md hover:shadow-lg transition-all duration-200 bg-white border border-gray-300 flex items-center justify-center gap-3 font-bold text-sm text-allgood-dark uppercase mb-4">
                <svg class="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
            </button>

            <div class="flex items-center gap-3 mb-4">
                <div class="flex-1 h-px bg-gray-200"></div>
                <span class="text-[10px] uppercase text-gray-400 font-bold">or</span>
                <div class="flex-1 h-px bg-gray-200"></div>
            </div>

            <input type="email" id="ag-email-input" placeholder="Email" autocomplete="email" class="w-full border border-gray-300 rounded p-3 mb-2 focus:ring-2 focus:ring-allgood-primary focus:border-transparent outline-none transition-all font-body text-center">
            <input type="password" id="ag-password-input" placeholder="Password" autocomplete="current-password" class="w-full border border-gray-300 rounded p-3 mb-2 focus:ring-2 focus:ring-allgood-primary focus:border-transparent outline-none transition-all font-body text-center">
            <p id="ag-signin-error" class="text-red-500 text-xs mb-2 hidden font-body"></p>
            <button id="ag-btn-email-submit" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded shadow-md transition-transform transform hover:scale-[1.02] active:scale-[0.98] font-body uppercase mb-2">Create Account</button>
            <button id="ag-link-toggle-mode" class="text-xs text-allgood-primary hover:text-allgood-hover underline decoration-dotted font-body mb-3 block mx-auto">Already have an account? Sign in instead</button>
            <button id="ag-back-from-signin" class="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase font-body">Back</button>
        </div>

        <!-- RECRUIT CODE REVEAL: shown once, right after a brand new Recruit signs in. -->
        <div id="ag-recruit-new" class="hidden">
            <h2 class="text-xl font-bold text-allgood-dark mb-1 font-heading">You're in!</h2>
            <p class="text-gray-500 text-xs mb-4 font-body leading-relaxed">This is your Recruit Code. Write it down &mdash; it's the only way to get your progress back on another device.</p>
            <p id="ag-recruit-note" class="hidden text-[11px] text-allgood-primary mb-3 font-body leading-relaxed"></p>
            <div class="bg-slate-50 border-2 border-dashed border-allgood-secondary rounded-lg py-4 px-3 mb-2">
                <span id="ag-recruit-code-display" class="text-lg font-heading font-bold text-allgood-secondary tracking-wide break-words"></span>
            </div>
            <button id="ag-btn-copy-code" class="text-xs text-allgood-primary hover:text-allgood-hover underline decoration-dotted mb-4 font-body">Copy code</button>
            <p class="text-[11px] text-gray-400 mb-4 font-body">Don't lose this &mdash; there's no other way back in.</p>
            <button id="ag-btn-recruit-continue" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded shadow-md transition-transform transform hover:scale-[1.02] active:scale-[0.98] font-body uppercase">Let's Go!</button>
        </div>

        <!-- CLOSE GUARD for the Recruit Code reveal only. The X is shared by every panel, and
             on this one panel it sits beside the single copy of a child's Recruit Code - the
             only route back to their work on another device. Tapping it therefore asks first,
             here, in the gate's own vocabulary rather than a browser confirm(), and the
             recovering choice is the primary one. Every other panel closes as it always did. -->
        <div id="ag-recruit-confirm" class="hidden">
            <h2 class="text-xl font-bold text-allgood-dark mb-1 font-heading">Did you write it down?</h2>
            <p class="text-gray-500 text-xs mb-4 font-body leading-relaxed">Your Recruit Code is the only way to get back to your work on another device. Close this and we can&rsquo;t show it to you again.</p>
            <button id="ag-btn-recruit-keep" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded shadow-md transition-transform transform hover:scale-[1.02] active:scale-[0.98] font-body uppercase mb-3">Take me back to my code</button>
            <button id="ag-btn-recruit-discard" class="w-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-allgood-dark font-bold py-2.5 rounded text-xs uppercase font-body transition-colors">I&rsquo;ve got it written down &mdash; close</button>
        </div>

        <!-- SAVE / CLAIM: the end-of-module offer, in Jodi's voice. A code is assigned the
             moment this panel opens — no age question in front of it, and no account
             required to get it. "Not now" just closes the offer; the code is already
             theirs either way, written down or not. Only creating a real account (13+
             only — under-13 can't have one) is the thing that's actually optional here. -->
        <div id="ag-save" class="hidden">
            <h2 class="text-xl font-bold text-allgood-dark mb-1 font-heading">Nice work.</h2>
            <p class="text-gray-500 text-xs mb-4 font-body leading-relaxed">Here's your code. Write it down &mdash; it's the only way to get your progress back on another device.</p>
            <div class="bg-slate-50 border-2 border-dashed border-allgood-secondary rounded-lg py-4 px-3 mb-2">
                <span id="ag-save-code-display" class="text-lg font-heading font-bold text-allgood-secondary tracking-wide break-words">&hellip;</span>
            </div>
            <button id="ag-btn-save-copy-code" class="text-xs text-allgood-primary hover:text-allgood-hover underline decoration-dotted mb-4 font-body">Copy code</button>
            <p id="ag-save-note" class="hidden text-[11px] text-allgood-primary mb-3 font-body leading-relaxed"></p>
            <p id="ag-save-error" class="text-red-500 text-xs mb-2 hidden font-body"></p>
            <button id="ag-btn-save-13plus" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded shadow-md transition-transform transform hover:scale-[1.02] active:scale-[0.98] font-body uppercase mb-3">
                Create an account (13+)
            </button>
            <p class="text-[11px] text-gray-400 mb-3 font-body">Adds a real sign-in on top of this code &mdash; not required to keep your progress.</p>
            <button id="ag-btn-save-decline" class="w-full border border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-allgood-dark font-bold py-2.5 rounded text-xs uppercase font-body transition-colors">Not now</button>
        </div>

        <!-- REDEEM: entering an existing Recruit Code, either from the root link or a
             returning Recruit on a new device. -->
        <div id="ag-redeem" class="hidden">
            <h2 class="text-xl font-bold text-allgood-dark mb-2 font-heading">Enter Your Recruit Code</h2>
            <p class="text-gray-500 text-xs mb-4 font-body leading-relaxed">Type the code exactly as you were given it, like <em>arctic-fox-trot</em>.</p>
            <input type="text" id="ag-redeem-input" placeholder="e.g. arctic-fox-trot" autocomplete="off" class="w-full border border-gray-300 rounded p-3 mb-2 focus:ring-2 focus:ring-allgood-secondary focus:border-transparent outline-none transition-all font-body text-center">
            <p id="ag-redeem-error" class="text-red-500 text-xs mb-2 hidden font-body"></p>
            <button id="ag-btn-redeem-submit" class="w-full bg-allgood-secondary hover:bg-allgood-accent text-white font-bold py-3 rounded shadow-md transition-transform transform hover:scale-[1.02] active:scale-[0.98] font-body uppercase mb-2">Get My Progress Back</button>
            <button id="ag-back-from-redeem" class="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase font-body">Back</button>
        </div>
    </div>
</div>`;

function playSfx(name) {
    if (window.sfx && typeof window.sfx[name] === 'function') {
        try { window.sfx[name](); } catch (e) { /* ignore */ }
    }
}

function ensureModalInjected() {
    if (document.getElementById('ag-modal')) return;
    document.body.insertAdjacentHTML('beforeend', TEMPLATE);
    if (window.lucide) window.lucide.createIcons();
}

function showPanel(id) {
    ['ag-root', 'ag-save', 'ag-signin', 'ag-recruit-new', 'ag-recruit-confirm', 'ag-redeem', 'ag-returning'].forEach((panelId) => {
        const el = document.getElementById(panelId);
        if (el) el.classList.toggle('hidden', panelId !== id);
    });
}

function setBusy(btn, busyLabel, isBusy, restoreLabel) {
    if (!btn) return;
    if (isBusy) {
        btn.dataset.restoreLabel = restoreLabel != null ? restoreLabel : btn.textContent;
        btn.textContent = busyLabel;
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-wait');
    } else {
        btn.textContent = btn.dataset.restoreLabel || btn.textContent;
        btn.disabled = false;
        btn.classList.remove('opacity-70', 'cursor-wait');
    }
}

function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideError(el) {
    if (!el) return;
    el.classList.add('hidden');
}

// One modal, opened lazily and reused across however many times ensureIdentified()
// needs it in a page's lifetime (it normally only needs it once).
function openGate(onResolved, options) {
    const opts = options || {};
    // 'ag-root' is the age gate (the dashboard / insider / claim-action path); 'ag-save'
    // is the end-of-module offer to keep a guest run; 'ag-returning' is the way back in for
    // someone who already has an account. Same panels underneath in every case — only the
    // way in differs, so there is exactly one sign-in UI on the site.
    const entryPanel = opts.entryPanel || 'ag-root';
    ensureModalInjected();
    const modal = document.getElementById('ag-modal');
    const emailInput = document.getElementById('ag-email-input');
    const passwordInput = document.getElementById('ag-password-input');
    const emailSubmitBtn = document.getElementById('ag-btn-email-submit');
    const toggleModeLink = document.getElementById('ag-link-toggle-mode');
    const signinError = document.getElementById('ag-signin-error');
    const redeemInput = document.getElementById('ag-redeem-input');
    const redeemSubmitBtn = document.getElementById('ag-btn-redeem-submit');
    const redeemError = document.getElementById('ag-redeem-error');
    const rootError = document.getElementById('ag-root-error');
    const codeDisplay = document.getElementById('ag-recruit-code-display');

    let emailMode = 'create'; // 'create' | 'signin'
    let pendingRecruitContinue = null;

    // No <form> wrapper here (this modal is injected, not a page-native form), so Enter
    // does nothing by default — wire it to the matching submit button. Assignment (not
    // addEventListener) so a second openGate() call replaces rather than stacks this.
    function onEnterSubmit(el, btnId) {
        if (!el) return;
        el.onkeydown = (e) => {
            if (e.key === 'Enter') document.getElementById(btnId)?.click();
        };
    }
    onEnterSubmit(emailInput, 'ag-btn-email-submit');
    onEnterSubmit(passwordInput, 'ag-btn-email-submit');
    onEnterSubmit(redeemInput, 'ag-btn-redeem-submit');

    function resolveAndClose(cancelled) {
        modal.classList.add('hidden-modal');
        modal.classList.remove('visible-modal');
        onResolved(cancelled === true);
    }

    function open() {
        showPanel(entryPanel);
        hideError(signinError);
        hideError(redeemError);
        hideError(rootError);
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (redeemInput) redeemInput.value = '';
        modal.classList.remove('hidden-modal');
        modal.classList.add('visible-modal');
    }

    // Backing out entirely (not just "Back" a panel) resolves as cancelled rather than
    // re-checking auth state — the caller (ensureIdentified) then correctly treats this
    // as "still not identified" instead of mistaking the pre-existing anonymous session
    // for a real answer.
    document.getElementById('ag-btn-close').onclick = () => {
        playSfx('click');
        // One panel is not safe to dismiss on a single tap: ag-recruit-new is showing the only
        // copy of a brand-new Recruit's code. Divert to the confirm panel instead of closing.
        // Nothing is resolved here, so the gate stays open and the code is still recoverable.
        const recruitPanel = document.getElementById('ag-recruit-new');
        if (recruitPanel && !recruitPanel.classList.contains('hidden')) {
            showPanel('ag-recruit-confirm');
            return;
        }
        resolveAndClose(true);
    };

    // Cancel: straight back to the code, still readable, gate still open.
    document.getElementById('ag-btn-recruit-keep').onclick = () => {
        playSfx('click');
        showPanel('ag-recruit-new');
    };

    // Confirm: this is the close the X originally did - resolved as cancelled, same as before.
    document.getElementById('ag-btn-recruit-discard').onclick = () => {
        playSfx('click');
        resolveAndClose(true);
    };

    document.getElementById('ag-btn-13plus').onclick = () => {
        playSfx('click');
        emailMode = 'create';
        if (emailSubmitBtn) emailSubmitBtn.textContent = 'Create Account';
        if (toggleModeLink) toggleModeLink.textContent = 'Already have an account? Sign in instead';
        hideError(signinError);
        showPanel('ag-signin');
    };

    document.getElementById('ag-back-from-signin').onclick = () => {
        playSfx('click');
        showPanel(entryPanel);
    };

    document.getElementById('ag-link-toggle-mode').onclick = () => {
        playSfx('click');
        emailMode = emailMode === 'create' ? 'signin' : 'create';
        if (emailSubmitBtn) emailSubmitBtn.textContent = emailMode === 'create' ? 'Create Account' : 'Sign In';
        if (toggleModeLink) toggleModeLink.textContent = emailMode === 'create' ? 'Already have an account? Sign in instead' : "Need an account? Create one";
        hideError(signinError);
    };

    document.getElementById('ag-btn-google').onclick = async () => {
        playSfx('click');
        hideError(signinError);
        const btn = document.getElementById('ag-btn-google');
        setBusy(btn, 'Connecting...', true);
        try {
            await window.AuthCore.googleSignIn();
            playSfx('confirm');
            resolveAndClose();
        } catch (e) {
            console.error('Google sign-in failed', e);
            const messages = {
                'auth/popup-blocked': 'Your browser blocked the sign-in popup — please allow popups for this site and try again.',
                'auth/unauthorized-domain': "This site isn't authorized for Google sign-in yet — contact the site admin.",
                'auth/cancelled-popup-request': 'Sign-in was interrupted. Please try again.',
            };
            if (e && e.code !== 'auth/popup-closed-by-user') {
                showError(signinError, messages[e && e.code] || 'Sign-in failed. Please try again.');
            }
        } finally {
            setBusy(btn, null, false);
        }
    };

    // --- RETURNING PANEL ----------------------------------------------------------
    // Google here is the SAME window.AuthCore.googleSignIn() the 13+ panel calls, which
    // links to an existing anonymous session rather than replacing it and preserves role
    // and classroomCode on the way through (see finalizeThirteenPlusAccount). A returning
    // teacher therefore lands back on their own account with their Task Force intact.
    const returningError = document.getElementById('ag-returning-error');

    document.getElementById('ag-link-returning').onclick = () => {
        playSfx('click');
        hideError(returningError);
        showPanel('ag-returning');
    };

    document.getElementById('ag-link-returning-new').onclick = () => {
        playSfx('click');
        showPanel('ag-root');
    };

    document.getElementById('ag-btn-returning-passphrase').onclick = () => {
        playSfx('click');
        hideError(redeemError);
        showPanel('ag-redeem');
    };

    document.getElementById('ag-btn-returning-email').onclick = () => {
        playSfx('click');
        emailMode = 'signin';
        if (emailSubmitBtn) emailSubmitBtn.textContent = 'Sign In';
        if (toggleModeLink) toggleModeLink.textContent = 'Need an account? Create one';
        hideError(signinError);
        showPanel('ag-signin');
    };

    document.getElementById('ag-btn-returning-google').onclick = async () => {
        playSfx('click');
        hideError(returningError);
        const btn = document.getElementById('ag-btn-returning-google');
        setBusy(btn, 'Connecting...', true);
        try {
            await window.AuthCore.googleSignIn();
            playSfx('confirm');
            resolveAndClose();
        } catch (e) {
            console.error('Google sign-in failed', e);
            const messages = {
                'auth/popup-blocked': 'Your browser blocked the sign-in popup — please allow popups for this site and try again.',
                'auth/unauthorized-domain': "This site isn't authorized for Google sign-in yet — contact the site admin.",
                'auth/cancelled-popup-request': 'Sign-in was interrupted. Please try again.',
            };
            if (e && e.code !== 'auth/popup-closed-by-user') {
                showError(returningError, messages[e && e.code] || 'Sign-in failed. Please try again.');
            }
        } finally {
            setBusy(btn, null, false);
        }
    };

    document.getElementById('ag-btn-email-submit').onclick = async () => {
        playSfx('click');
        hideError(signinError);
        const email = (emailInput.value || '').trim();
        const password = passwordInput.value || '';
        if (!email || !password) {
            showError(signinError, 'Enter an email and password.');
            return;
        }
        const btn = emailSubmitBtn;
        setBusy(btn, 'Connecting...', true);
        try {
            if (emailMode === 'create') {
                await window.AuthCore.createAccountWithEmail(email, password);
            } else {
                await window.AuthCore.signInWithEmail(email, password);
            }
            playSfx('confirm');
            resolveAndClose();
        } catch (e) {
            console.error('Email auth failed', e);
            const messages = {
                'auth/email-already-in-use': 'That email already has an account — try Sign In instead.',
                'auth/weak-password': 'Password should be at least 6 characters.',
                'auth/invalid-email': 'That email address doesn’t look right.',
                'auth/user-not-found': 'No account found for that email.',
                'auth/wrong-password': 'Incorrect password.',
                'auth/invalid-credential': 'Incorrect email or password.',
            };
            showError(signinError, messages[e && e.code] || 'Something went wrong. Please try again.');
        } finally {
            setBusy(btn, null, false);
        }
    };

    document.getElementById('ag-btn-under13').onclick = async () => {
        playSfx('click');
        hideError(rootError);
        const btn = document.getElementById('ag-btn-under13');
        setBusy(btn, 'Setting you up...', true);
        try {
            const result = await window.AuthCore.recruitSignIn();
            pendingRecruitContinue = resolveAndClose;
            if (result.isNewCode) {
                codeDisplay.textContent = result.code;
                showPanel('ag-recruit-new');
            } else {
                playSfx('confirm');
                resolveAndClose();
            }
        } catch (e) {
            console.error('Recruit sign-in failed', e);
            showError(rootError, 'Something went wrong setting up your account. Please try again.');
        } finally {
            setBusy(btn, null, false);
        }
    };

    // --- SAVE PANEL ---------------------------------------------------------
    // A code is assigned the instant this panel opens — not gated behind any click, and
    // not preceded by an age question. "Not now" just closes the offer afterward; by
    // then the code already exists whether or not the student remembers to write it
    // down. Only "Create an account" is genuinely optional here.
    const saveError = document.getElementById('ag-save-error');
    const saveNote = document.getElementById('ag-save-note');
    const saveCodeDisplay = document.getElementById('ag-save-code-display');

    async function ensureSaveCode() {
        if (!saveCodeDisplay) return;
        saveCodeDisplay.textContent = '…'; // reset in case a prior failed attempt left stale text
        hideError(saveError);
        try {
            const result = await window.AuthCore.claimGuestCode();
            saveCodeDisplay.textContent = result.code;
            if (saveNote) {
                if (result.changed) {
                    // Say it plainly rather than silently renaming someone who has been
                    // looking at the old name for the whole module.
                    saveNote.textContent = 'Heads up: ' + result.previousName + ' was taken while you were working, so your code is ' + result.displayName + ' instead. That is the one to write down.';
                    saveNote.classList.remove('hidden');
                } else {
                    saveNote.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error('[AuthGate] save-offer code claim failed', e);
            saveCodeDisplay.textContent = '—';
            showError(saveError, "Couldn't assign your code just now — Not now still keeps your current run going; try Save again later.");
        }
    }
    if (entryPanel === 'ag-save') ensureSaveCode();

    document.getElementById('ag-btn-save-13plus').onclick = () => {
        playSfx('click');
        emailMode = 'create';
        if (emailSubmitBtn) emailSubmitBtn.textContent = 'Create Account';
        if (toggleModeLink) toggleModeLink.textContent = 'Already have an account? Sign in instead';
        hideError(signinError);
        // The existing 13+ path already links a real credential onto this anonymous
        // session rather than creating a second account, so the uid — and everything
        // written under it during the guest run, including the code just assigned
        // above — survives the upgrade untouched.
        showPanel('ag-signin');
    };

    document.getElementById('ag-btn-save-copy-code').onclick = () => {
        const text = saveCodeDisplay ? saveCodeDisplay.textContent : '';
        if (text && text !== '…' && text !== '—' && navigator.clipboard) navigator.clipboard.writeText(text);
        playSfx('click');
    };

    document.getElementById('ag-btn-save-decline').onclick = () => {
        playSfx('click');
        resolveAndClose(true);
    };

    document.getElementById('ag-btn-copy-code').onclick = () => {
        const text = codeDisplay.textContent;
        if (text && navigator.clipboard) navigator.clipboard.writeText(text);
        playSfx('click');
    };

    document.getElementById('ag-btn-recruit-continue').onclick = () => {
        playSfx('confirm');
        if (pendingRecruitContinue) pendingRecruitContinue();
    };

    document.getElementById('ag-link-have-code').onclick = () => {
        playSfx('click');
        hideError(redeemError);
        showPanel('ag-redeem');
    };

    document.getElementById('ag-back-from-redeem').onclick = () => {
        playSfx('click');
        showPanel(entryPanel);
    };

    document.getElementById('ag-btn-redeem-submit').onclick = async () => {
        playSfx('click');
        hideError(redeemError);
        const code = redeemInput.value || '';
        if (!code.trim()) {
            showError(redeemError, 'Enter your Recruit Code.');
            return;
        }
        setBusy(redeemSubmitBtn, 'Checking...', true);
        try {
            const result = await window.AuthCore.redeemRecruitCode(code);
            if (!result.ok) {
                showError(redeemError, "Code not found — double check it and try again.");
                return;
            }
            playSfx('confirm');
            resolveAndClose();
        } catch (e) {
            console.error('Recruit code redemption failed', e);
            showError(redeemError, 'Something went wrong. Please try again.');
        } finally {
            setBusy(redeemSubmitBtn, null, false);
        }
    };

    open();
}

async function ensureIdentified(options) {
    const opts = options || {};
    showAuthSpinner();
    let user;
    try {
        user = await waitForAuthReady();
    } finally {
        hideAuthSpinner();
    }
    if (user) {
        const account = await window.AuthCore.getAccount(user.uid);
        if (isFullyIdentified(user, account)) return { user, account };
    }
    return new Promise((resolve) => {
        openGate(async (cancelled) => {
            if (cancelled) { resolve({ user: null, account: null }); return; }
            const freshUser = window.AuthCore.auth.currentUser;
            const account = freshUser ? await window.AuthCore.getAccount(freshUser.uid) : null;
            resolve({ user: freshUser, account });
        }, { entryPanel: opts.entryPanel || 'ag-root' });
    });
}

// The way back in for someone who already has an account. Identical to ensureIdentified()
// in every respect except which panel it opens on, so a returning teacher or Recruit is
// asked "how did you sign in before" rather than "are you 13 or older" — the latter is the
// right question for a new visitor and the one that was quietly walking returning users
// into a second, empty identity. A session that already clears the bar short-circuits here
// exactly as it does in ensureIdentified(), so this is safe to call unconditionally.
function signIn() {
    return ensureIdentified({ entryPanel: 'ag-returning' });
}

// --- GUEST-FIRST ENTRY -------------------------------------------------------
// What a GoodBlock or Challenge calls at its power-up moment now, in place of
// ensureIdentified(). Founder decision, 2026-09-09: nobody signs in to *start*
// anything. This establishes the anonymous session and the readable session name and
// gets out of the way — no modal, no age question, nothing to dismiss.
//
// It deliberately does NOT mount the "Save my progress" affordance: mounting it here put
// the FAB on screen mid-Case, in front of the lesson it was meant to follow. The save
// offer belongs after a completion, so offerSave() owns it now. ensureIdentified() itself
// is unchanged and still guards the dashboard, the roster and Task Force surfaces, the
// insider portal, and the save/claim action itself.
//
// options.affordance is still accepted and ignored so existing callers that pass
// { affordance: false } keep working.
async function startGuestSession(options) {
    let result;
    try {
        result = await window.AuthCore.guestStart();
    } catch (e) {
        // A failed sign-in must never keep a student out of the lesson. They get the
        // local session name and an unsaved run rather than a blocked page.
        console.error('[AuthGate] guestStart failed', e);
        return { user: null, account: null, isGuest: true, displayName: window.AuthCore.guestDisplayName() };
    }
    if (!result.isGuest) {
        removeSaveAffordance();
    }
    return result;
}

// The end-of-module offer. Each module calls this from its own revealCompletion(), i.e.
// once the badge and next steps are actually on screen — never on a timer racing the
// reveal, and never as a condition of it. The rating is optional and this does not depend
// on it: a student who skips the stars still reaches the reveal and still gets the offer.
// Declining hides nothing.
async function offerSave(options) {
    const opts = options || {};
    const user = window.AuthCore.auth.currentUser || await window.AuthCore.waitForAuthReady();
    if (user) {
        const account = await window.AuthCore.getAccount(user.uid);
        if (!user.isAnonymous || isFullyIdentified(user, account)) {
            // Already saved — nothing to offer.
            removeSaveAffordance();
            return { saved: true, alreadySaved: true, user, account };
        }
    }
    return new Promise((resolve) => {
        openGate(async (cancelled) => {
            if (cancelled) { resolve({ saved: false }); return; }
            removeSaveAffordance();
            const freshUser = window.AuthCore.auth.currentUser;
            const account = freshUser ? await window.AuthCore.getAccount(freshUser.uid) : null;
            resolve({ saved: true, user: freshUser, account });
        }, { entryPanel: 'ag-save', guestName: opts.guestName || window.AuthCore.guestDisplayName() });
    });
}

// Self-contained the same way showAuthSpinner is: inline styles only, so it renders
// identically on all eleven module pages regardless of each page's own Tailwind config.
// Doubles as the answer to "who am I?" — a guest sees their auto-assigned name here
// without having typed anything.
function mountSaveAffordance(displayName) {
    let el = document.getElementById('ag-save-fab');
    if (!el) {
        el = document.createElement('button');
        el.id = 'ag-save-fab';
        el.type = 'button';
        el.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9000;display:flex;flex-direction:column;' +
            'align-items:flex-start;gap:2px;max-width:calc(100vw - 28px);background:#FFFFFF;color:#17272C;' +
            'border:1.5px solid #D8DFE1;border-radius:12px;padding:8px 14px;cursor:pointer;text-align:left;' +
            'font-family:inherit;box-shadow:0 6px 18px -8px rgba(23,39,44,.5);';
        el.addEventListener('click', () => { offerSave({}); });
        document.body.appendChild(el);
    }
    el.innerHTML = '';
    const label = document.createElement('span');
    label.style.cssText = 'font-size:12px;font-weight:700;letter-spacing:.01em;';
    label.textContent = 'Save my progress';
    const who = document.createElement('span');
    who.style.cssText = 'font-size:11px;color:#5C6E75;';
    who.textContent = "You're " + displayName;
    el.appendChild(label);
    el.appendChild(who);
    el.setAttribute('aria-label', "Save my progress. You're currently " + displayName + '.');
}

function removeSaveAffordance() {
    const el = document.getElementById('ag-save-fab');
    if (el) el.remove();
}

// Every completion screen (GoodBlock badge reveal, Challenge end screen, a game's own
// end screen) auto-offers a save a beat after it appears, timed to let the reveal
// animation settle first. That auto-offer is a courtesy, not the actual guarantee — a
// student who taps Home, Next Lab, Retake, or any other button that leaves the screen
// BEFORE that timer fires abandons the pending offer along with the page, and it never
// happens. Wrap every such button's click handler in this instead of calling the
// navigation directly: it forces the save offer to happen first (skipped instantly if
// it already has, or if offerSave() itself decides nothing needs offering), and only
// then runs the actual navigation — so leaving the screen can no longer race the timer.
// Uses the same window._agSaveOffered flag every completion screen already sets, so it
// coexists with the existing auto-offer instead of double-prompting.
// window._agCompletionReached is set by the page itself (revealCompletion(), a
// Challenge's own end-screen render, a game's showEnd()) the moment there's actually
// something worth saving — NOT by this function. That's what makes guardedLeave() safe
// to wrap around shared, page-wide navigation (the Home icon, Restart) rather than only
// buttons physically inside the completion screen: pressing Home mid-lesson, before
// anything is reached, passes straight through with no offer and no delay.
async function guardedLeave(navigate) {
    if (window._agCompletionReached && !window._agSaveOffered && window.AuthGate && window.AuthGate.offerSave) {
        window._agSaveOffered = true;
        try {
            await window.AuthGate.offerSave();
        } catch (e) {
            console.error('[AuthGate] guardedLeave: offerSave failed', e);
        }
    }
    navigate();
}

window.AuthGate = {
    ensureIdentified,
    signIn,
    startGuestSession,
    offerSave,
    guardedLeave,
    mountSaveAffordance,
    removeSaveAffordance,
};
