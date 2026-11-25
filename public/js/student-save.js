// OPTIONAL STUDENT SAVE (2026-11-24). Keeps a student's progress across devices, offered
// from the dashboard only, and only when the student asks. Nothing here runs before
// content: every student still plays at once in an anonymous session (auth-core.js).
//
// SAME STUDENT, NOT A COPY. Saving LINKS a sign-in method onto the anonymous user the
// student already has — exactly as teacher sign-in does in auth-core.js — so the uid never
// changes, and progress, scores and class membership stay where they are. Opening a save on
// another device signs into that same uid. (The September classroom test's duplicate roster
// rows came from copying progress into a new uid; this never copies anything.)
//
//   - 13 or older: Google, linked onto the anonymous user. If that Google account already
//     exists, the student is signed into it instead and told so (saveWithGoogle).
//   - Under 13 (or anyone who prefers it): a SAVE CODE, three words and four digits,
//     e.g. MAPLE-RIVER-COMET-4821, generated on this device. It becomes an email/password
//     credential that exists only in Firebase Auth: the "email" is a hash of the code at
//     save.allgoodacademy.com, a domain that never receives mail, and the password is the
//     code itself. The email is never shown, sent or verified. Because the address is a
//     hash of the WHOLE code, the address alone reveals nothing and every guess needs the
//     full ~43-bit code (see save-words.js), behind Firebase's own attempt limits.
//
// THE CODE NEVER REACHES FIRESTORE. Teachers can read a student's users/{uid} profile and
// every subcollection under it (firestore.rules, the teacher-read rules on users/{userId}),
// so a code stored there would let a teacher open the student's account. This file does
// not import Firestore at all; the only thing it hands to Firestore is the student's chosen
// name, through AuthCore.writeStudentProfile. The code lives in this device's localStorage
// (CODE_KEY) for the dashboard's Show button and nowhere else; if storage is cleared, the
// student uses the copy they wrote down. scripts/check-invariants.js ("save-code") fails
// the build if this file starts importing Firestore or the code key appears anywhere else.
//
// No telemetry here: a name, an email or a code must never reach the events stream.

