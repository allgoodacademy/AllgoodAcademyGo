// Shared Firebase auth/identity module for every Allgood Academy portal.
//
// Privacy model (COPPA-aware):
//   - Students never provide a name or email. They sign in anonymously and pick
//     a non-identifying nickname (or get a random one). Nothing PII-shaped is
//     ever written for the student flow.
//   - Teachers/staff are adults consenting for themselves, so real Google
//     identity (name + email) is fine for that path only. A teacher must accept
//     a plain-language consent notice before their first classroom is created.
//
// Every module page should load this file (`<script type="module" src="/js/auth-core.js">`)
// instead of inlining its own Firebase config/init/login code, so a future policy
// or schema change only has to happen here.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
    getAuth, signInAnonymously, onAuthStateChanged, updateProfile, signOut,
    GoogleAuthProvider, signInWithPopup, signInWithCredential, linkWithPopup, linkWithCredential,
    EmailAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
    getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAf2SO8xovrApl52udUUoR1n9WBnERr_ko",
    authDomain: "allgood-academy.firebaseapp.com",
    projectId: "allgood-academy",
    storageBucket: "allgood-academy.firebasestorage.app",
    messagingSenderId: "978829044870",
    appId: "1:978829044870:web:6c780f64230a77ad0ab507",
    measurementId: "G-EN4M7T3BLQ"
};
const appId = 'allgood-academy';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- SESSION ACTIVITY: skip the power-up screen on every page while someone is
// actively moving around the site. A shared localStorage key (this domain only)
// means the dashboard and every module all read/write the same rolling
// timestamp — no cross-page syncing needed. Deliberately a rolling window, not
// a calendar-day reset or literal tab-close detection: someone bouncing between
// the dashboard and a module never sees it twice, but walking away for over an
// hour brings it back.
const ACTIVITY_KEY = 'aa_last_activity';
const ACTIVITY_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function wasRecentlyActive() {
    try {
        const last = parseInt(localStorage.getItem(ACTIVITY_KEY), 10);
        return !!last && (Date.now() - last) < ACTIVITY_WINDOW_MS;
    } catch (e) {
        return false;
    }
}

function markActivity() {
    try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch (e) { /* ignore */ }
}

// Decide BEFORE this visit updates the timestamp, so "was I already active
// coming into this page load" is answered honestly rather than always true.
const skipPowerUp = wasRecentlyActive();
markActivity();
document.addEventListener('click', markActivity, { passive: true });

// --- SIGNED-IN ROUTING FLAG: a synchronous hint for the marketing site (/) and the
// dashboard (/dashboard/), both of which decide which page a visitor belongs on before
// anything renders. Firebase resolves auth asynchronously from IndexedDB, so an
// onAuthStateChanged redirect always shows a frame of the wrong page first. This flag is
// deliberately NOT an auth check and nothing real is ever gated on it — every actual
// check still runs through identity-gate.js and firestore.rules. Worst case it is stale,
// someone lands on the wrong page, and one click fixes it.
//
// Set whenever a session RESOLVES, anonymous included. It answers "does this browser have
// a session at all", not "is this person identified" — the marketing homepage is for
// visitors with none. A guest who finished a GoodBlock has progress of their own to look
// at, so bouncing them off /dashboard/ was hiding their own work from them.
//
// Identity is a separate question and is still asked separately: Task Force setup, the
// roster and the insider portal all go through ensureIdentified() (or, for the roster,
// firestore.rules), and none of them accept an anonymous session.
const SIGNED_IN_KEY = 'ag_signed_in';

function markSignedIn() {
    try { localStorage.setItem(SIGNED_IN_KEY, '1'); } catch (e) { /* ignore */ }
}

function clearSignedIn() {
    try { localStorage.removeItem(SIGNED_IN_KEY); localStorage.removeItem(ACCOUNT_KEY); } catch (e) { /* ignore */ }
}

