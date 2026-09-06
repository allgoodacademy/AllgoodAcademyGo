// Shared learning-analytics telemetry for every Allgood Academy module.
//
// Load AFTER auth-core.js on any module page:
//   <script type="module" src="/js/telemetry.js"></script>
//
// then, from the module's own script, one call to describe the module and a
// handful of one-liners at the moments that matter:
//
//   window.Telemetry.init({ module: 'privacy-security', gameName: 'Privacy & Security', stepsTotal: 6 });
//   window.Telemetry.step(3);                      // learner reached step/case/page 3 (1-indexed)
//   window.Telemetry.choice({ scenarioIndex, choiceIndex, score, effectiveness });
//   window.Telemetry.complete({ finalScore, percentage, rank });
//   window.Telemetry.track('any_custom_event', { ...meta });
//
// Two flat, top-level Firestore collections are written (see firestore.rules #10/#11):
//
//   artifacts/{appId}/sessions/{sessionId}
//     One document per module visit. Holds the things Insider's Courses page needs to
//     compute time-on-task, drop-off, and completion rate WITHOUT scanning an event
//     log: uid, module, startedAt, lastSeenAt, activeMs (visibility-aware — a tab left
//     open in the background does not count), maxStep / stepsTotal, completed, device,
//     entry (dashboard / lab-hub / direct / external). It is rewritten in place on a
//     throttled timer, so a 20-minute visit costs ~20 writes, not hundreds.
//
//   artifacts/{appId}/events/{autoId}
//     Append-only event stream: module_open, step, choice, module_complete, plus any
//     custom track() call. Every event carries uid, module, sessionId, step and a
//     small meta object. This is the raw material for trend lines and for any later
//     export to BigQuery / Looker Studio (see docs/insider-analytics.md).
//
// Privacy: nothing here writes a name or email — only the uid already used by every
// other per-user collection, plus role/ageTier/isGuest flags copied from the account
// so Insider can segment without a join. Events are forwarded to Google Analytics
// too, but ONLY if the page itself already loaded gtag (today: the dashboard).
// Module pages deliberately don't get GA injected here — see the COPPA note in
// docs/insider-analytics.md before turning that on.

import {
    doc, setDoc, addDoc, collection, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const FLUSH_INTERVAL_MS = 45 * 1000;   // how often the session doc is rewritten while the tab is visible
const TICK_MS = 5 * 1000;              // how often active time is accumulated locally

const state = {
    configured: false,
    module: null,
    gameName: null,
    stepsTotal: null,
    baseSessionId: null,
    sessionId: null,
    sessionSeq: 0,
    uid: null,
    account: null,        // { role, ageTier, isGuest }
    sessionOpen: false,   // session doc exists for the current uid
    activeMs: 0,
    lastVisibleAt: null,
    lastFlushAt: 0,
    maxStep: 0,
    completed: false,
    dirty: false,
    pending: [],          // events queued before a signed-in user exists
    entry: null,
    device: null,
    flushing: false,
};

function core() { return window.AuthCore || null; }

function detectEntry() {
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('dashboard_uid')) return 'dashboard';
        const ref = document.referrer || '';
        if (!ref) return 'direct';
        const refUrl = new URL(ref);
        if (refUrl.host !== window.location.host) return 'external';
        if (refUrl.pathname === '/' || refUrl.pathname === '/index.html') return 'dashboard';
        if (refUrl.pathname.startsWith('/jsh/digital-decisions-lab/') && refUrl.pathname.split('/').filter(Boolean).length === 2) return 'lab-hub';
        return 'site';
    } catch (e) {
        return 'unknown';
    }
}

function detectDevice() {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    return 'desktop';
}

