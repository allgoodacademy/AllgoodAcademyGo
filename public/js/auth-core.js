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
    GoogleAuthProvider, signInWithPopup,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import {
    getFirestore, doc, setDoc, getDoc, addDoc, collection, serverTimestamp,
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

const ADJECTIVES = ['Swift', 'Brave', 'Clever', 'Quiet', 'Bold', 'Curious', 'Bright', 'Calm', 'Sharp', 'Steady'];
const ANIMALS = ['Falcon', 'Otter', 'Panther', 'Fox', 'Owl', 'Wolf', 'Hawk', 'Lynx', 'Heron', 'Badger'];

function randomNickname() {
    const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const n = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const num = Math.floor(Math.random() * 90 + 10);
    return `${a} ${n} ${num}`;
}

function userRef(uid) {
    return doc(db, 'artifacts', appId, 'users', uid);
}

// --- STUDENT FLOW: anonymous identity, nickname only, no email ever ---
async function studentSignIn(nickname) {
    const cred = await signInAnonymously(auth);
    const user = cred.user;
    const safeNick = String(nickname || randomNickname()).slice(0, 30).trim() || randomNickname();

    await updateProfile(user, { displayName: safeNick });

    const ref = userRef(user.uid);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : null;
    const role = (existingData && existingData.role) ? existingData.role : 'student';

    const payload = {
        displayName: safeNick,
        email: null,
        isGuest: true,
        role,
        lastLogin: serverTimestamp(),
    };
    if (existingData && existingData.classroomCode) payload.classroomCode = existingData.classroomCode;

    await setDoc(ref, payload, { merge: true });
    return user;
}

// --- TEACHER/STAFF FLOW: real Google identity, since they're the consenting adult ---
async function teacherSignIn() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const ref = userRef(user.uid);
    const existing = await getDoc(ref);
    const existingData = existing.exists() ? existing.data() : null;
    // Never downgrade an existing teacher back to student on a later login.
    const role = (existingData && existingData.role) ? existingData.role : 'student';

    const payload = {
        displayName: user.displayName || 'Teacher',
        email: user.email || null,
        isGuest: false,
        role,
        lastLogin: serverTimestamp(),
    };
    if (existingData && existingData.classroomCode) payload.classroomCode = existingData.classroomCode;

    await setDoc(ref, payload, { merge: true });
    return user;
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
async function submitCourseFeedback({ gameName, rating, feedback }) {
    const user = auth.currentUser;
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'course_feedback'), {
        uid: user.uid,
        name: user.displayName || 'Anonymous',
        gameName,
        rating: typeof rating === 'number' ? rating : null,
        feedback: feedback || '',
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
function moduleProgressRef(uid, moduleSlug) {
    return doc(db, 'artifacts', appId, 'users', uid, 'module_progress', moduleSlug);
}

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

window.AuthCore = {
    auth, db, appId,
    studentSignIn, teacherSignIn, randomNickname,
    hasAcceptedTeacherConsent, recordTeacherConsent,
    sendMessage, submitCourseFeedback,
    saveModuleProgress, loadModuleProgress,
    onAuthStateChanged, signOut,
    skipPowerUp,
};