// A SECOND, narrower hint: this session belongs to a real, non-anonymous account.
// ag_signed_in answers "is there a session"; this answers "is it an account", and only
// this one may trigger an automatic redirect away from the marketing homepage.
//
// The distinction matters because the two guards want different questions answered.
// /dashboard/ asks "is there anything of yours to show" — a guest with an anonymous
// session qualifies, so they keep access. The homepage asks "should I send this person
// somewhere else without being asked" — and for a guest the answer is no. Keying the
// homepage on session-presence trapped every guest who had finished a GoodBlock: they
// could never see the marketing site again, which broke the returning teacher, the
// student browsing another pack, and anyone arriving from search.
//
// Set only from finalizeThirteenPlusAccount(), the one path that produces a
// non-anonymous Firebase user. A Learner Recruit is deliberately NOT included: they are
// identified, but they are still isAnonymous in Firebase terms, and they are a student
// who may well want the marketing site. They reach the dashboard the same way a guest
// does — the nav link, the in-lab Dashboard button, or the URL.
const ACCOUNT_KEY = 'ag_account';

function markAccount() {
    try { localStorage.setItem(ACCOUNT_KEY, '1'); } catch (e) { /* ignore */ }
}

const ADJECTIVES = ['Swift', 'Brave', 'Clever', 'Quiet', 'Bold', 'Curious', 'Bright', 'Calm', 'Sharp', 'Steady'];
const ANIMALS = ['Falcon', 'Otter', 'Panther', 'Fox', 'Owl', 'Wolf', 'Hawk', 'Lynx', 'Heron', 'Badger'];

function randomNickname() {
    const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const n = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    return `${a} ${n} ${num}`;
}

// Avatars for the under-13 "Learner Recruit" tier — assigned automatically, never chosen
// at signup, since that tier gets zero form fields before their first course starts.
// Customizing this later from the profile screen just picks a different entry here.
// Keys (not emoji) into the "Op-Squad" icon set rendered by index.html.
const AVATARS = ['frog', 'owl', 'wolf', 'panda', 'koala', 'bee', 'turtle', 'hedgehog', 'octopus', 'eagle'];

// Accounts created before the Op-Squad icon set replaced the plain-animal-emoji set had
// their avatar stored as a raw emoji. Maps each retired emoji to its closest surviving
// icon so those accounts don't end up with an avatar nothing can render.
const LEGACY_AVATAR_MAP = {
    '🦊': 'wolf', '🦁': 'wolf', '🦋': 'bee',
    '🦉': 'owl', '🐺': 'wolf', '🦅': 'eagle', '🐨': 'koala',
    '🐼': 'panda', '🐢': 'turtle', '🦔': 'hedgehog', '🐝': 'bee', '🐙': 'octopus',
};

function normalizeAvatar(value) {
    if (!value) return value || null;
    if (AVATARS.includes(value)) return value;
    return LEGACY_AVATAR_MAP[value] || null;
}

