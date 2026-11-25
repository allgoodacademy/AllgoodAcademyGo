// Shared Firebase auth/identity module for every Allgood Academy page.
//
// The identity model (founder decision, 2026-11-23 — see docs/insider-analytics.md and the
// Decisions & Context Log, "Identity model reset"):
//
//   - STUDENTS NEVER SIGN IN. Every visitor gets a silent anonymous Firebase session the
//     moment a page loads (startSession), and everything just plays. Progress lives in that
//     session on that device. No name, email, age or code is asked before content.
//   - A student joins a teacher's class with a class code + a nickname (/join/ or the
//     dashboard, see /js/classroom-join.js).
//   - OPTIONAL SAVE (2026-11-24): from the dashboard, and only if they ask, a student can
//     keep their progress across devices with a save code or (13+) Google. That LINKS a
//     sign-in onto this same anonymous user — same uid, same progress — and lives in
//     /js/student-save.js, not here. Nothing is ever asked before content.
//   - TEACHERS ARE THE ONLY PEOPLE WHO SIGN IN — with Google (teacherGoogleSignIn) or, for a
//     teacher without Google, an email and password (teacherEmailSignIn) — from one place:
//     "Teacher sign in" -> /mission-control/. A teacher accepts the consent notice once
//     before their first class is created.
//   - Students from the old model (Recruit Codes, 13+ Google or email/password accounts)
//     get their progress back with the restore functions at the bottom of the identity
//     section. They copy the old progress INTO this device's anonymous session; the
//     student stays anonymous. They are deleted at the sunset, LEGACY_RESTORE_UNTIL.
//
// Every page loads this file (`<script type="module" src="/js/auth-core.js">`) instead of
// inlining its own Firebase config, so a policy or schema change happens in one place.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import {
    getAuth, signInAnonymously, onAuthStateChanged, updateProfile, signOut,
    GoogleAuthProvider, signInWithPopup, signInWithCredential, linkWithPopup,
    EmailAuthProvider, linkWithCredential, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, sendPasswordResetEmail, updateCurrentUser, getAdditionalUserInfo,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
    getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection, query, where, serverTimestamp,
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

// --- ROUTING HINTS (localStorage, this domain only). Neither is an auth check; nothing
// real is gated on them — firestore.rules decides every access.
//   ag_signed_in : this browser has a session. The nav shows "My dashboard" for it.
//   ag_account   : this browser's session is a real (non-anonymous) account — a teacher,
//                  or a legacy account. The dashboard's GA4 snippet loads only behind it,
//                  so no anonymous (student) session ever loads Google Analytics.
const SIGNED_IN_KEY = 'ag_signed_in';
const ACCOUNT_KEY = 'ag_account';

function setFlag(key) { try { localStorage.setItem(key, '1'); } catch (e) { /* ignore */ } }
function markSignedIn() { setFlag(SIGNED_IN_KEY); }
function markAccount() { setFlag(ACCOUNT_KEY); }
function clearSignedIn() {
    try { localStorage.removeItem(SIGNED_IN_KEY); localStorage.removeItem(ACCOUNT_KEY); } catch (e) { /* ignore */ }
}

// --- FIRST INTERACTION. Resolves on the visitor's first tap or keypress (or when a page
// calls markEngaged(), e.g. telemetry's first step). Telemetry opens its session document
// and startSession() writes the student's profile only after this, so a visit that never
// touches the page is not a "session" or a "user" in Insider — the same population the
// old tap-to-power-up screen produced, which keeps the numbers comparable across the
// 2026-11 cutover (docs/insider-analytics.md).
let resolveEngaged;
const engaged = new Promise((resolve) => { resolveEngaged = resolve; });
function markEngaged() { if (resolveEngaged) { resolveEngaged(); resolveEngaged = null; } }
['pointerdown', 'keydown'].forEach((type) => {
    document.addEventListener(type, markEngaged, { once: true, capture: true, passive: true });
});

const ADJECTIVES = ['Swift', 'Brave', 'Clever', 'Quiet', 'Bold', 'Curious', 'Bright', 'Calm', 'Sharp', 'Steady'];
const ANIMALS = ['Falcon', 'Otter', 'Panther', 'Fox', 'Owl', 'Wolf', 'Hawk', 'Lynx', 'Heron', 'Badger'];

