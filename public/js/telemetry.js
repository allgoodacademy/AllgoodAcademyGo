// Shared learning-analytics telemetry for every Allgood Academy module.
//
// Load AFTER auth-core.js on any module page:
//   <script type="module" src="/js/telemetry.js"></script>
//
// then, from the module's own script, one call to describe the module and a
// handful of one-liners at the moments that matter:
//
//   window.Telemetry.init({ module: 'privacy-security', gameName: 'Privacy & Security', stepsTotal: 6 });
//   window.Telemetry.plan(18);                     // revise stepsTotal once the real total is known
//   window.Telemetry.step(3);                      // learner reached step/case/page 3 (1-indexed)
//   window.Telemetry.choice({ scenarioIndex, choiceIndex, score, effectiveness, category });
//   window.Telemetry.complete({ finalScore, percentage, rank, summary: { ... } });
//   window.Telemetry.summary({ correct, scenariosPlayed, categories });  // session-doc roll-up
//   window.Telemetry.restart();                    // replay in the same tab: new session doc
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
//     throttled timer, so a 20-minute visit costs ~20 writes, not hundreds. A module may
//     also attach a `summary` map (see summary() below) — that is where the four games
//     put the per-category roll-up a teacher's Mission Control roster reads back, since
//     the event stream itself is admin-only.
//
//   artifacts/{appId}/events/{autoId}
//     Append-only event stream: module_open, step, choice, module_complete, plus any
//     custom track() call. Every event carries uid, module, sessionId, step and a
//     small meta object. This is the raw material for trend lines and for any later
//     export to BigQuery / Looker Studio (see docs/insider-analytics.md).
//
// STREAMS. Every session and event carries a `stream`, which says which product the
// visit belongs to. It defaults to 'core' — the site's own funnel: the four games, the
// GoodBlocks, the Challenges, everything a Lab Pack report or a conversion rate is
// computed from. A module passing `stream` at init() opts OUT of that population.
//
// There is one such module today: Pattern Lab (stream: 'pattern-lab'), the free
// CogAT-style practice diagnostic. It is deliberately outside the funnel — its visitors
// arrive from search, not from the dashboard, and they are not on their way to a
// GoodBlock. Counting its sessions as game sessions would inflate "module visits" and
// deflate the game→GoodBlock conversion rate, which is the number the whole funnel
// thesis rests on. public/insider/index.html partitions non-'core' streams out of its
// data BEFORE it computes anything, so an excluded stream cannot leak into a metric by
// somebody forgetting a filter one page later.
//
// A stream is a reporting population, NOT a permission boundary and NOT a second pipe:
// the collections, the rules and the writes are identical. Adding one is a decision about
// which numbers a product belongs in, so add one deliberately — and tell Insider about it.
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
    stream: 'core',       // reporting population — see the STREAMS note above
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
    summary: null,       // per-module end-of-session roll-up merged onto the session doc
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
            stream: state.stream,
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
            ...(state.summary ? { summary: state.summary } : {}),
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
            ...(state.summary ? { summary: state.summary } : {}),
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
            stream: state.stream,
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
    // Never forward analytics for an under-13 Learner Recruit, on any page — GA/gtag
    // is outside this module's control once fired (cookies, IP-derived geo), which is
    // not acceptable for a COPPA-covered session regardless of which page loaded gtag.
    if (state.account && state.account.ageTier === 'under13') return;
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
function init({ module: moduleSlug, gameName, stepsTotal, stream } = {}) {
    if (state.configured) return;
    state.configured = true;
    state.module = moduleSlug || window.location.pathname;
    state.gameName = gameName || document.title;
    // Anything that is not a non-empty string stays 'core'. A typo must not silently
    // remove a module from the funnel — the default has to be "counted".
    state.stream = (typeof stream === 'string' && stream.trim()) ? stream.trim() : 'core';
    state.stepsTotal = typeof stepsTotal === 'number' ? stepsTotal : null;
    state.entry = detectEntry();
    state.device = detectDevice();
    enqueue('module_open', { entry: state.entry, device: state.device });
    startClock();
    listenForAuth();
}