function randomAvatar() {
    return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

function userRef(uid) {
    return doc(db, 'artifacts', appId, 'users', uid);
}

function moduleProgressRef(uid, moduleSlug) {
    return doc(db, 'artifacts', appId, 'users', uid, 'module_progress', moduleSlug);
}

// One doc per student per module — same shape as module_progress, just a different
// subcollection — holding what that student told Jodi during that module, for a later
// GoodBlock to deliberately reference back (see jodi-character-bible.md's "callbacks are
// load-bearing, not decorative" trait). Already covered by the existing owner read/write
// rule on artifacts/{appId}/users/{userId}/{document=**}, so no firestore.rules change is
// needed to add this. Nothing reads it yet — Social Intelligence is the first GoodBlock to
// write here — but the path needs to exist now rather than be retrofitted once a second
// GoodBlock needs to read it.
function continuityBankRef(uid, moduleSlug) {
    return doc(db, 'artifacts', appId, 'users', uid, 'continuity_bank', moduleSlug);
}

async function recordContinuityEntry(moduleSlug, key, value) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(continuityBankRef(user.uid, moduleSlug), {
            [key]: value,
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.error('[AuthCore] recordContinuityEntry failed', e);
    }
}

// --- SILENT POWER-UP SIGN-IN: an anonymous identity with a random nickname, created
// invisibly the instant someone powers up with no existing session — before any age or
// identify question. This is the ONE remaining anonymous-with-no-real-identify path;
// everything past this point requires going through the actual gate (Sign In for 13+,
// a Recruit Code for under-13) before a real launch is allowed. Never sets ageTier —
// that only gets recorded once the gate itself is answered.
async function silentSignIn() {
    const cred = await signInAnonymously(auth);
    const user = cred.user;

    const ref = userRef(user.uid);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : null;
    const role = (existingData && existingData.role) ? existingData.role : 'student';

    // Don't rename someone who already has a name. signInAnonymously() returns the
    // EXISTING anonymous user when there is one, so a student arriving here straight from
    // a GoodBlock is the same uid that just earned a passphrase name — overwriting it with
    // a fresh random nickname made the dashboard disown the run they had just finished.
    const nickname = (existingData && existingData.displayName) || user.displayName || randomNickname();
    if (user.displayName !== nickname) {
        try { await updateProfile(user, { displayName: nickname }); } catch (e) { console.error('[AuthCore] updateProfile failed', e); }
    }

    const payload = {
        displayName: nickname,
        email: null,
        isGuest: true,
        role,
        lastLogin: serverTimestamp(),
    };
    if (existingData && existingData.classroomCode) payload.classroomCode = existingData.classroomCode;

    await setDoc(ref, payload, { merge: true });
    markSignedIn();
    return user;
}

// --- RECRUIT CODE: a memorable three-word passphrase (descriptor + animal + flavor
// word — e.g. "arctic-fox-trot") assigned to every Learner Recruit instead of a random
// alphanumeric string. It does three jobs at once: it's their display name from the
// first second (no separate nickname-then-avatar setup), it's simple enough for a young
// child to remember and retype, and it's the reconnection point that lets them reclaim
// their progress on a different device — something a same-device-only anonymous session
// can't do on its own. Lists are lightly curated (positive/neutral descriptors, common
// kid-friendly animals, movement-themed flavor words) so no combination lands on
// anything awkward. Combined space is ~20*20*15 = 6000 combos; uniqueness is still
// checked against Firestore rather than trusted to the random draw.
const RECRUIT_DESCRIPTORS = ['Arctic', 'Shadow', 'Golden', 'Silver', 'Crimson', 'Midnight', 'Storm', 'Sunny', 'Frosty', 'Rusty', 'Jolly', 'Brave', 'Swift', 'Clever', 'Mighty', 'Cosmic', 'Electric', 'Velvet', 'Turbo', 'Lucky'];
const RECRUIT_ANIMALS = ['Fox', 'Wolf', 'Bear', 'Hawk', 'Otter', 'Panther', 'Falcon', 'Tiger', 'Owl', 'Lynx', 'Badger', 'Dolphin', 'Eagle', 'Panda', 'Raccoon', 'Rabbit', 'Koala', 'Penguin', 'Shark', 'Dragon'];
const RECRUIT_FLAVORS = ['Trot', 'Dash', 'Blanco', 'Run', 'Hop', 'Zoom', 'Bolt', 'Glide', 'Spin', 'Flash', 'Drift', 'Leap', 'Sprint', 'Wander', 'Roam'];

function randomFrom(list) { return list[Math.floor(Math.random() * list.length)]; }

function recruitCodeRef(code) {
    return doc(db, 'artifacts', appId, 'recruit_codes', code);
}

// "arctic-fox-trot" -> "Arctic Fox Trot" — the code IS the display name, just cased
// for reading rather than typing.
function codeToDisplayName(code) {
    return code.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Forgiving on the way back in: case, extra spaces, and space-vs-hyphen typing all
// normalize to the same stored key, since a young child is retyping this from memory.
function normalizeRecruitCode(raw) {
    return String(raw || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
}

async function generateUniqueRecruitCode() {
    for (let i = 0; i < 20; i++) {
        const code = [randomFrom(RECRUIT_DESCRIPTORS), randomFrom(RECRUIT_ANIMALS), randomFrom(RECRUIT_FLAVORS)].join('-').toLowerCase();
        const snap = await getDoc(recruitCodeRef(code));
        if (!snap.exists()) return code;
    }
    // 20 collisions in a ~6000-word space would mean something is wrong upstream, but
    // this guarantees termination rather than looping forever.
    return [randomFrom(RECRUIT_DESCRIPTORS), randomFrom(RECRUIT_ANIMALS), randomFrom(RECRUIT_FLAVORS), Math.floor(Math.random() * 90 + 10)].join('-').toLowerCase();
}

// --- AUTH READY: one place to await Firebase's first onAuthStateChanged callback, so a
// page that needs the resolved session (rather than whatever auth.currentUser happens to
// be mid-restore) doesn't have to hand-roll this. Bounded for the same reason
// identity-gate.js bounds its own copy: a dropped network during state determination
// should degrade to "treated as signed out," never to a page that never continues.
function waitForAuthReady(timeoutMs = 8000) {
    return new Promise((resolve) => {
        if (auth.currentUser) { resolve(auth.currentUser); return; }
        let settled = false;
        let unsub;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            if (unsub) unsub();
            console.warn('[AuthCore] auth state did not resolve in time; proceeding as signed-out.');
            resolve(null);
        }, timeoutMs);
        unsub = onAuthStateChanged(auth, (user) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (unsub) unsub();
            resolve(user);
        });
    });
}