function newSessionId() {
    // Reuse the module's own window.sessionId when it has one, so game_scores/{sessionId}
    // and sessions/{sessionId} line up one-to-one for the same visit.
    if (!state.baseSessionId) {
        state.baseSessionId = window.sessionId || ('session_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
    }
    state.sessionSeq += 1;
    return state.sessionSeq === 1 ? state.baseSessionId : `${state.baseSessionId}_${state.sessionSeq}`;
}

function sessionRef() {
    const c = core();
    return doc(c.db, 'artifacts', c.appId, 'sessions', state.sessionId);
}

function eventsCol() {
    const c = core();
    return collection(c.db, 'artifacts', c.appId, 'events');
}

function accountFlags() {
    const a = state.account || {};
    return {
        role: a.role || 'student',
        ageTier: a.ageTier || null,
        isGuest: !!a.isGuest,
    };
}

async function openSession() {
    if (!state.uid || !state.configured || state.sessionOpen) return;
    state.sessionId = newSessionId();
    try {
        await setDoc(sessionRef(), {
            uid: state.uid,
            ...accountFlags(),
            module: state.module,
            gameName: state.gameName,
            sessionId: state.sessionId,
            stepsTotal: state.stepsTotal,
            startedAt: serverTimestamp(),
            lastSeenAt: serverTimestamp(),
            activeMs: state.activeMs,
            maxStep: state.maxStep,
            completed: state.completed,
            device: state.device,
            entry: state.entry,
            path: window.location.pathname,
        });
        state.sessionOpen = true;
        state.lastFlushAt = Date.now();
    } catch (e) {
        console.warn('[Telemetry] could not open session doc', e);
    }
}

async function flushSession(force) {
    if (!state.sessionOpen || state.flushing) return;
    if (!force && !state.dirty && (Date.now() - state.lastFlushAt) < FLUSH_INTERVAL_MS) return;
    state.flushing = true;
    try {
        await setDoc(sessionRef(), {
            lastSeenAt: serverTimestamp(),
            activeMs: Math.round(state.activeMs),
            maxStep: state.maxStep,
            completed: state.completed,
        }, { merge: true });
        state.dirty = false;
        state.lastFlushAt = Date.now();
    } catch (e) {
        console.warn('[Telemetry] session flush failed', e);
    } finally {
        state.flushing = false;
    }
}

async function writeEvent(evt) {
    try {
        await addDoc(eventsCol(), {
            uid: state.uid,
            ...accountFlags(),
            module: state.module,
            gameName: state.gameName,
            sessionId: state.sessionId,
            event: evt.event,
            step: evt.step,
            meta: evt.meta || {},
            device: state.device,
            entry: state.entry,
            ts: serverTimestamp(),
            clientTs: evt.clientTs,
        });
    } catch (e) {
        console.warn('[Telemetry] event write failed', evt.event, e);
    }
}

function forwardToGA(event, meta) {
    if (typeof window.gtag !== 'function') return;
    try {
        window.gtag('event', event, { module_name: state.gameName || state.module, ...(meta || {}) });
    } catch (e) { /* ignore */ }
}

function enqueue(event, meta) {
    const evt = { event, meta, step: state.maxStep, clientTs: Date.now() };
    forwardToGA(event, meta);
    if (state.uid && state.sessionOpen) {
        writeEvent(evt);
    } else {
        state.pending.push(evt);
    }
}

async function drainPending() {
    if (!state.uid || !state.sessionOpen) return;
    const queued = state.pending.splice(0);
    for (const evt of queued) await writeEvent(evt);
}

// --- active time: only counts while the tab is actually visible ---
function accumulate() {
    if (document.visibilityState === 'visible' && state.lastVisibleAt) {
        const now = Date.now();
        state.activeMs += now - state.lastVisibleAt;
        state.lastVisibleAt = now;
        state.dirty = true;
    }
}

function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
        state.lastVisibleAt = Date.now();
    } else {
        accumulate();
        state.lastVisibleAt = null;
        flushSession(true);
    }
}

function startClock() {
    if (document.visibilityState === 'visible') state.lastVisibleAt = Date.now();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', () => { accumulate(); flushSession(true); });
    setInterval(() => { accumulate(); flushSession(false); }, TICK_MS);
}

// --- auth wiring: a session belongs to a uid, and the uid can change mid-visit
// (silent anonymous power-up → real Google sign-in on a different account). When it
// does, the old session doc is left as-is (its update rule is owner-only) and a new
// one is opened for the new uid, carrying the same in-memory counters forward.
async function handleUser(user) {
    if (!user) return;
    if (state.uid === user.uid) return;
    state.uid = user.uid;
    state.sessionOpen = false;
    try {
        const c = core();
        const acct = c && c.getAccount ? await c.getAccount(user.uid) : null;
        state.account = acct ? { role: acct.role, ageTier: acct.ageTier, isGuest: !!user.isAnonymous } : { isGuest: !!user.isAnonymous };
    } catch (e) {
        state.account = { isGuest: !!user.isAnonymous };
    }
    await openSession();
    await drainPending();
}

function listenForAuth() {
    const c = core();
    if (!c) { console.warn('[Telemetry] AuthCore not loaded — telemetry disabled on this page'); return; }
    c.onAuthStateChanged(c.auth, (user) => { handleUser(user); });
}

// --- public API ---
function init({ module: moduleSlug, gameName, stepsTotal } = {}) {
    if (state.configured) return;
    state.configured = true;
    state.module = moduleSlug || window.location.pathname;
    state.gameName = gameName || document.title;
    state.stepsTotal = typeof stepsTotal === 'number' ? stepsTotal : null;
    state.entry = detectEntry();
    state.device = detectDevice();
    enqueue('module_open', { entry: state.entry, device: state.device });
    startClock();
    listenForAuth();
}

function track(event, meta) {
    if (!state.configured) return;
    enqueue(String(event), meta || {});
}

function step(n, meta) {
    if (!state.configured || typeof n !== 'number') return;
    if (n > state.maxStep) {
        state.maxStep = n;
        state.dirty = true;
        enqueue('step', { step: n, ...(meta || {}) });
        flushSession(true);
    }
}

function choice(meta) {
    track('choice', meta || {});
}

function complete(meta) {
    if (!state.configured || state.completed) return;
    state.completed = true;
    if (state.stepsTotal && state.maxStep < state.stepsTotal) state.maxStep = state.stepsTotal;
    state.dirty = true;
    accumulate();
    enqueue('module_complete', { ...(meta || {}), activeMs: Math.round(state.activeMs) });
    flushSession(true);
}

window.Telemetry = {
    init, track, step, choice, complete,
    flush: () => flushSession(true),
    get sessionId() { return state.sessionId; },
    get activeMs() { accumulate(); return Math.round(state.activeMs); },
};