// True for a name startSession() made up ("Swift Falcon 42"), i.e. the student has not
// told us what to call them yet. The dashboard asks once, for joining a class or saving.
function isGeneratedNickname(name) {
    const m = /^(\w+) (\w+) (\d{2})$/.exec(String(name || ''));
    return !!m && ADJECTIVES.includes(m[1]) && ANIMALS.includes(m[2]);
}

function randomNickname() {
    const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const n = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    return `${a} ${n} ${num}`;
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

// --- AUTH READY: await Firebase's first onAuthStateChanged callback. Bounded so a dropped
// network during state determination degrades to "no session yet", never a hung page.
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

// --- A SESSION WITH NO PROFILE: a Firebase uid and nothing else. Pattern Lab uses this
// directly (it must never create a users/{uid} document — see its own page). Reuses an
// existing session on this browser rather than ever creating a second one.
async function anonymousSessionOnly() {
    const existing = await waitForAuthReady();
    if (existing) return existing;
    return (await signInAnonymously(auth)).user;
}

// The student's users/{uid} profile: a nickname and nothing identifying. Never renames a
// session that already has a name, never touches role (a teacher keeps theirs), and adds
// only the fields passed in `fields` (a /join/ nickname, a restored classroomCode).
// Writes are queued one after another so the first-interaction write can never read an
// old name and then land on top of a nickname the student just typed.
let profileQueue = Promise.resolve();
function writeStudentProfile(user, fields = {}) {
    const run = profileQueue.then(() => doWriteStudentProfile(user, fields));
    profileQueue = run.catch(() => {});
    return run;
}

async function doWriteStudentProfile(user, fields) {
    const ref = userRef(user.uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const displayName = fields.displayName || data.displayName || user.displayName || randomNickname();
    await setDoc(ref, {
        // A real account (a teacher, a legacy 13+ account) keeps its own email and flags.
        ...(user.isAnonymous ? { email: null, isGuest: true } : {}),
        ...(data.role ? {} : { role: 'student' }),
        lastLogin: serverTimestamp(),
        ...fields,
        displayName,
    }, { merge: true });
    if (user.displayName !== displayName) {
        try { await updateProfile(user, { displayName }); } catch (e) { console.error('[AuthCore] updateProfile failed', e); }
    }
    return displayName;
}

// --- THE STUDENT ENTRY POINT. Every lesson, game, hub and the dashboard call this on page
// load. No screen, no question: it resolves to a user as soon as Firebase has one, so a
// returning student's saved progress can load straight away. The profile document is
// written on the first interaction (see `engaged` above). A failure here must never block
// content: callers treat a null user as "play without saving".
async function startSession() {
    let user;
    try {
        user = await anonymousSessionOnly();
    } catch (e) {
        console.error('[AuthCore] startSession failed', e);
        return null;
    }
    markSignedIn();
    if (user.isAnonymous) {
        engaged.then(() => writeStudentProfile(user)).catch((e) => console.error('[AuthCore] profile write failed', e));
    }
    return user;
}

// --- TEACHER SIGN IN: Google, or email and password. Both link onto this browser's
// existing anonymous session when there is one, so a teacher who used the site anonymously
// (including the handful of pre-2026-09 anonymous Task Force Leaders) keeps their uid, role
// and class. If the account already exists, they sign into that account instead.
async function finishTeacherSignIn(user) {
    const ref = userRef(user.uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};
    const displayName = user.displayName || data.displayName || (user.email ? user.email.split('@')[0] : 'Teacher');
    if (user.displayName !== displayName) {
        try { await updateProfile(user, { displayName }); } catch (e) { console.error('[AuthCore] updateProfile failed', e); }
    }
    await setDoc(ref, {
        displayName,
        email: user.email || null,
        isGuest: false,
        ...(data.role ? {} : { role: 'student' }),
        lastLogin: serverTimestamp(),
    }, { merge: true });
    markSignedIn();
    markAccount();
    return user;
}

// Google. Reuses the popup's credential when the account already exists (a second popup
// after an await is usually blocked).
async function teacherGoogleSignIn() {
    const provider = new GoogleAuthProvider();
    const current = auth.currentUser;
    let user;
    if (current && current.isAnonymous) {
        try {
            user = (await linkWithPopup(current, provider)).user;
        } catch (e) {
            if (e.code !== 'auth/credential-already-in-use') throw e;
            user = (await signInWithCredential(auth, GoogleAuthProvider.credentialFromError(e))).user;
        }
    } else {
        user = (await signInWithPopup(auth, provider)).user;
    }
    return finishTeacherSignIn(user);
}

// Email and password, for a teacher without Google. mode 'create' makes the account (linked
// onto this browser's anonymous session when there is one); mode 'signin' signs into an
// existing one. Firebase's own errors (auth/email-already-in-use, auth/invalid-credential,
// auth/weak-password, ...) are thrown to the caller, which words them for a person.
async function teacherEmailSignIn(email, password, mode) {
    let user;
    if (mode === 'create') {
        const current = auth.currentUser;
        user = current && current.isAnonymous
            ? (await linkWithCredential(current, EmailAuthProvider.credential(email, password))).user
            : (await createUserWithEmailAndPassword(auth, email, password)).user;
    } else {
        user = (await signInWithEmailAndPassword(auth, email, password)).user;
    }
    return finishTeacherSignIn(user);
}

function teacherPasswordReset(email) {
    return sendPasswordResetEmail(auth, email);
}

async function getAccount(uid) {
    const snap = await getDoc(userRef(uid));
    const data = snap.exists() ? snap.data() : {};
    return {
        role: data.role || 'student',
        displayName: data.displayName || null,
        classroomCode: data.classroomCode || null,
        // A student who saved their progress (student-save.js) is no longer an anonymous
        // Firebase user but is still a guest: their profile keeps isGuest: true, so
        // telemetry and analytics treat them exactly as before they saved.
        isGuest: data.isGuest === true,
    };
}

// --- LEGACY RESTORE (sunset LEGACY_RESTORE_UNTIL; delete this section then). ----------------
// Students from the pre-2026-11 model get their work back on this device. All three paths
// end the same way: the old progress, name and class are copied INTO the current anonymous
// session, and the student stays anonymous. Nothing is written to the old account or to
// recruit_codes (read-only by rule #9 from this release on), and no old data is deleted.
const LEGACY_RESTORE_UNTIL = '2027-06-30';

function legacyRestoreOpen() {
    return new Date() <= new Date(LEGACY_RESTORE_UNTIL + 'T23:59:59');
}

// Forgiving: case, spaces and hyphens all normalize to the stored key ("Arctic Fox Trot
// 4821" -> "arctic-fox-trot-4821"), since a child is retyping this from memory.
function normalizeRecruitCode(raw) {
    return String(raw || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function codeToDisplayName(code) {
    return code.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Copies { displayName, progress, classroomCodes } into `user`'s own documents. A module
// that already has progress on THIS device is left alone — restoring must never overwrite
// work the student has done since.
async function copyIntoSession(user, { displayName, progress, classroomCodes }) {
    let restoredModules = 0;
    for (const [slug, data] of Object.entries(progress || {})) {
        const ref = moduleProgressRef(user.uid, slug);
        if ((await getDoc(ref)).exists()) continue;
        await setDoc(ref, { ...data, lastUpdated: serverTimestamp() });
        restoredModules++;
    }

    // Class membership: a new roster row under this uid, so the teacher sees new work. A
    // class that no longer exists is skipped (the rules would refuse it anyway).
    const codes = [...new Set((classroomCodes || []).filter(Boolean))];
    let lastJoined = null;
    for (const code of codes) {
        try {
            await setDoc(doc(db, 'artifacts', appId, 'classroom_members', `${code}_${user.uid}`), {
                classroomCode: code, uid: user.uid, joinedAt: serverTimestamp(),
            }, { merge: true });
            lastJoined = code;
        } catch (e) {
            console.warn('[AuthCore] restore: class', code, 'not rejoined', e);
        }
    }
    await writeStudentProfile(user, { displayName, ...(lastJoined ? { classroomCode: lastJoined } : {}) });
    return restoredModules;
}

// Path 1: an old Recruit Code. A single-document get by the exact code (rule #9).
async function restoreFromRecruitCode(rawCode) {
    const code = normalizeRecruitCode(rawCode);
    if (!code) return { ok: false, reason: 'empty' };
    const user = await startSession();
    if (!user) return { ok: false, reason: 'error' };
    const snap = await getDoc(doc(db, 'artifacts', appId, 'recruit_codes', code));
    if (!snap.exists()) return { ok: false, reason: 'not_found' };
    const data = snap.data();
    const displayName = data.displayName || codeToDisplayName(code);
    const restoredModules = await copyIntoSession(user, {
        displayName,
        progress: data.progress || {},
        classroomCodes: [data.classroomCode],
    });
    return { ok: true, displayName, restoredModules };
}

// Paths 2 and 3: an old 13+ account (Google, or email + password). Signs in to the old
// account just long enough to read its own documents, then puts this device's anonymous
// session back as the current user (updateCurrentUser) and copies into it. A Google
// sign-in that turns out to CREATE an account (nobody had one) is deleted on the spot, so
// this path can never mint a new student account.
async function restoreFromAccount(signInToOldAccount) {
    const session = await startSession();
    if (!session) return { ok: false, reason: 'error' };
    let found;
    try {
        const result = await signInToOldAccount();
        const old = result.user;
        if (old.uid === session.uid) return { ok: true, displayName: old.displayName, restoredModules: 0 };
        const info = getAdditionalUserInfo(result);
        if (info && info.isNewUser) {
            try { await old.delete(); } catch (e) { console.warn('[AuthCore] restore: could not remove new account', e); }
            return { ok: false, reason: 'not_found' };
        }
        const profileSnap = await getDoc(userRef(old.uid));
        const profile = profileSnap.exists() ? profileSnap.data() : {};
        if (profile.role === 'teacher') return { ok: false, reason: 'teacher' };
        const progress = {};
        (await getDocs(collection(db, 'artifacts', appId, 'users', old.uid, 'module_progress')))
            .forEach((d) => { progress[d.id] = d.data(); });
        const memberships = await getDocs(query(collection(db, 'artifacts', appId, 'classroom_members'), where('uid', '==', old.uid)));
        found = {
            displayName: profile.displayName || old.displayName || null,
            progress,
            classroomCodes: [profile.classroomCode, ...memberships.docs.map((d) => d.data().classroomCode)],
        };
    } finally {
        if (!auth.currentUser || auth.currentUser.uid !== session.uid) await updateCurrentUser(auth, session);
    }
    const restoredModules = await copyIntoSession(session, found);
    return { ok: true, displayName: found.displayName, restoredModules };
}

function restoreWithGoogle() {
    return restoreFromAccount(() => signInWithPopup(auth, new GoogleAuthProvider()));
}

function restoreWithEmail(email, password) {
    return restoreFromAccount(() => signInWithEmailAndPassword(auth, email, password));
}
// --- END LEGACY RESTORE ---------------------------------------------------------------------

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
// No age field: since the 2026-11 identity reset every student session is treated as a
// child's, so a parent's deletion request is answered by uid (Insider's delete tool), the
// same way for everyone.
async function submitCourseFeedback({ gameName, rating, feedback, source }) {
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'course_feedback'), {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        gameName,
        rating: typeof rating === 'number' ? rating : null,
        feedback: feedback || '',
        // Where the rating was collected. Every row today is 'lesson' — the end-of-GoodBlock
        // star panel — but Comms will eventually be able to ask for a rating too, and once
        // two sources write here a row with no source is indistinguishable from a lesson
        // rating that predates the second one. Defaulted here rather than passed by each of
        // the seven GoodBlocks so there is one place to change and no call site can forget.
        source: source || 'lesson',
        timestamp: serverTimestamp(),
    });
}

// --- TOPIC SELECTIONS: what a student said they want to get better at ---------------
// Flat and top-level, exactly like course_feedback above and for the same reasons.
//
// Deliberately NOT student-readable (see firestore.rules): a student picking "money"
// three times in a week is a behavioural record about a child, and nothing in the
// product needs to read it back to them. Create-for-self, admin-read, same as feedback.
async function recordTopicSelection({ category, moduleId, moduleName }) {
    const user = auth.currentUser;
    if (!user || !category) return;
    await addDoc(collection(db, 'artifacts', appId, 'topic_selections'), {
        uid: user.uid,
        category,
        moduleId: moduleId || null,
        moduleName: moduleName || null,
        source: 'comms',
        timestamp: serverTimestamp(),
    });
}

// --- COMMS: the student's own copy of a note they sent, and their read state ---------
// Both live under the student's own profile subtree, which rule 2b already makes
// owner-read/owner-write, so neither needs a firestore.rules change.
//
// Why a separate receipt at all, when the note itself is already written to
// artifacts/{appId}/messages: that collection is admin-read ONLY. A student cannot read
// back a single thing they sent. Without a copy they can read, Comms has no way to show
// an acknowledgement item, because it cannot see that the note exists.
//
// readAt is written null and nothing sets it yet. An acknowledgement in this pass
// confirms the note REACHED HQ, which is true at the moment of writing and is what the
// copy says. A genuine "a person has read this" receipt needs an admin write into the
// student's subtree, and rule 2b grants admins read and delete but not write — so that
// is a rules change, and it was out of scope for this pass. The field exists now so
// pass two can light it up without a migration.
function commsReceiptsRef(uid) {
    return collection(db, 'artifacts', appId, 'users', uid, 'comms_receipts');
}

async function recordCommsReceipt({ text, source }) {
    const user = auth.currentUser;
    if (!user || !text) return;
    try {
        await addDoc(commsReceiptsRef(user.uid), {
            excerpt: String(text).slice(0, 140),
            source: source || 'Unknown portal',
            sentAt: serverTimestamp(),
            readAt: null,
        });
    } catch (e) {
        console.error('[AuthCore] recordCommsReceipt failed', e);
    }
}

async function loadCommsReceipts() {
    const user = auth.currentUser;
    if (!user) return [];
    try {
        const snap = await getDocs(commsReceiptsRef(user.uid));
        const rows = [];
        snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        // Sorted client-side rather than with orderBy() so this needs no composite index
        // and no extra import; a student's own receipt count is small by construction.
        rows.sort((a, b) => (msOf(b.sentAt) - msOf(a.sentAt)));
        return rows;
    } catch (e) {
        console.error('[AuthCore] loadCommsReceipts failed', e);
        return [];
    }
}

// serverTimestamp() resolves to a Firestore Timestamp on read, but is null for the
// moment between a local write and the server round trip. Treat that as "just now".
function msOf(ts) {
    if (!ts) return Date.now();
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts.seconds === 'number') return ts.seconds * 1000;
    return Date.now();
}

function commsStateRef(uid) {
    return doc(db, 'artifacts', appId, 'users', uid, 'comms_state', 'state');
}

async function loadCommsRead() {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const snap = await getDoc(commsStateRef(user.uid));
        const data = snap.exists() ? snap.data() : {};
        return Array.isArray(data.readIds) ? data.readIds : [];
    } catch (e) {
        console.error('[AuthCore] loadCommsRead failed', e);
        return null;
    }
}

async function saveCommsRead(readIds) {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await setDoc(commsStateRef(user.uid), {
            readIds: Array.isArray(readIds) ? readIds.slice(-200) : [],
            lastUpdated: serverTimestamp(),
        }, { merge: true });
    } catch (e) {
        console.error('[AuthCore] saveCommsRead failed', e);
    }
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

window.AuthCore = {
    auth, db, appId,
    startSession, anonymousSessionOnly, waitForAuthReady, markEngaged, writeStudentProfile, isGeneratedNickname,
    whenEngaged: () => engaged,
    teacherGoogleSignIn, teacherEmailSignIn, teacherPasswordReset, getAccount,
    markSignedIn, markAccount, clearSignedIn,
    hasAcceptedTeacherConsent, recordTeacherConsent,
    legacyRestoreOpen, LEGACY_RESTORE_UNTIL, restoreFromRecruitCode, restoreWithGoogle, restoreWithEmail,
    sendMessage, submitCourseFeedback, recordTopicSelection,
    recordCommsReceipt, loadCommsReceipts, loadCommsRead, saveCommsRead,
    saveModuleProgress, loadModuleProgress, recordContinuityEntry,
    onAuthStateChanged, signOut,
};