// --- GUEST SESSION NAME: the same descriptor-animal-flavor word space a Recruit Code
// comes from, drawn LOCALLY with no Firestore read or write. That distinction is the
// whole design decision here: generateUniqueRecruitCode() reserves a document to prove
// uniqueness, and calling it on entry would reserve a code for every visitor who bounces,
// filling the namespace with claims nobody ever made. A guest gets a session *name*; a
// real code is minted and reserved only at claim time (see claimRecruitCode below).
//
// Kept in localStorage so the name is stable across pages and reloads within a browser —
// someone who has been "Arctic Fox Trot" for twenty minutes should still be Arctic Fox
// Trot on the next GoodBlock, and should keep that name if they choose to claim it.
const GUEST_CODE_KEY = 'ag_guest_code';

function drawLocalCode() {
    return [randomFrom(RECRUIT_DESCRIPTORS), randomFrom(RECRUIT_ANIMALS), randomFrom(RECRUIT_FLAVORS)].join('-').toLowerCase();
}

function getOrCreateGuestCode() {
    try {
        const stored = normalizeRecruitCode(localStorage.getItem(GUEST_CODE_KEY));
        if (stored && stored.split('-').length === 3) return stored;
    } catch (e) { /* storage blocked — fall through and draw a fresh one per page */ }
    const code = drawLocalCode();
    try { localStorage.setItem(GUEST_CODE_KEY, code); } catch (e) { /* ignore */ }
    return code;
}

function clearGuestCode() {
    try { localStorage.removeItem(GUEST_CODE_KEY); } catch (e) { /* ignore */ }
}

// --- GUEST-FIRST ENTRY: what a GoodBlock or Challenge calls at its power-up moment,
// replacing the identify gate that used to fire there. Nobody signs in to *start*
// anything — an anonymous session and a readable name are established silently and the
// content renders. Identity is asked for at the end, or when they choose to save.
//
// Deliberately non-destructive: a session that is already identified (a real 13+ account,
// or a Recruit with a code on file) passes straight through with its own name intact.
// Never writes ageTier and never touches recruit_codes.
async function guestStart() {
    let user = await waitForAuthReady();
    if (!user) {
        user = (await signInAnonymously(auth)).user;
    }

    // A session exists from here on, so the routing flag goes up now — before any
    // Firestore write that could fail and strand the student on the marketing page.
    markSignedIn();

    const account = await getAccount(user.uid);
    if (!user.isAnonymous || account.recruitCode) {
        return {
            user,
            account,
            isGuest: false,
            displayName: account.displayName || user.displayName || null,
        };
    }

    const code = getOrCreateGuestCode();
    const displayName = codeToDisplayName(code);
    if (user.displayName !== displayName) {
        try { await updateProfile(user, { displayName }); } catch (e) { console.error('[AuthCore] updateProfile failed', e); }
    }

    const payload = {
        displayName,
        email: null,
        isGuest: true,
        role: account.role || 'student',
        guestCode: code,
        lastLogin: serverTimestamp(),
    };
    try {
        await setDoc(userRef(user.uid), payload, { merge: true });
    } catch (e) {
        // A failed profile write must not stop the lesson from opening — the name is
        // already on the auth object and in localStorage either way.
        console.error('[AuthCore] guestStart profile write failed', e);
    }

    return { user, account: { ...account, displayName, role: account.role || 'student' }, isGuest: true, displayName };
}

function guestDisplayName() {
    return codeToDisplayName(getOrCreateGuestCode());
}

