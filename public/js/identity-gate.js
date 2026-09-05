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
// window.AuthGate.ensureIdentified() is the one thing a caller needs: it resolves
// once the *current* session meets the bar above, showing the gate UI first if it
// doesn't. Call it before unlocking any real content — at dashboard launch time, and
// at each module's own power-up moment, so a direct/deep-linked visit gets the same
// gate a dashboard visit does.

function waitForAuthReady() {
    return new Promise((resolve) => {
        // Guard against a synchronous first callback (real Firebase always fires
        // async, but nothing about this function should depend on that): `unsub`
        // isn't assigned yet in that case, so just skip calling it once.
        let unsub;
        unsub = window.AuthCore.onAuthStateChanged(window.AuthCore.auth, (user) => {
            if (unsub) unsub();
            resolve(user);
        });
    });
}

function isFullyIdentified(user, account) {
    if (!user || !account) return false;
    if (account.ageTier === '13plus') return !user.isAnonymous;
    if (account.ageTier === 'under13') return !!account.recruitCode;
    return false;
}

const TEMPLATE = `
<div id="ag-modal" class="absolute inset-0 z-[9999] bg-allgood-dark/95 flex items-center justify-center p-6 hidden-modal modal-transition backdrop-blur-sm">
    <div class="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full text-center border-t-4 border-allgood-primary">
        <div class="mb-6"><h2 class="text-3xl font-heading font-bold text-allgood-dark">Allgood<span class="text-allgood-primary">Academy</span></h2></div>

        <!-- ROOT: age question and path choice merged into one decision. -->
        <div id="ag-root">
            <h2 class="text-xl font-bold text-allgood-dark mb-1 font-heading">Let's get you in.</h2>
            <p class="text-gray-500 text-xs mb-6 font-body">First — are you 13 or older?</p>
            <button id="ag-btn-13plus" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded shadow-md transition-transform transform hover:scale-[1.02] active:scale-[0.98] font-body uppercase mb-3">
                I'm 13 or older &mdash; Sign In
            </button>
            <button id="ag-btn-under13" class="w-full bg-white border-2 border-allgood-secondary text-allgood-secondary hover:bg-allgood-secondary hover:text-white font-bold py-3 rounded shadow-sm transition-all font-body uppercase mb-4">
                I'm younger than 13 &mdash; Get My Recruit Code
            </button>
            <button id="ag-link-have-code" class="text-xs text-gray-400 hover:text-allgood-primary underline decoration-dotted font-body">Already have a Recruit Code? Enter it here</button>
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
            <div class="bg-slate-50 border-2 border-dashed border-allgood-secondary rounded-lg py-4 px-3 mb-2">
                <span id="ag-recruit-code-display" class="text-lg font-heading font-bold text-allgood-secondary tracking-wide break-words"></span>
            </div>
            <button id="ag-btn-copy-code" class="text-xs text-allgood-primary hover:text-allgood-hover underline decoration-dotted mb-4 font-body">Copy code</button>
            <p class="text-[11px] text-gray-400 mb-4 font-body">Don't lose this &mdash; there's no other way back in.</p>
            <button id="ag-btn-recruit-continue" class="w-full bg-allgood-primary hover:bg-allgood-hover text-white font-bold py-3 rounded shadow-md transition-transform transform hover:scale-[1.02] active:scale-[0.98] font-body uppercase">Let's Go!</button>
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
    ['ag-root', 'ag-signin', 'ag-recruit-new', 'ag-redeem'].forEach((panelId) => {
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
function openGate(onResolved) {
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

    function resolveAndClose() {
        modal.classList.add('hidden-modal');
        modal.classList.remove('visible-modal');
        onResolved();
    }

    function open() {
        showPanel('ag-root');
        hideError(signinError);
        hideError(redeemError);
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (redeemInput) redeemInput.value = '';
        modal.classList.remove('hidden-modal');
        modal.classList.add('visible-modal');
    }

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
        showPanel('ag-root');
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
            if (e && e.code !== 'auth/popup-closed-by-user') {
                showError(signinError, 'Sign-in failed. Please try again.');
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
        } finally {
            setBusy(btn, null, false);
        }
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
        showPanel('ag-root');
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

async function ensureIdentified() {
    const user = await waitForAuthReady();
    if (user) {
        const account = await window.AuthCore.getAccount(user.uid);
        if (isFullyIdentified(user, account)) return { user, account };
    }
    return new Promise((resolve) => {
        openGate(async () => {
            const freshUser = window.AuthCore.auth.currentUser;
            const account = freshUser ? await window.AuthCore.getAccount(freshUser.uid) : null;
            resolve({ user: freshUser, account });
        });
    });
}

window.AuthGate = { ensureIdentified };