import { SAVE_WORDS } from '/js/save-words.js';
import {
    GoogleAuthProvider, EmailAuthProvider, linkWithCredential, linkWithPopup,
    signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut,
    getAdditionalUserInfo, updateCurrentUser,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';

export const SAVE_DOMAIN = 'save.allgoodacademy.com';
const CODE_KEY = 'ag_save_code';
// The age answer, for this browser session only (sessionStorage). Once a student answers
// "No", Google is not offered again in this session and the question is not asked again,
// so the answer cannot be changed by going back (FTC guidance for a neutral age screen).
const AGE_KEY = 'ag_age_answer';

function core() { return window.AuthCore; }

// --- the code ---------------------------------------------------------------------------
function randomInt(n) {
    // Rejection sampling, so every word is equally likely.
    const limit = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % n;
}

export function generateSaveCode() {
    const picked = [];
    while (picked.length < 3) {
        const w = SAVE_WORDS[randomInt(SAVE_WORDS.length)];
        if (!picked.includes(w)) picked.push(w);
    }
    const digits = String(randomInt(10000)).padStart(4, '0');
    return [...picked, digits].join('-').toUpperCase();
}

const WORD_SET = new Set(SAVE_WORDS);

// Forgiving: case, spaces, dots and underscores all become the canonical
// WORD-WORD-WORD-1234 a child is retyping from a sticky note. Returns '' when it can't be a
// save code at all, so the caller can say so without a network round trip.
export function normalizeSaveCode(raw) {
    const parts = String(raw || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    if (parts.length !== 4) return '';
    const [a, b, c, d] = parts;
    if (![a, b, c].every((w) => WORD_SET.has(w)) || !/^\d{4}$/.test(d)) return '';
    return [a, b, c, d].join('-').toUpperCase();
}

// The synthetic sign-in address for a code. Never shown, sent or verified.
async function saveEmail(code) {
    const bytes = new TextEncoder().encode(`allgood-save-v1:${code}`);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const hex = [...digest].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
    return `s${hex}@${SAVE_DOMAIN}`;
}

// --- this device ------------------------------------------------------------------------
function store(key, value) {
    try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (e) { /* storage blocked */ }
}
export function shownCode() {
    try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; }
}
export function ageAnswer() {
    try { return sessionStorage.getItem(AGE_KEY) || ''; } catch (e) { return ''; }
}
export function setAgeAnswer(answer) {
    // "No" is final for the session; "Yes" may still choose a save code, which is not a change.
    if (ageAnswer() === 'no') return;
    try { sessionStorage.setItem(AGE_KEY, answer === 'yes' ? 'yes' : 'no'); } catch (e) { /* ignore */ }
}
export function googleAllowed() { return ageAnswer() !== 'no'; }

// A student session is never an "account" for analytics: GA4 on the dashboard loads only
// behind ag_account (signed-in teachers). Saving or opening a save clears it, fail-closed.
function markStudentSession() {
    core().markSignedIn();
    store('ag_account', null);
}

// 'code' | 'google' | null (anonymous, not saved) | 'account' (a teacher or legacy account).
export function saveState(user) {
    if (!user || user.isAnonymous) return null;
    const providers = user.providerData || [];
    if (providers.some((p) => p.providerId === 'password' && String(p.email || '').endsWith(`@${SAVE_DOMAIN}`))) return 'code';
    if (providers.some((p) => p.providerId === 'google.com')) return 'google';
    return 'account';
}

// --- save -------------------------------------------------------------------------------
// Under 13 (or by choice): a first name or nickname, then a code linked onto this session.
export async function saveWithCode(name) {
    const user = core().auth.currentUser;
    if (!user || !user.isAnonymous) throw Object.assign(new Error('not an anonymous session'), { code: 'save/not-anonymous' });
    let code;
    for (let tries = 0; ; tries++) {
        code = generateSaveCode();
        try {
            await linkWithCredential(user, EmailAuthProvider.credential(await saveEmail(code), code));
            break;
        } catch (e) {
            // A code someone already has (vanishingly rare): draw another.
            if (tries < 3 && /email-already-in-use|credential-already-in-use/.test(e.code || '')) continue;
            throw e;
        }
    }
    store(CODE_KEY, code);
    markStudentSession();
    // The name only. The code is never passed to Firestore.
    if (name) await core().writeStudentProfile(user, { displayName: name });
    return { code };
}

// 13 or older. Must be called straight from a click, before any await, so the popup opens.
// Returns { existing: true } when that Google account already had a save and this device
// was signed into it instead (what was done on this device before is not moved over).
export async function saveWithGoogle() {
    if (!googleAllowed()) throw Object.assign(new Error('Google is not offered this session'), { code: 'save/age' });
    const { auth } = core();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const current = auth.currentUser;
    let existing = false;
    if (current && current.isAnonymous) {
        try {
            await linkWithPopup(current, provider);
        } catch (e) {
            if (e.code !== 'auth/credential-already-in-use') throw e;
            // That Google account already has a save: sign into it (same as teacher sign-in).
            const cred = GoogleAuthProvider.credentialFromError(e);
            if (!cred) throw e;
            await signInWithCredential(auth, cred);
            existing = true;
        }
    } else {
        await signInWithPopup(auth, provider);
        existing = true;
    }
    markStudentSession();
    return { existing };
}

// --- open a save on another device -------------------------------------------------------
export async function openWithCode(raw) {
    const code = normalizeSaveCode(raw);
    if (!code) return { ok: false, reason: 'format' };
    try {
        await signInWithEmailAndPassword(core().auth, await saveEmail(code), code);
    } catch (e) {
        if (/invalid-credential|user-not-found|wrong-password|invalid-login-credentials|invalid-email/.test(e.code || '')) return { ok: false, reason: 'not_found' };
        if (/too-many-requests/.test(e.code || '')) return { ok: false, reason: 'rate' };
        throw e;
    }
    store(CODE_KEY, code);
    markStudentSession();
    return { ok: true };
}

// "Use Google" on a new device. Never mints an account: a Google sign-in that turns out to
// CREATE one (no save exists) is deleted on the spot and this device's anonymous session is
// put back, so a student who skipped the age question cannot make a Google save this way.
export async function openWithGoogle() {
    if (!googleAllowed()) return { ok: false, reason: 'age' };
    const { auth } = core();
    const before = auth.currentUser;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const info = getAdditionalUserInfo(result);
    if (info && info.isNewUser) {
        try { await result.user.delete(); } catch (e) { console.warn('[StudentSave] could not remove new account', e); }
        if (before) { try { await updateCurrentUser(auth, before); } catch (e) { /* a fresh session starts on reload */ } }
        return { ok: false, reason: 'not_found' };
    }
    markStudentSession();
    return { ok: true };
}

// Shared Chromebooks: leave this device. The save itself is untouched.
export async function signOutDevice() {
    await signOut(core().auth);
    store(CODE_KEY, null);
    core().clearSignedIn();
}

window.StudentSave = {
    SAVE_DOMAIN, generateSaveCode, normalizeSaveCode, shownCode, ageAnswer, setAgeAnswer, googleAllowed,
    saveState, saveWithCode, saveWithGoogle, openWithCode, openWithGoogle, signOutDevice,
};