/* Start a fresh session document for a replay in the same tab.
 *
 * GoodBlocks and Challenges are finish-once, so one session doc per page load was
 * always enough. The four standalone games are not: Play Again is their core loop, and
 * the bespoke game_sessions writer they replaced wrote one document per play-through.
 * Without this, every round after the first would be invisible — complete() no-ops once
 * `completed` is set, and the session doc would keep only the first round's numbers.
 *
 * Carries nothing forward except the module description and the uid: the new doc gets
 * its own activeMs, maxStep, completed flag and summary, exactly like a fresh visit.
 * The previous document is left untouched (its update rule is owner-only, and it is a
 * real record of a real round). */
function restart() {
    if (!state.configured) return;
    flushSession(true);
    state.sessionOpen = false;
    state.activeMs = 0;
    state.lastVisibleAt = document.visibilityState === 'visible' ? Date.now() : null;
    state.maxStep = 0;
    state.completed = false;
    state.summary = null;
    state.dirty = false;
    openSession().then(drainPending);
    enqueue('module_open', { entry: state.entry, device: state.device, replay: true });
}

/* Revise stepsTotal after init(), for a module that does not know its own length yet.
 *
 * Every module until now did: a GoodBlock has a fixed case count, a Challenge a fixed
 * scenario count, a game a fixed round size. Pattern Lab does not — the learner picks a
 * 9-, 18- or 27-item session on the opening screen, after the page has already opened,
 * and picks again on every replay. Without this, a 9-item session would be recorded
 * against a 27-step denominator and complete() would backfill maxStep to 27, reporting
 * progress through steps nobody ever saw.
 *
 * Call it once the real total is known and before the first step(). */
function plan(stepsTotal) {
    if (!state.configured || typeof stepsTotal !== 'number' || !(stepsTotal > 0)) return;
    state.stepsTotal = stepsTotal;
    state.dirty = true;
    flushSession(true);
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

// A choice event may carry the skill tag the scenario was authored under, so a
// per-scenario category is recorded on every answer without inventing a new event
// type. `category` is the field games write (their scenario banks already carry one);
// `skillTag` is accepted as a synonym and normalized onto `category` so a reader only
// ever has to look in one place. Everything else passes through untouched.
function choice(meta) {
    const m = { ...(meta || {}) };
    if (m.skillTag != null && m.category == null) m.category = m.skillTag;
    delete m.skillTag;
    track('choice', m);
}

/* Merge an end-of-session roll-up onto THIS visit's session document.
 *
 * The event stream is admin-only by rule (#11), but a teacher can read their own
 * students' session documents (#10b) — so anything Mission Control has to show about
 * a game (best score, per-category breakdown, whether the student clicked through to
 * the recommended lesson) has to live on the session doc, not only in events. This is
 * that channel, and it is why the four games do not need a collection of their own.
 *
 * Merged, not replaced: two calls in one visit combine rather than clobber. */
function summary(fields) {
    if (!state.configured || !fields || typeof fields !== 'object') return;
    state.summary = { ...(state.summary || {}), ...fields };
    state.dirty = true;
    flushSession(true);
}

function complete(meta) {
    if (!state.configured || state.completed) return;
    state.completed = true;
    if (state.stepsTotal && state.maxStep < state.stepsTotal) state.maxStep = state.stepsTotal;
    state.dirty = true;
    accumulate();
    const m = { ...(meta || {}) };
    // `summary` on a complete() call is roll-up for the session doc, not event meta —
    // lifted out so the event stream keeps its existing shape.
    if (m.summary && typeof m.summary === 'object') {
        state.summary = { ...(state.summary || {}), ...m.summary };
        delete m.summary;
    }
    enqueue('module_complete', { ...m, activeMs: Math.round(state.activeMs) });
    flushSession(true);
}

window.Telemetry = {
    init, plan, restart, track, step, choice, complete, summary,
    get stream() { return state.stream; },
    flush: () => flushSession(true),
    get sessionId() { return state.sessionId; },
    get activeMs() { accumulate(); return Math.round(state.activeMs); },
};