// Copies whatever this session already wrote to module_progress onto the code document
// at claim time. saveModuleProgress mirrors going forward, but everything written while
// they were still an unclaimed guest predates the code existing — without this, an
// under-13 who claims at the end of a GoodBlock would redeem their code on a second
// device and find it empty.
async function backfillRecruitProgress(uid, code) {
    try {
        const snaps = await getDocs(collection(db, 'artifacts', appId, 'users', uid, 'module_progress'));
        const progress = {};
        snaps.forEach((d) => { progress[d.id] = d.data(); });
        if (Object.keys(progress).length === 0) return;
        await setDoc(recruitCodeRef(code), { progress, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
        console.error('[AuthCore] backfillRecruitProgress failed', e);
    }
}

// --- CLAIM (under 13): the ONLY path that mints and reserves a real Recruit Code. Tries
// the name they have been looking at all session first, so claiming doesn't rename them
// out from under themselves; falls back to a fresh unique code if that one has been taken
// in the meantime, and reports `changed: true` so the caller can say so plainly on screen.
// Collects no name, no email, no birthday — same as recruitSignIn.
async function claimRecruitCode() {
    const user = auth.currentUser || (await waitForAuthReady()) || (await signInAnonymously(auth)).user;

    const existing = await getAccount(user.uid);
    if (existing.recruitCode) {
        return {
            code: existing.recruitCode,
            displayName: existing.displayName || codeToDisplayName(existing.recruitCode),
            changed: false,
            alreadyClaimed: true,
        };
    }

    const preferred = getOrCreateGuestCode();
    let code = preferred;
    let changed = false;
    const taken = await getDoc(recruitCodeRef(preferred));
    if (taken.exists()) {
        code = await generateUniqueRecruitCode();
        changed = true;
    }

    const displayName = codeToDisplayName(code);
    const avatar = normalizeAvatar(existing.avatar) || randomAvatar();

    await setDoc(recruitCodeRef(code), {
        uid: user.uid,
        displayName,
        avatar,
        progress: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    try { await updateProfile(user, { displayName }); } catch (e) { console.error('[AuthCore] updateProfile failed', e); }

    await setDoc(userRef(user.uid), {
        displayName,
        avatar,
        email: null,
        isGuest: true,
        role: existing.role || 'student',
        ageTier: 'under13',
        recruitCode: code,
        lastLogin: serverTimestamp(),
    }, { merge: true });

    await backfillRecruitProgress(user.uid, code);

    try { localStorage.setItem(GUEST_CODE_KEY, code); } catch (e) { /* ignore */ }
    markSignedIn();

    return { code, displayName, changed, previousName: codeToDisplayName(preferred), alreadyClaimed: false };
}

// --- LEARNER RECRUIT FLOW: under 13. Fully COPPA-compliant — no name/email field, ever,
// and no picker screen either: nickname + avatar are both auto-assigned so nothing blocks
// their first course launch. The nickname now comes from their Recruit Code rather than
// being a separate random word-pair; both nickname and avatar stay editable later from
// their profile (a rename, not a required first-time setup step).
async function recruitSignIn() {
    const cred = await signInAnonymously(auth);
    const user = cred.user;

    const ref = userRef(user.uid);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : null;

    let code = existingData && existingData.recruitCode;
    const isNewCode = !code;
    let displayName = existingData && existingData.displayName;
    let avatar = normalizeAvatar(existingData && existingData.avatar) || randomAvatar();

    if (!code) {
        code = await generateUniqueRecruitCode();
        displayName = codeToDisplayName(code);
        await setDoc(recruitCodeRef(code), {
            uid: user.uid,
            displayName,
            avatar,
            progress: {},
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    await updateProfile(user, { displayName });

    const role = (existingData && existingData.role) ? existingData.role : 'student';
    const payload = {
        displayName,
        avatar,
        email: null,
        isGuest: true,
        role,
        ageTier: 'under13',
        recruitCode: code,
        lastLogin: serverTimestamp(),
    };
    if (existingData && existingData.classroomCode) payload.classroomCode = existingData.classroomCode;

    await setDoc(ref, payload, { merge: true });
    markSignedIn();
    return { user, code, displayName, avatar, isNewCode };
}

// --- RECRUIT CODE REDEMPTION: reclaims a Learner Recruit's identity + progress on a
// device that doesn't already have it — the actual cross-device reconnection. Firebase's
// anonymous auth has no built-in way to resume a specific old anonymous session from a
// code alone, so this doesn't try to; instead the code's document IS the portable copy
// of identity + progress, and this merges that copy onto whatever anonymous session this
// device currently has (or creates a fresh one). The code's uid pointer then moves to
// this device, same "whoever holds the code owns it next" trust model already used for
// an Allgood classroom code — see the recruit_codes rule in firestore.rules.
async function redeemRecruitCode(rawCode) {
    const code = normalizeRecruitCode(rawCode);
    if (!code) return { ok: false, reason: 'empty' };

    // The recruit_codes read below requires a signed-in session (see firestore.rules) —
    // establish one FIRST, since a direct module visit with no prior power-up on this
    // browser can reach this path with nobody signed in yet at all.
    let user = auth.currentUser;
    if (!user || !user.isAnonymous) {
        const cred = await signInAnonymously(auth);
        user = cred.user;
    }

    const codeRef = recruitCodeRef(code);
    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) return { ok: false, reason: 'not_found' };
    const codeData = codeSnap.data();

    const displayName = codeData.displayName || codeToDisplayName(code);
    const avatar = normalizeAvatar(codeData.avatar);
    await updateProfile(user, { displayName });

    const ref = userRef(user.uid);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : null;

    const restored = {
        displayName,
        avatar,
        email: null,
        isGuest: true,
        role: (existingData && existingData.role) ? existingData.role : 'student',
        ageTier: 'under13',
        recruitCode: code,
        lastLogin: serverTimestamp(),
    };
    // Classroom membership travels with the code too. Redeeming lands the student on a NEW
    // uid (see the note on this function), and their classroomCode lived on the old profile
    // — so without this a Recruit who switched devices silently dropped off their teacher's
    // roster while looking, to them, perfectly signed in. Only ever re-applied from the
    // code document, which only their own sessions write.
    const mirroredClassroom = codeData.classroomCode;
    if (mirroredClassroom && !(existingData && existingData.classroomCode)) {
        restored.classroomCode = mirroredClassroom;
    }

    await setDoc(ref, restored, { merge: true });

    // Copy each module's mirrored progress into this device's own module_progress
    // subcollection, so the existing resume-where-you-left-off logic (loadModuleProgress)
    // works unchanged for whichever module they open next.
    const progress = codeData.progress || {};
    for (const [slug, data] of Object.entries(progress)) {
        await setDoc(moduleProgressRef(user.uid, slug), { ...data, lastUpdated: serverTimestamp() }, { merge: true });
    }

    await setDoc(codeRef, { uid: user.uid, updatedAt: serverTimestamp() }, { merge: true });

    try { localStorage.setItem(GUEST_CODE_KEY, code); } catch (e) { /* ignore */ }
    markSignedIn();

    return { ok: true, displayName, avatar };
}

// Called the moment a student joins a Task Force, so membership reaches the code document
// even if they never open another module afterwards — mirrorRecruitProgress() below would
// otherwise not carry it across until their next lesson. A no-op for anyone without a
// Recruit Code (13+ accounts keep their classroom on the profile their real sign-in
// returns to).
async function mirrorRecruitClassroom(classroomCode) {
    const user = auth.currentUser;
    if (!user || !classroomCode) return;
    try {
        const snap = await getDoc(userRef(user.uid));
        const code = snap.exists() ? snap.data().recruitCode : null;
        if (!code) return;
        await setDoc(recruitCodeRef(code), { classroomCode, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
        console.error('[AuthCore] mirrorRecruitClassroom failed', e);
    }
}

// Mirrors one module's progress onto the recruit's code document (in addition to the
// normal per-uid module_progress write in saveModuleProgress below) so it survives a
// device switch. A no-op for 13+ accounts, which reconnect via their real Google/email
// sign-in instead and don't need this.
async function mirrorRecruitProgress(uid, moduleSlug, progress) {
    try {
        const snap = await getDoc(userRef(uid));
        const data = snap.exists() ? snap.data() : null;
        const code = data ? data.recruitCode : null;
        if (!code) return;
        const payload = {
            [`progress.${moduleSlug}`]: progress,
            updatedAt: serverTimestamp(),
        };
        // Carried on the same snapshot this function already reads, so keeping classroom
        // membership current on the code document costs nothing extra. redeemRecruitCode()
        // reads it back when the student returns on another device.
        if (data && data.classroomCode) payload.classroomCode = data.classroomCode;
        await setDoc(recruitCodeRef(code), payload, { merge: true });
    } catch (e) {
        console.error('[AuthCore] mirrorRecruitProgress failed', e);
    }
}

async function finalizeThirteenPlusAccount(user) {
    const ref = userRef(user.uid);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : null;
    // Never downgrade an existing Task Force Leader back to a plain account on a later login.
    const role = (existingData && existingData.role) ? existingData.role : 'student';

    const displayName = user.displayName || (existingData && existingData.displayName) || (user.email ? user.email.split('@')[0] : 'Agent Learner');
    // Email/password sign-in never sets a Firebase Auth displayName on its own (unlike
    // Google) — keep the live auth object in sync so every page reading user.displayName
    // (not just this Firestore doc) sees the same name instead of falling back to a
    // generic placeholder.
    if (user.displayName !== displayName) {
        try { await updateProfile(user, { displayName }); } catch (e) { console.error('[AuthCore] updateProfile failed', e); }
    }

    const payload = {
        displayName,
        email: user.email || null,
        isGuest: false,
        role,
        ageTier: '13plus',
        lastLogin: serverTimestamp(),
    };
    if (existingData && existingData.classroomCode) payload.classroomCode = existingData.classroomCode;

    await setDoc(ref, payload, { merge: true });
    markSignedIn();
    markAccount();
    return user;
}

// --- 13+ SIGN-IN: Google or email/password, always a real account — no anonymous path
// remains for this tier. If the device already has a silent anonymous session (from
// power-up), this upgrades that SAME account via Firebase's credential-linking instead
// of creating a separate one, so nothing written under it is orphaned.
async function googleSignIn() {
    const provider = new GoogleAuthProvider();
    const current = auth.currentUser;
    let user;

    if (current && current.isAnonymous) {
        try {
            user = (await linkWithPopup(current, provider)).user;
        } catch (e) {
            if (e.code === 'auth/credential-already-in-use') {
                // This Google account already belongs to a real, existing account (e.g.
                // signing in on a new device) — sign into THAT account instead. Reuse the
                // credential from the popup interaction that just happened rather than
                // opening a second popup: browsers commonly block a popup that isn't a
                // direct, synchronous response to the click that triggered it, and by
                // this point (after an awaited failed link) it usually isn't anymore.
                const cred = GoogleAuthProvider.credentialFromError(e);
                user = (await signInWithCredential(auth, cred)).user;
            } else {
                throw e;
            }
        }
    } else {
        user = (await signInWithPopup(auth, provider)).user;
    }

    return finalizeThirteenPlusAccount(user);
}

async function createAccountWithEmail(email, password) {
    const current = auth.currentUser;
    let user;

    if (current && current.isAnonymous) {
        try {
            user = (await linkWithCredential(current, EmailAuthProvider.credential(email, password))).user;
        } catch (e) {
            if (e.code === 'auth/email-already-in-use' || e.code === 'auth/credential-already-in-use') {
                // A real account already exists for this email — the password they just
                // typed is a sign-in attempt against it, not a second "create", so try
                // signing in rather than creating again (which would just re-throw the
                // same "already in use" error).
                user = (await signInWithEmailAndPassword(auth, email, password)).user;
            } else {
                throw e;
            }
        }
    } else {
        user = (await createUserWithEmailAndPassword(auth, email, password)).user;
    }

    return finalizeThirteenPlusAccount(user);
}

async function signInWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return finalizeThirteenPlusAccount(result.user);
}

// Single read of the fields the identify gate (and anything else) needs to decide
// whether an account is fully identified yet — see /js/identity-gate.js.
async function getAccount(uid) {
    const snap = await getDoc(userRef(uid));
    const data = snap.exists() ? snap.data() : {};
    return {
        role: data.role || 'student',
        ageTier: data.ageTier || null,
        avatar: normalizeAvatar(data.avatar),
        recruitCode: data.recruitCode || null,
        displayName: data.displayName || null,
    };
}

async function hasAcceptedTeacherConsent(uid) {
    const snap = await getDoc(userRef(uid));
    return !!(snap.exists() && snap.data().teacherConsent && snap.data().teacherConsent.version === 'v1');
}

async function recordTeacherConsent(uid) {
    await setDoc(userRef(uid), {
        teacherConsent: { acceptedAt: serverTimestamp(), version: 'v1' }
    }, { merge: true });
}

// --- MESSAGE HQ: flat top-level collection, tagged by portal ---
async function sendMessage({ text, source }) {
    const user = auth.currentUser;
    if (!user || !text) return;
    await addDoc(collection(db, 'artifacts', appId, 'messages'), {
        senderUid: user.uid,
        senderName: user.displayName || 'Guest',
        senderEmail: user.email || null,
        message: text,
        source: source || 'Unknown portal',
        timestamp: serverTimestamp(),
        isGuest: !!user.isAnonymous,
    });
}

// --- COURSE FEEDBACK: flat top-level collection, separate from game_scores ---
// ageTier is stamped on the document because this is the one collection that stores
// free text a child typed. Without it an under-13 submission is indistinguishable from
// a 13+ one, so a parent asking us to delete their child's comment could not be
// answered without joining every row back to its user doc. It comes from getAccount()
// — the same single read identity-gate.js and telemetry.js use — rather than a new
// source of truth. A failed read must never cost us the feedback itself, so the tier
// falls back to null and the write still happens; null means "unknown", not "13+".
async function submitCourseFeedback({ gameName, rating, feedback }) {
    const user = auth.currentUser;
    if (!user) return;
    let ageTier = null;
    try {
        ageTier = (await getAccount(user.uid)).ageTier;
    } catch (e) {
        console.error('[auth-core] course feedback: age tier lookup failed', e);
    }
    await addDoc(collection(db, 'artifacts', appId, 'course_feedback'), {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        gameName,
        rating: typeof rating === 'number' ? rating : null,
        feedback: feedback || '',
        ageTier: ageTier || null,
        timestamp: serverTimestamp(),
    });
}

// --- MODULE PROGRESS: one canonical doc per student per module, so a returning
// visit (new tab, next day) can restore real progress instead of starting cold.
// Deliberately NOT per-session — the existing game_scores/{sessionId} docs are a
// fresh doc every page load, which is fine as a visit log but useless as "what
// has this student actually finished," since it never accumulates across visits.
// This is the same flat/canonical pattern already used for messages and
// course_feedback, for the same reason: one doc to read, no per-module rule or
// query gymnastics as more modules get this treatment.
async function saveModuleProgress(moduleSlug, progress) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(moduleProgressRef(user.uid, moduleSlug), {
            ...progress,
            lastUpdated: serverTimestamp(),
        }, { merge: true });
        // Learner Recruits also get their progress mirrored onto their Recruit Code
        // document, so it's there to reclaim on a different device. No-op for anyone
        // without a recruitCode on file (13+ accounts reconnect via real sign-in instead).
        mirrorRecruitProgress(user.uid, moduleSlug, progress);
    } catch (e) {
        console.error('[AuthCore] saveModuleProgress failed', e);
    }
}

async function loadModuleProgress(moduleSlug) {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const snap = await getDoc(moduleProgressRef(user.uid, moduleSlug));
        return snap.exists() ? snap.data() : null;
    } catch (e) {
        console.error('[AuthCore] loadModuleProgress failed', e);
        return null;
    }
}

// Sign-out that also clears the routing flag and the local guest name, so the next
// visitor on this browser starts genuinely fresh instead of inheriting the last one's
// session name or being bounced to a dashboard they aren't signed in to.
async function signOutAndClear() {
    clearSignedIn();
    clearGuestCode();
    return signOut(auth);
}

window.AuthCore = {
    auth, db, appId,
    silentSignIn, recruitSignIn, redeemRecruitCode,
    guestStart, guestDisplayName, claimRecruitCode,
    codeToDisplayName, normalizeRecruitCode,
    markSignedIn, markAccount, clearSignedIn, signOutAndClear, waitForAuthReady,
    googleSignIn, createAccountWithEmail, signInWithEmail,
    getAccount,
    randomNickname, randomAvatar, normalizeAvatar, AVATARS,
    hasAcceptedTeacherConsent, recordTeacherConsent,
    sendMessage, submitCourseFeedback,
    saveModuleProgress, loadModuleProgress,
    mirrorRecruitClassroom,
    recordContinuityEntry,
    onAuthStateChanged, signOut,
    skipPowerUp,
};
