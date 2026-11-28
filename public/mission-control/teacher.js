/* MISSION CONTROL, INSIDE THE DASHBOARD (2026-11-27, storyboard v2.0, prompt Q).

   One dashboard for everyone. This module is Mission Control's page script, MOVED here from
   /mission-control/index.html, not rewritten: derive.js, module-data.js and plan-config.js
   are untouched, and the functions below are the ones Mission Control has always run.

   /dashboard/ imports this file ONLY after it has read users/{uid} and found
   role === 'teacher' with a class (see startTeacher() there). A student never downloads it,
   so no teacher view, rail item or overlay exists in a student's page — not even by typing
   #students. The data underneath is protected by firestore.rules regardless (sections 4–6c,
   10b, 11b, 13 and 14 grant every read below to the class's own teacher only); this module
   hiding things is a convenience, never the protection.

   What it adds to the dashboard shell:
     - the class card at the top of the rail (switcher, code, Copy, Show on screen, plan);
     - rail headings "Learn" and "Mission Control", and the four Mission Control views:
       #class (Class overview, with "Assign several"), #students, #reports (the drill-downs,
       unchanged) and #guides;
     - the class at the top of Home, then "Your own practice";
     - Try it / Assign (and Present on simulations) on every content card;
     - the student panel, the Pro panel, the class dialogs, Show on screen and the poster.
   /mission-control/ itself keeps teacher sign-in, sign-up and the consent screen, and sends a
   set-up teacher here (/dashboard/#class).

   Analytics: no GA4 is loaded here. The dashboard already loads its product property behind
   the ag_account gate for a signed-in teacher; track() sends to whatever window.gtag that
   gate set up, and does nothing when there is none. */
import {
    doc, getDoc, getDocs, setDoc, deleteDoc, collection, query, where, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { MODULE_DATA } from './module-data.js';
import {
    toMillis, relativeTime, buildStudent, initialsOf,
    summarizeGameSessions, gameSessionsFromTelemetry,
    buildCatalog, assignmentSummary, GAME_MINUTES,
    attentionList, perStepTiming,
    effectiveAssignment, unionAssigned, extrasFromDoc,
    choiceTag, choicesFor, drillLesson, drillChallenge, drillGame, drillSim, simProgress,
    worthFiveMinutes, checkInReason, capRoster, activeMsThisWeek, choiceLevelRows,
    ACTIVE_WINDOW_DAYS, DAY,
} from './derive.js';
import {
    FREE_STUDENT_LIMIT, FREE_CLASS_LIMIT, PRO_PRICE_LABEL, PRO_CHECKOUT_URL, PRO_CONTACT_EMAIL, PRO_AUTO_ON,
    GUIDES, GUIDE_BUNDLE,
} from './plan-config.js';
// The registry loader the games already share: one cached fetch of /data/modules-registry.json.
import { loadRegistry } from '/js/skill-routing.js';
import { createClass as createClassShared } from './classes.js';
import { storyReport, studentStory, playedStoryIds, growthReport, presentedGrowth, presentedVote } from './espanol-report.js';

// Embarque → Aduana (the growth view and the postcard rubric) is behind a flag: on for
// staging, off for production until the item bank has had its native-speaker review. See
// /js/site-config.js, which the dashboard loads before this module.
// The one exception while it is off: an admin account that opened the dashboard with
// ?checks=preview (AG_CONFIG.espanolChecksFor). Decided in load(), once the user is known;
// nothing reads it before then.
let CHECKS_ON = !!(window.AG_CONFIG && window.AG_CONFIG.ESPANOL_CHECKS_ON);
const CHECKS_PREVIEW = () => CHECKS_ON && !(window.AG_CONFIG && window.AG_CONFIG.ESPANOL_CHECKS_ON);

const { db, appId, auth, waitForAuthReady } = window.AuthCore;

/* ── the teacher's parts of the dashboard ─────────────────────────────────────
   Inserted once, synchronously, when this module first runs — before any listener below is
   attached, so every $('…') the moved code reaches for already exists. Every element added
   carries data-teacher. The ids are Mission Control's own, so the moved code is unchanged. */
const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function mountMarkup() {
    if (document.getElementById('mc-overlays')) return;
    if (!document.querySelector('link[href="/mission-control/teacher.css"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = '/mission-control/teacher.css';
        document.head.appendChild(css);
    }
    document.body.classList.add('is-teacher');
    const rail = document.querySelector('.rail');
    const tabs = rail.querySelector('.tabs');
    // The class card: on every teacher page, at the top of the rail.
    tabs.insertAdjacentHTML('beforebegin', `<div class="tclass" data-teacher>
        <div class="clsel">
          <button class="clsbtn" id="cls-btn" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="cls-menu"><span class="sr">Class: </span><span class="clsname" id="cls-name">Your class</span>${CHEVRON}<span class="sr"> (switch class)</span></button>
          <div class="menu" id="cls-menu" role="menu" hidden></div>
        </div>
        <div class="tcode"><span class="lbl">Class code</span><b id="code-value">—</b></div>
        <div class="tacts"><button class="mini" id="btn-copy-code" type="button">Copy</button><button class="mini" id="btn-show-screen" type="button">Show on screen</button></div>
        <button class="plan" id="plan-chip" type="button" data-pro="upgrade">FREE</button>
      </div>`);
    // Learn (the same catalog students see), then Mission Control, then Profile.
    tabs.insertAdjacentHTML('afterbegin', '<p class="rail-h" data-teacher>Learn</p>');
    const profileTab = tabs.querySelector('a.tab[data-view="profile"]');
    profileTab.insertAdjacentHTML('beforebegin', `<p class="rail-h" data-teacher>Mission Control</p>
        <a class="tab" href="#class" data-view="class" data-teacher><i data-lucide="layout-grid"></i>Class overview</a>
        <a class="tab" href="#students" data-view="students" data-teacher><i data-lucide="users"></i>Students<span class="n" id="cnt-students"></span></a>
        <a class="tab" href="#reports" data-view="reports" data-teacher><i data-lucide="chart-line"></i>Reports</a>
        <a class="tab" href="#guides" data-view="guides" data-teacher><i data-lucide="file-text"></i>Teacher guides</a>
        <span class="rail-sp" data-teacher></span>`);

    const main = document.getElementById('main');
    main.insertAdjacentHTML('afterbegin', '<div class="mcx" data-teacher><div id="class-banner"></div></div>');
    // Home: the class first, then the teacher's own practice (Keep going and badges).
    $('hello-sub').insertAdjacentHTML('afterend', '<div class="mcx" id="t-home" data-teacher></div>');
    $('continue').insertAdjacentHTML('beforebegin', '<h2 class="t-own" data-teacher>Your own practice</h2>');
    main.querySelector('.view-foot').insertAdjacentHTML('beforebegin', `
        <section class="view" data-view="class" aria-labelledby="cls-title" hidden data-teacher>
          <p class="k">Class overview</p>
          <h1 class="view-title" id="cls-title" tabindex="-1">Your class</h1>
          <p class="sub" id="cls-sub"></p>
          <div class="row t-acts"><button class="btn" type="button" data-goto="assign" id="btn-assign-several">Assign several</button><button class="btn ghost" id="btn-print-code" type="button">Print poster</button><button class="btn ghost" type="button" data-wall>Show on screen</button></div>
          <div class="mcx" id="pane-overview"></div>
          <div class="mcx" id="pane-assign" hidden></div>
        </section>
        <section class="view" data-view="students" aria-labelledby="stu-title" hidden data-teacher>
          <h1 class="view-title" id="stu-title" tabindex="-1">Students</h1>
          <p class="sub">Tap a student to see their work. Tick students to give them extra work.</p>
          <div class="mcx" id="pane-students"></div>
        </section>
        <section class="view" data-view="reports" aria-labelledby="rep-title" hidden data-teacher>
          <h1 class="view-title" id="rep-title" tabindex="-1">Reports</h1>
          <p class="sub">Where the class got stuck, by assignment. Practice, not grades.</p>
          <div class="mcx" id="pane-reports"></div>
        </section>
        <section class="view" data-view="guides" aria-labelledby="gd-title" hidden data-teacher>
          <h1 class="view-title" id="gd-title" tabindex="-1">Teacher guides</h1>
          <p class="sub">Facilitator guides for the Lab Packs and simulations.</p>
          <div class="mcx" id="pane-guides"></div>
        </section>`);

    // Profile: what Mission Control's footer had (the product-updates choice).
    const panel = $('teacher-panel');
    panel.innerHTML = `<p class="k">Teacher</p>
        <h2>You're signed in as a teacher.</h2>
        <p>Your class is under Mission Control in the menu. Your own lessons and badges are on Home.</p>
        <p class="emailpref"><label><input type="checkbox" id="updates-toggle"> Email me occasional updates about new simulations and features</label><span id="updates-saved" role="status" aria-live="polite"></span></p>`;

    // Overlays: the student panel, Show on screen, the Pro panel, the class dialogs, the
    // poster and a loading note. Outside .stage, so they cover the whole window.
    document.body.insertAdjacentHTML('beforeend', `<div class="mcx" id="mc-overlays" data-teacher>
<div class="t-loading" id="screen-loading" role="status" aria-live="polite" hidden><span class="spinner" aria-hidden="true"></span><span id="loading-note">Loading your class…</span></div>

<!-- THE STUDENT PANEL. Slides in from the right; closes with × or Escape. -->
<div class="scrim" id="scrim" hidden></div>
<aside class="drawer" id="drawer" aria-label="Student" aria-hidden="true" tabindex="-1"></aside>

<!-- SHOW ON SCREEN: the code and the join address, full screen, for a projector. No student
     names may ever appear here. -->
<div class="wall" id="wall" role="dialog" aria-modal="true" aria-label="Class code on screen" hidden>
  <p>Go to <b>allgoodacademy.com/join</b> and type</p>
  <div class="big" id="wall-code">—</div>
  <p>No account needed.</p>
  <button class="btn" id="btn-hide-wall" type="button">Back to the dashboard</button>
</div>

<!-- THE PRO PANEL. Opened from "+ New class", the student limit, a guide, or the choice-level CSV. -->
<div class="modal" id="pro-panel" role="dialog" aria-modal="true" aria-labelledby="pro-title" hidden>
  <div class="mcard">
    <button class="x" id="btn-pro-close" type="button" aria-label="Close">×</button>
    <div class="eyebrow" id="pro-why">Mission Control Pro</div>
    <h2 id="pro-title">Mission Control Pro</h2>
    <p class="sub" style="margin-top:4px">For teachers with more than one class. Students never pay and never need an account — every lesson, game and simulation stays free.</p>
    <div class="cmp" role="table" aria-label="Free and Pro compared">
      <div class="h" role="columnheader"></div><div class="h" role="columnheader">Free</div><div class="h pro" role="columnheader">Pro</div>
      <div role="cell">Classes</div><div role="cell" id="cmp-classes">1</div><div class="pro" role="cell"><b>Unlimited</b></div>
      <div role="cell">Students shown per class</div><div role="cell" id="cmp-students">30</div><div class="pro" role="cell"><b>Unlimited</b></div>
      <div role="cell">Everything students play</div><div role="cell">✓</div><div class="pro" role="cell">✓</div>
      <div role="cell">Step-by-step and choice-level detail</div><div role="cell">✓</div><div class="pro" role="cell">✓</div>
      <div role="cell">Assign to one student or a group</div><div role="cell">✓</div><div class="pro" role="cell">✓</div>
      <div role="cell">Facilitator guides (PDF)</div><div role="cell">Free guides</div><div class="pro" role="cell"><b>Every guide included</b></div>
      <div role="cell">Export choice-level CSV</div><div role="cell">—</div><div class="pro" role="cell">✓</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px 16px;flex-wrap:wrap">
      <div class="price" id="pro-price">$49/year</div>
      <a class="btn" id="btn-get-pro" href="#" target="_blank" rel="noopener">Get Pro</a>
      <span class="meta" id="pro-after">Schools can ask for an invoice.</span>
    </div>
  </div>
</div>

<!-- NEW CLASS (Pro) and RENAME. One small dialog, two uses. -->
<div class="modal" id="name-dlg" role="dialog" aria-modal="true" aria-labelledby="name-title" hidden>
  <form class="mcard" id="name-form" style="max-width:440px">
    <button class="x" id="btn-name-close" type="button" aria-label="Close">×</button>
    <h2 id="name-title">New class</h2>
    <label class="field"><span style="font-size:13px;font-weight:700">Class name</span>
      <input type="text" id="name-input" maxlength="60" required autocomplete="off" placeholder="e.g. Period 4 · Digital Citizenship"></label>
    <div class="screen-error" id="name-error" hidden></div>
    <button class="btn" id="btn-name-save" type="submit">Create class</button>
  </form>
</div>

<!-- Delete this class (2026-11-25). Opened from the class menu. -->
<div class="modal" id="del-dlg" role="dialog" aria-modal="true" aria-labelledby="del-title" hidden>
  <div class="mcard" style="max-width:460px">
    <button class="x" id="btn-del-close" type="button" aria-label="Close">×</button>
    <h2 id="del-title">Delete this class?</h2>
    <div id="del-body"></div>
    <div class="screen-error" id="del-error" hidden></div>
    <div id="del-actions" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"></div>
  </div>
</div>

<!-- The wall poster's print path. Hidden on screen; the ONLY thing that prints (see
     teacher.css, @media print). Populated with the active class so it can never show a
     stale code. -->
<div class="print-sheet" id="print-sheet">
  <div class="p-kicker">Allgood Academy</div>
  <div class="p-class" id="p-class"></div>
  <div class="p-code" id="p-code"></div>
  <div class="p-how">
    Go to <strong>allgoodacademy.com/join</strong> and type this code.
  </div>
  <!-- Filled by renderJoinQr() only when the locally bundled generator loaded; if it
       didn't, the poster still carries the address and the code, which is all a student
       needs. -->
  <div class="p-qr" id="p-qr" hidden></div>
  <div class="p-qr-note" id="p-qr-note" hidden>Or scan to join</div>
  <div class="p-foot">No account needed. Joining is what links your work to your teacher.</div>
</div>
</div>`);
    // The poster's QR generator, bundled locally (no third-party host). Best-effort: the
    // poster works without it.
    if (typeof window.qrcode !== 'function' && !document.querySelector('script[src="/assets/js/qrcode-generator.js"]')) {
        const s = document.createElement('script');
        s.src = '/assets/js/qrcode-generator.js';
        s.onload = () => { if (state.code) renderJoinQr(state.code); };
        document.head.appendChild(s);
    }
    if (window.lucide) window.lucide.createIcons();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Every step title, scenario and choice comes from module-data.js (generated from the
   modules themselves); every assignable item from /data/modules-registry.json; every plan
   number and guide from plan-config.js. Nothing below enumerates a module.
   ───────────────────────────────────────────────────────────────────────────── */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const $ = (id) => document.getElementById(id);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fmtMins = (ms) => {
    const m = Math.round((ms || 0) / 60000);
    if (m < 60) return `${m} min`;
    return `${(m / 60).toFixed(1)} hrs`;
};
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—');

const ICONS = {
    story: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
    lab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
    challenge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/></svg>',
    game: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M7 10v4M5 12h4"/><circle cx="16" cy="11" r=".8"/><circle cx="18" cy="13" r=".8"/></svg>',
    sim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
};
const TYPE_LABEL = { lab: 'Lesson', challenge: 'Challenge', game: 'Game', sim: 'Simulation', story: 'Español story' };
// What a teacher is shown: an Español story is tracked as a sim (itemOf) but labelled as a story.
const shownType = (it) => (it && it.kind === 'story' ? 'story' : it.type);
const AVATAR_COLORS = ['#357889', '#CF4616', '#2E7D52', '#5B4B8A', '#8F5E0E', '#204B55'];
function colorForUid(uid) {
    let h = 0;
    for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
const TAG_CLASS = { BEST: 'b', OK: 'o', RISKY: 'w' };
const tagHtml = (tag) => (tag ? `<span class="mk ${TAG_CLASS[tag]}">${tag}</span>` : '');

/* ── toast ─────────────────────────────────────────────────────────────────── */
let toastTimer = null;
function toast(message, isError = false) {
    let el = $('mc-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'mc-toast';
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        ($('mc-overlays') || document.body).appendChild(el);
    }
    el.textContent = message;
    el.classList.toggle('err', isError);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 7000 : 3400);
}

/* ── state ─────────────────────────────────────────────────────────────────── */
const state = {
    user: null,
    me: {},
    plan: { pro: false, expired: false, until: 0 },
    classes: [],             // every class this teacher owns (classrooms where teacherUid == uid)
    marker: undefined,       // teacher_free_class/{uid} data, null when none, undefined when unreadable
    code: null,
    classroom: null,
    readOnly: false,         // an extra class after Pro lapsed
    catalog: null,
    registryById: new Map(),
    extrasByUid: {},
    allStudents: [],         // everyone who joined (progress for all of them is recorded)
    students: [],            // who this plan shows: the first FREE_STUDENT_LIMIT by join time on Free
    hiddenCount: 0,
    sessionsReadable: true,
    eventsReadable: true,
    tab: 'overview',
    drillId: null,           // an assignment open on Overview
    reportTab: null,         // Reports: lessons | challenges | games | sims | espanol
    presented: [],           // this class's presented sessions (Presentar en clase), newest first
    storyCfg: {},
    storyChecks: {},         // story id → its checks.json (flag on only; false loading, null failed)
    rubrics: {},             // `${uid}_${story}` → the teacher's postcard rubric taps (flag on only)            // story id → its report.json (false while loading, null if it failed)
    filter: 'all',           // Students tab: all | check | done
    search: '',
    selected: new Set(),     // Students tab ticks
    scope: null,             // null = whole class; else [uid, ...] the Assign tab is scoped to
    draft: null,             // { modules:Set, games:Set, sims:Set } while editing
    draftBase: null,         // what the draft started from, to count changes
    panelUid: null,
};

/* ── screens ──────────────────────────────────────────────────────────────────
   Inside the dashboard there is no separate screen to switch to: while a class loads or
   switches, a small note shows over the page; once it is ready the note goes away.
   Sign-in, sign-up and the consent screen stay on /mission-control/. */
mountMarkup();
function showOnly(id) {
    const loading = id === 'screen-loading';
    $('screen-loading').hidden = !loading;
    $('main').setAttribute('aria-busy', loading ? 'true' : 'false');
}
// A load that failed: say so where the class banner goes, with a way to try again.
function showGate(title, body, linkText, linkHref) {
    showOnly('app');
    $('class-banner').innerHTML = `<div class="cbanner" role="alert"><span><strong>${esc(title)}</strong> ${esc(body)}</span>
        <a class="btn sm" href="${esc(linkHref)}">${esc(linkText)}</a></div>`;
}

/* Analytics: the dashboard's own GA4 (loaded only behind its ag_account gate, i.e. for a
   signed-in teacher) receives these events; with no gtag on the page, nothing is sent.
   Events carry NO uid, email, class code, nickname or student data — only the event name
   and, at most, a content type or guide id. */
function track(name, params) {
    // The Help Center listens for real successes (assigned, class made, guide downloaded) to
    // credit the article or tour that helped. The name only, never the params.
    try { window.dispatchEvent(new CustomEvent('ag:track', { detail: { name } })); } catch (e) { /* never break the page */ }
    if (typeof window.gtag !== 'function') return;
    try { window.gtag('event', name, { ...(params || {}), transport_type: 'beacon' }); } catch (e) { /* never break the page */ }
}
const createClass = (user, name, opts) => createClassShared(user, name, { ...opts, track });


/* ── the plan ─────────────────────────────────────────────────────────────────
   teacher_plans/{uid}, written only by the admin (Insider) — firestore.rules #13. A read
   that fails (rules not yet deployed, or offline) is treated as the free plan: the page
   never grants itself anything. */
async function readPlan(uid) {
    try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'teacher_plans', uid));
        if (!snap.exists()) return { pro: false, expired: false, until: 0 };
        const d = snap.data() || {};
        const until = toMillis(d.proUntil);
        const isProPlan = d.plan === 'pro';
        return { pro: isProPlan && until > Date.now(), expired: isProPlan && until > 0 && until <= Date.now(), until };
    } catch (e) {
        console.warn('[Mission Control] plan unreadable — showing the free plan', e && e.code);
        return { pro: false, expired: false, until: 0 };
    }
}

/* Every class this teacher owns, for the switcher. Falls back to the active class alone
   (the legacy single-class teacher, or rules that predate the list grant). */
async function readClasses(uid, activeCode, activeData) {
    let list = [];
    try {
        const snap = await getDocs(query(collection(db, 'artifacts', appId, 'classrooms'), where('teacherUid', '==', uid)));
        list = snap.docs.map((d) => ({ code: d.id, ...d.data() }));
    } catch (e) {
        console.warn('[Mission Control] class list unavailable — showing the active class only', e && e.code);
    }
    if (activeCode && !list.some((c) => c.code === activeCode)) list.push({ code: activeCode, ...(activeData || {}) });
    return list.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt) || a.code.localeCompare(b.code));
}

/* The free-class marker (#14). A teacher whose class predates the plan has none; the first
   load writes it, naming their earliest class, so "the free class" is known if Pro lapses. */
async function readMarker(uid) {
    try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'teacher_free_class', uid));
        if (snap.exists()) return snap.data();
        const first = state.classes[0];
        if (!first) return null;
        await setDoc(doc(db, 'artifacts', appId, 'teacher_free_class', uid), { firstClassCode: first.code, createdAt: serverTimestamp() });
        return { firstClassCode: first.code };
    } catch (e) {
        console.warn('[Mission Control] free-class marker unavailable', e && e.code);
        return undefined;
    }
}

const className = (c) => (c && c.name) || (c && c.teacherName ? `${c.teacherName}'s class` : 'Your class');
const isFreeClass = (code) => !state.marker || state.marker.firstClassCode === code;

/* ═════════════════════════════════════════════════════════════════════════════
   LOAD — everything Mission Control shows, for the active class.

   What the rules let a teacher read, and where each figure comes from:
     users/{uid} where classroomCode/role, classroom_members   the roster (#4, #6b)
     users/{uid}/game_scores, scenario_attempts, module_progress (#6)
     sessions where uid == student                              time on task, sims (#10b)
     events where uid == student                                the drill-down (#11b)
   Sessions and events are read ONE STUDENT AT A TIME: a query pinned to one uid stays
   inside Firestore's document-access budget however large the class. Each degrades on a
   denial instead of failing the page.
   ═════════════════════════════════════════════════════════════════════════════ */
async function load() {
    const user = await waitForAuthReady();
    state.user = user;
    CHECKS_ON = !!(window.AG_CONFIG && typeof window.AG_CONFIG.espanolChecksFor === 'function' && window.AG_CONFIG.espanolChecksFor(user));
    const meSnap = user ? await getDoc(doc(db, 'artifacts', appId, 'users', user.uid)) : null;
    const me = meSnap && meSnap.exists() ? meSnap.data() : {};
    state.me = me;
    // The product-updates choice (opt-in). Missing field = not asked yet = off.
    const upd = $('updates-toggle');
    if (upd && user) {
        upd.checked = !!(me.productUpdates && me.productUpdates.optedIn === true);
        upd.onchange = async () => {
            const said = $('updates-saved');
            try {
                await window.AuthCore.setProductUpdates(user.uid, upd.checked, 'settings');
                said.textContent = upd.checked ? ' Saved — you\'ll get occasional updates.' : ' Saved — no update emails.';
            } catch (e) {
                console.warn('[Mission Control] could not save the updates choice', e && e.code);
                upd.checked = !upd.checked;
                said.textContent = " Couldn't save that. Try again.";
            }
        };
    }
    // Sign-in, sign-up, consent and the first class all happen on /mission-control/. The
    // dashboard only imports this module for a teacher with a class, so this is the rare
    // case of a session that changed underneath it: send it back to finish there.
    if (me.role !== 'teacher' || !me.classroomCode) {
        window.location.replace('/mission-control/');
        return;
    }
    $('loading-note').textContent = 'Loading your class…';

    state.code = me.classroomCode;
    const classSnap = await getDoc(doc(db, 'artifacts', appId, 'classrooms', state.code));
    state.classroom = classSnap.exists() ? classSnap.data() : {};
    const [plan, classes] = await Promise.all([readPlan(user.uid), readClasses(user.uid, state.code, state.classroom)]);
    state.plan = plan;
    state.classes = classes;
    state.marker = await readMarker(user.uid);
    state.readOnly = !state.plan.pro && state.marker != null && state.marker.firstClassCode !== state.code;

    const registry = await loadRegistry().catch((e) => {
        console.warn('[Mission Control] module registry unavailable — the Assign tab will say so', e);
        return [];
    });
    state.registryById = new Map(registry.map((m) => [m.id, m]));
    state.catalog = buildCatalog(registry);

    // Roster: the UNION of the join table and the legacy single-field query. Each is read on
    // its own; losing one costs only the members it alone can see.
    const [memberSnap, legacySnap] = await Promise.all([
        getDocs(query(collection(db, 'artifacts', appId, 'classroom_members'), where('classroomCode', '==', state.code)))
            .catch((e) => { console.warn('[Mission Control] classroom_members query failed', e && e.code); return null; }),
        getDocs(query(collection(db, 'artifacts', appId, 'users'), where('classroomCode', '==', state.code), where('role', '==', 'student')))
            .catch((e) => { console.warn('[Mission Control] legacy roster query failed', e && e.code); return null; }),
    ]);
    if (!memberSnap && !legacySnap) {
        throw new Error('Your roster could not be read. This is a permissions problem, not an empty class — the code is fine to keep sharing.');
    }
    const joinedAt = new Map();
    if (memberSnap) memberSnap.docs.forEach((d) => joinedAt.set(d.data().uid, toMillis(d.data().joinedAt) || 1));
    const memberUids = [...new Set([
        ...(memberSnap ? memberSnap.docs.map((d) => d.data().uid) : []),
        ...(legacySnap ? legacySnap.docs.map((d) => d.id) : []),
    ])].filter((uid) => uid && uid !== state.classroom.teacherUid);

    state.extrasByUid = {};
    try {
        const extraSnap = await getDocs(query(collection(db, 'artifacts', appId, 'classroom_assignments'), where('classroomCode', '==', state.code)));
        extraSnap.docs.forEach((d) => {
            const data = d.data() || {};
            const parsed = extrasFromDoc(data);
            if (parsed && data.uid) state.extrasByUid[data.uid] = parsed;
        });
    } catch (e) {
        console.warn('[Mission Control] per-student extras unavailable — showing the class set only', e && e.code);
    }

    // Presented sessions (Presentar en clase): class-level vote counts the teacher saved from
    // the projector. No student is in them. Unreadable is not fatal: the report just omits them.
    state.presented = [];
    try {
        const pSnap = await getDocs(collection(db, 'artifacts', appId, 'classrooms', state.code, 'presented_sessions'));
        state.presented = pSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    } catch (e) {
        console.warn('[Mission Control] presented sessions unavailable', e && e.code);
    }

    // Postcard rubric taps (Embarque → Aduana, flag on only): the teacher's own notes on a
    // postcard written on paper or in Google Classroom. Only the taps are stored.
    state.rubrics = {};
    if (CHECKS_ON) {
        try {
            const rSnap = await getDocs(collection(db, 'artifacts', appId, 'classrooms', state.code, 'rubric_scores'));
            rSnap.docs.forEach((d) => { state.rubrics[d.id] = d.data(); });
        } catch (e) {
            console.warn('[Mission Control] rubric taps unavailable', e && e.code);
        }
    }

    const rows = (await Promise.all(memberUids.map(async (uid) => {
        try {
            const snap = await getDoc(doc(db, 'artifacts', appId, 'users', uid));
            return snap.exists() ? { uid, ...snap.data() } : null;
        } catch (e) { return null; }
    }))).filter(Boolean);

    $('loading-note').textContent = `Reading progress for ${plural(rows.length, 'student')}…`;
    state.sessionsReadable = true;
    state.eventsReadable = true;
    const loaded = [];
    // A few at a time, so a 30-student class does not fire 150 requests at once on a Chromebook.
    for (let i = 0; i < rows.length; i += 8) {
        loaded.push(...await Promise.all(rows.slice(i, i + 8).map(loadStudent)));
    }
    loaded.forEach((s) => { s.joinedAt = joinedAt.get(s.uid) || 0; });
    state.allStudents = loaded;
    applyCap();

    state.drillId = null;
    state.selected = new Set();
    state.scope = null;
    resetDraft();
    paintHeader();
    showOnly('app');
    renderAll();
}

/* The free plan shows the first FREE_STUDENT_LIMIT students by join time. Nobody is ever
   refused, and everyone's progress is recorded either way — see capRoster(). */
function applyCap() {
    const { shown, hidden } = capRoster(state.allStudents, { limit: FREE_STUDENT_LIMIT, pro: state.plan.pro });
    state.students = shown.slice().sort((a, b) => a.name.localeCompare(b.name));
    state.hiddenCount = hidden.length;
}

/* One student's effective assignment: the class set plus their extras. `modules` is the
   trackable subset (MODULE_DATA has step data); `allModules` everything assigned. */
function assignmentFor(uid) {
    const c = state.classroom || {};
    const merged = effectiveAssignment({
        classModules: Array.isArray(c.assignedModules) ? c.assignedModules : [],
        classGames: Array.isArray(c.assignedGames) ? c.assignedGames : [],
        classSims: Array.isArray(c.assignedSims) ? c.assignedSims : [],
        extras: state.extrasByUid[uid] || null,
    });
    return { ...merged, trackable: merged.modules.filter((id) => MODULE_DATA[id]) };
}

async function readPerStudent(coll, uid, flag) {
    if (!state[flag]) return null;
    try {
        const snap = await getDocs(query(collection(db, 'artifacts', appId, coll), where('uid', '==', uid)));
        return snap.docs.map((d) => d.data());
    } catch (e) {
        // A real denial will repeat for every student: latch it off. A transient failure
        // does not latch — it would blind the whole page for no reason.
        if (e && e.code === 'permission-denied') state[flag] = false;
        console.warn(`[Mission Control] ${coll} unavailable for one student`, e && e.code);
        return null;
    }
}

async function loadStudent(row) {
    const scoresCol = collection(db, 'artifacts', appId, 'users', row.uid, 'game_scores');
    const [scoreSnap, progressSnap, sessions, events] = await Promise.all([
        getDocs(scoresCol).catch(() => null),
        getDocs(collection(db, 'artifacts', appId, 'users', row.uid, 'module_progress')).catch(() => null),
        readPerStudent('sessions', row.uid, 'sessionsReadable'),
        readPerStudent('events', row.uid, 'eventsReadable'),
    ]);
    const sess = sessions || [];
    const scores = scoreSnap ? scoreSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
    // scenario_attempts: the drill-down's fallback when events cannot be read.
    const attempts = [];
    if (scoreSnap) {
        await Promise.all(scoreSnap.docs.map(async (sd) => {
            try {
                const aSnap = await getDocs(collection(sd.ref, 'scenario_attempts'));
                aSnap.docs.forEach((a) => attempts.push({ id: a.id, scoreId: sd.id, gameName: sd.data().gameName, ...a.data() }));
            } catch (e) { /* none, or denied — neither is fatal */ }
        }));
    }
    const progress = {};
    if (progressSnap) progressSnap.docs.forEach((d) => { progress[d.id] = d.data(); });
    const raw = { row, scores, attempts, progress, sessions: sess, gameSessions: gameSessionsFromTelemetry(sess) };
    const s = build(raw);
    s.events = events;   // null when unreadable: everything below falls back to attempts
    return s;
}

/* buildStudent() plus everything this page adds. Pure over the documents already held,
   so an assignment change re-derives in place without re-reading Firestore. */
function build(raw) {
    const mine = assignmentFor(raw.row.uid);
    const s = buildStudent({
        row: raw.row, assigned: mine.trackable, moduleData: MODULE_DATA,
        scores: raw.scores, attempts: raw.attempts, progress: raw.progress,
        sessions: raw.sessions, gameSessions: raw.gameSessions,
    });
    s.raw = raw;
    s.mine = mine;
    s.games = summarizeGameSessions(raw.gameSessions);
    s.color = colorForUid(raw.row.uid);
    // Last seen anywhere, simulations included (buildStudent only sees its own modules).
    s.lastSeen = Math.max(s.lastActive || 0, ...raw.sessions.map((x) => toMillis(x.lastSeenAt) || toMillis(x.startedAt)));
    s.weekMs = activeMsThisWeek(raw.sessions);
    return s;
}
function rebuild(s) {
    const next = build(s.raw);
    next.events = s.events;
    next.joinedAt = s.joinedAt;
    return next;
}
function rebuildAll() {
    state.allStudents = state.allStudents.map(rebuild);
    applyCap();
}

/* ── per-item status for one student ──────────────────────────────────────── */
function itemOf(id) {
    const m = state.registryById.get(id);
    if (!m) return { id, name: (MODULE_DATA[id] && MODULE_DATA[id].name) || id, type: 'lab', minutes: 0 };
    // An Español story is tracked like a simulation (derive.js buildCatalog), matched by its
    // module id only: both stories share the 'espanol' stream.
    const story = m.type === 'story';
    return {
        id, name: m.name, type: story ? 'sim' : m.type, kind: story ? 'story' : m.type, url: m.url,
        minutes: m.type === 'game' ? GAME_MINUTES : (Number(m.durationMinutes) || 15),
        stream: story ? null : m.stream, eventPrefix: m.eventPrefix, stepsTotal: Number(m.stepsTotal) || 0,
        gameNames: m.gameNames || [], defaultDestination: m.defaultDestination || null,
    };
}
function statusFor(s, id) {
    const it = itemOf(id);
    if (it.type === 'sim') {
        const p = simProgress(s, it);
        return { done: p.completed, started: p.maxStep > 0, label: p.completed ? 'Finished' : (p.maxStep ? `Step ${p.maxStep} of ${it.stepsTotal}` : 'Not started') };
    }
    if (it.type === 'game') {
        const g = (s.games || []).find((x) => x.id === id);
        return { done: !!g, started: !!g, label: g ? (g.bestPct != null ? `Best ${g.bestPct}%` : 'Played') : 'Not played' };
    }
    const m = s.modules[id];
    if (m) return { done: m.completed, started: m.maxStep > 0, label: m.completed ? 'Finished' : (m.maxStep ? `Step ${m.maxStep} of ${m.meta.stepsTotal}` : 'Not started') };
    // A lesson Mission Control has no step data for: completion still comes from game_scores.
    const done = (s.raw.scores || []).some((x) => it.gameNames.includes(x.gameName) && x.completed === true);
    const started = done || (s.raw.scores || []).some((x) => it.gameNames.includes(x.gameName));
    return { done, started, label: done ? 'Finished' : (started ? 'In progress' : 'Not started') };
}
const allAssignedIds = (mine) => [...mine.modules, ...mine.games, ...mine.sims];

/* ═════════════════════════════════════════════════════════════════════════════
   HEADER: class switcher, code, plan
   ═════════════════════════════════════════════════════════════════════════════ */
function paintHeader() {
    const name = className({ ...state.classroom, code: state.code });
    $('cls-name').textContent = name;
    $('code-value').textContent = state.code;
    $('wall-code').textContent = state.code;
    $('p-code').textContent = state.code;
    $('p-class').textContent = name;
    renderJoinQr(state.code);
    // Class overview's heading, and the rail's line under the teacher's name.
    $('cls-title').textContent = name;
    $('cls-sub').innerHTML = `Code <b class="tcode-inline">${esc(state.code)}</b> · students go to <strong>allgoodacademy.com/join</strong> and type it.`;
    $('me-class').textContent = `Teacher · ${state.plan.pro ? 'Pro' : 'Free'}`;
    const chip = $('plan-chip');
    // Free: the chip is the always-visible way in to Pro. Pro: a plain label.
    chip.textContent = state.plan.pro ? 'PRO' : `FREE · Upgrade ${PRO_PRICE_LABEL.replace('/year', '/yr')}`;
    chip.classList.toggle('pro', state.plan.pro);
    chip.classList.toggle('up', !state.plan.pro);
    chip.disabled = !!state.plan.pro;
    if (state.plan.pro) chip.removeAttribute('data-pro'); else chip.dataset.pro = 'upgrade';
    document.title = `${name} — My dashboard`;
    // A signed-in teacher: the nav drops "Teacher sign in" from now on, since "My dashboard"
    // is where their class is (the same flag the nav's session script reads on every page).
    try { window.AuthCore.markAccount(); } catch (e) { /* storage blocked */ }
    const signinLink = document.querySelector('.nav-signin');
    if (signinLink) signinLink.remove();

    const banner = $('class-banner');
    if (state.plan.expired) {
        const ended = new Date(state.plan.until).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
        banner.innerHTML = `<div class="cbanner"><span><strong>Your Pro plan ended on ${esc(ended)}.</strong> Nothing is deleted. ${
            state.readOnly ? 'This class is read-only until you renew: you can see everything, but not change what it has assigned.'
                : 'Your free class works as before; your other classes are read-only until you renew.'}</span>
            <button class="btn sm" type="button" data-pro="renew">Renew Pro</button></div>`;
    } else if (state.readOnly) {
        banner.innerHTML = `<div class="cbanner"><span><strong>This class is read-only on the free plan.</strong> Nothing is deleted.</span>
            <button class="btn sm" type="button" data-pro="renew">See Pro</button></div>`;
    } else banner.innerHTML = '';
}

function renderClassMenu() {
    const menu = $('cls-menu');
    const rows = state.classes.map((c) => {
        const ro = !state.plan.pro && state.marker && state.marker.firstClassCode !== c.code;
        return `<button type="button" role="menuitem" data-switch="${esc(c.code)}"${c.code === state.code ? ' aria-current="true"' : ''}>
            <span>${esc(className(c))}${ro ? ' <span class="sm">· read-only</span>' : ''}</span><span class="sm">${esc(c.code)}</span></button>`;
    }).join('');
    menu.innerHTML = rows + '<hr>'
        + `<button type="button" role="menuitem" data-new-class><span>+ New class</span>${state.plan.pro ? '' : '<span class="plan pro">PRO</span>'}</button>`
        + (state.readOnly ? '' : '<button type="button" role="menuitem" data-rename><span>Rename this class</span></button>'
            + '<button type="button" role="menuitem" data-delete><span>Delete this class</span></button>');
}
function toggleMenu(open) {
    const menu = $('cls-menu');
    const on = open == null ? menu.hidden : open;
    if (on) renderClassMenu();
    menu.hidden = !on;
    $('cls-btn').setAttribute('aria-expanded', on ? 'true' : 'false');
    if (on) { const first = menu.querySelector('button'); if (first) first.focus(); }
}
$('cls-btn').addEventListener('click', () => toggleMenu());
document.addEventListener('click', (e) => {
    if (!e.target.closest('.clsel')) { const m = $('cls-menu'); if (!m.hidden) toggleMenu(false); }
});
$('cls-menu').addEventListener('click', async (e) => {
    const sw = e.target.closest('[data-switch]');
    if (sw) {
        toggleMenu(false);
        if (sw.dataset.switch !== state.code) await switchClass(sw.dataset.switch);
        return;
    }
    if (e.target.closest('[data-new-class]')) {
        toggleMenu(false);
        if (!state.plan.pro) return openPro('class');
        return openNameDialog('new');
    }
    if (e.target.closest('[data-rename]')) { toggleMenu(false); openNameDialog('rename'); }
    if (e.target.closest('[data-delete]')) { toggleMenu(false); openDeleteDialog(); }
});

/* ── deleting a class ─────────────────────────────────────────────────────────
   firestore.rules (#5) lets a teacher delete their own writable class, except the one their
   free-class marker names: the marker can't move, so losing that class would leave a free
   teacher unable to make another. The only class, or the free class, gets Rename instead.
   Order matters: the per-student extras go first (their delete rule checks the class still
   exists), then the teacher's ACTIVE class moves to another one (the profile may only name a
   class they own), then the class itself. Students keep everything they did; the dashboard
   shows them the join form again (loadAssignedItems finds no class). */
function openDeleteDialog() {
    const code = state.code;
    const name = className(state.classes.find((c) => c.code === code) || state.classroom);
    const isFree = !!(state.marker && state.marker.firstClassCode === code);
    const only = state.classes.length < 2;
    $('del-error').hidden = true;
    if (only || isFree) {
        $('del-title').textContent = "This class can't be deleted";
        $('del-body').innerHTML = only
            ? `<p>${esc(name)} is your only class. You can rename it instead${state.plan.pro ? ', or make a new class first and then delete this one' : ''}.</p>`
            : `<p>${esc(name)} is your first class, the one that stays free if Pro ever ends, so it can't be deleted. You can rename it instead.</p>`;
        $('del-actions').innerHTML = '<button class="btn" type="button" data-del="rename">Rename this class</button><button class="btn ghost" type="button" data-del="close">Close</button>';
    } else {
        const n = (state.allStudents || []).length;
        $('del-title').textContent = `Delete ${name}?`;
        $('del-body').innerHTML = `<p>${n ? `${n} student${n === 1 ? ' is' : 's are'} in this class. They keep everything they've done, but they leave the class and their work stops showing here.` : 'No students have joined this class yet.'} What you assigned to it is removed.</p>
            <p><strong>This can't be undone.</strong> The class code ${esc(code)} stops working.</p>`;
        $('del-actions').innerHTML = '<button class="btn danger" type="button" data-del="go">Delete class</button><button class="btn ghost" type="button" data-del="close">Cancel</button>';
    }
    openModal('del-dlg', $('del-actions').querySelector('[data-del="close"]'));
}
$('del-actions').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    if (b.dataset.del === 'close') { closeModal('del-dlg'); return; }
    if (b.dataset.del === 'rename') { closeModal('del-dlg'); openNameDialog('rename'); return; }
    const code = state.code;
    const name = className(state.classes.find((c) => c.code === code) || state.classroom);
    const others = state.classes.filter((c) => c.code !== code);
    const next = others.find((c) => state.plan.pro || !state.marker || c.code === state.marker.firstClassCode) || others[0];
    if (!next) return;
    b.disabled = true;
    try {
        const extras = await getDocs(query(collection(db, 'artifacts', appId, 'classroom_assignments'), where('classroomCode', '==', code)));
        await Promise.all(extras.docs.map((d) => deleteDoc(d.ref)));
        await setDoc(doc(db, 'artifacts', appId, 'users', state.user.uid), { classroomCode: next.code }, { merge: true });
        await deleteDoc(doc(db, 'artifacts', appId, 'classrooms', code));
        closeModal('del-dlg');
        track('class_deleted');
        showOnly('screen-loading');
        $('loading-note').textContent = 'Deleting the class…';
        await load();
        toast(`${name} was deleted. Now showing ${className(next)}.`);
    } catch (err) {
        console.warn('[Mission Control] deleting the class failed', err);
        $('del-error').textContent = "Couldn't delete the class. Please try again.";
        $('del-error').hidden = false;
        b.disabled = false;
    }
});
$('btn-del-close').addEventListener('click', () => closeModal('del-dlg'));

/* Switching writes the new code to users/{uid}.classroomCode — the ACTIVE class. The rules
   only accept a class whose teacherUid is this teacher (teacherCodeOk), and every teacher
   grant follows it. */
async function switchClass(code) {
    showOnly('screen-loading');
    $('loading-note').textContent = 'Switching class…';
    try {
        await setDoc(doc(db, 'artifacts', appId, 'users', state.user.uid), { classroomCode: code }, { merge: true });
        await load();
        toast(`Now showing ${className(state.classes.find((c) => c.code === code))}.`);
    } catch (e) {
        console.warn('[Mission Control] switching class failed', e);
        showOnly('app');
        toast("Couldn't switch class. Please try again.", true);
    }
}

let nameMode = 'new';
function openNameDialog(mode) {
    nameMode = mode;
    $('name-title').textContent = mode === 'new' ? 'New class' : 'Rename this class';
    $('btn-name-save').textContent = mode === 'new' ? 'Create class' : 'Save name';
    $('name-input').value = mode === 'rename' ? (state.classroom.name || '') : '';
    $('name-error').hidden = true;
    openModal('name-dlg', $('name-input'));
}
$('name-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('name-input').value.trim();
    const err = $('name-error');
    if (!name) { err.textContent = 'Give the class a name.'; err.hidden = false; return; }
    $('btn-name-save').disabled = true;
    try {
        if (nameMode === 'rename') {
            await setDoc(doc(db, 'artifacts', appId, 'classrooms', state.code), { name }, { merge: true });
            state.classroom.name = name;
            const c = state.classes.find((x) => x.code === state.code); if (c) c.name = name;
            closeModal('name-dlg');
            paintHeader();
            toast('Class renamed.');
        } else {
            closeModal('name-dlg');
            showOnly('screen-loading');
            $('loading-note').textContent = 'Creating your class…';
            await createClass(state.user, name, { needMarker: state.marker === null });
            await load();
            toast(`${name} is ready. Its code is ${state.code}.`);
        }
    } catch (e2) {
        console.warn('[Mission Control] class name write failed', e2);
        if (nameMode === 'new') { showOnly('app'); toast("Couldn't create the class. Please try again.", true); }
        else { err.textContent = "Couldn't save that. Please try again."; err.hidden = false; }
    } finally {
        $('btn-name-save').disabled = false;
    }
});
$('btn-name-close').addEventListener('click', () => closeModal('name-dlg'));

/* ── modals: one at a time, Escape closes, focus returns ───────────────────── */
let lastFocus = null;
function openModal(id, focusEl) {
    lastFocus = document.activeElement;
    $(id).hidden = false;
    (focusEl || $(id).querySelector('button, a, input')).focus();
}
function closeModal(id) {
    $(id).hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
}
for (const id of ['pro-panel', 'name-dlg', 'del-dlg']) {
    $(id).addEventListener('click', (e) => { if (e.target === $(id)) closeModal(id); });
}

/* ── the Pro panel ─────────────────────────────────────────────────────────── */
const PRO_WHY = {
    class: 'More than one class is a Pro feature',
    students: `See every student, not just the first ${FREE_STUDENT_LIMIT}`,
    guide: 'Every facilitator guide is included with Pro',
    csv: 'The choice-level CSV is a Pro feature',
    renew: 'Renew Mission Control Pro',
    upgrade: 'Mission Control Pro',
    guides: 'Every facilitator guide is included with Pro',
};
/* The Stripe Payment Link, with what lets the founder match the payment to this teacher in
   Insider: their sign-in email prefilled (skipped when there is none) and their uid as
   client_reference_id. Card details are only ever typed on Stripe's own page. */
function checkoutUrl() {
    const url = new URL(PRO_CHECKOUT_URL);
    const email = state.user && state.user.email;
    if (email) url.searchParams.set('prefilled_email', email);
    if (state.user && state.user.uid) url.searchParams.set('client_reference_id', state.user.uid);
    return url.toString();
}
function openPro(reason) {
    $('pro-why').textContent = PRO_WHY[reason] || 'Mission Control Pro';
    $('cmp-classes').textContent = String(FREE_CLASS_LIMIT);
    $('cmp-students').textContent = String(FREE_STUDENT_LIMIT);
    $('pro-price').textContent = PRO_PRICE_LABEL;
    const get = $('btn-get-pro');
    if (PRO_CHECKOUT_URL) {
        get.href = checkoutUrl();
        get.textContent = state.plan.expired ? 'Renew Pro' : 'Get Pro';
        get.target = '_blank';
        get.rel = 'noopener';
        $('pro-after').textContent = PRO_AUTO_ON
            ? 'Pay by card on Stripe. Pro turns on automatically, usually within a minute.'
            : 'Pay by card on Stripe. We turn Pro on for your account by hand within one business day.';
    } else {
        // No Payment Link yet: never card fields on this page, just an email.
        const subject = encodeURIComponent('Mission Control Pro');
        const body = encodeURIComponent(`Hi! I'd like Mission Control Pro.\n\nThe email I sign in with: ${(state.user && state.user.email) || ''}\n`);
        get.href = `mailto:${PRO_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
        get.removeAttribute('target');
        get.textContent = 'Email us to get Pro';
        $('pro-after').textContent = 'We turn Pro on for your account. Schools can ask for an invoice.';
    }
    openModal('pro-panel', $('btn-pro-close'));
    track('pro_panel_open', { reason: String(reason || '') });
}
$('btn-pro-close').addEventListener('click', () => closeModal('pro-panel'));
$('btn-get-pro').addEventListener('click', () => track('get_pro_click'));
document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-pro]');
    if (t) { e.preventDefault(); openPro(t.dataset.pro); }
});

/* ── code: copy, poster, show on screen ────────────────────────────────────── */
$('btn-copy-code').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(state.code);
        toast(`Class code ${state.code} copied.`);
    } catch (e) {
        console.warn('[Mission Control] clipboard write refused', e);
        toast(`Couldn't copy automatically — your code is ${state.code}.`, true);
    }
});
// The poster's QR: /join/?c=CODE on whichever host serves this page. Best-effort.
function renderJoinQr(code) {
    const host = $('p-qr');
    const note = $('p-qr-note');
    try {
        if (typeof window.qrcode !== 'function') return;
        const qr = window.qrcode(0, 'M');
        qr.addData(`${location.origin}/join/?c=${encodeURIComponent(code)}`);
        qr.make();
        host.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true, title: `Join class ${code}` });
        host.hidden = false;
        note.hidden = false;
    } catch (e) {
        console.warn('[Mission Control] poster QR unavailable', e);
        host.hidden = true;
        note.hidden = true;
    }
}
$('btn-print-code').addEventListener('click', () => window.print());
function showWall(on) {
    $('wall').hidden = !on;
    if (on) { lastFocus = document.activeElement; $('btn-hide-wall').focus(); }
    else if (lastFocus) lastFocus.focus();
}
$('btn-show-screen').addEventListener('click', () => showWall(true));
$('btn-hide-wall').addEventListener('click', () => showWall(false));

/* ═════════════════════════════════════════════════════════════════════════════
   VIEWS. Mission Control's tabs are dashboard views now, reached from the rail and kept in
   the URL hash: Overview -> #class, Students -> #students, the drill-downs -> #reports,
   Teacher guides -> #guides. "Assign" is no longer a tab: it is Class overview's "Assign
   several" mode, and assigning to one student or a group (from Students) opens the same
   catalog there, exactly as the Assign tab did. setTab() keeps its old names so the moved
   code below still says what it means.
   ═════════════════════════════════════════════════════════════════════════════ */
const VIEW_OF_TAB = { overview: 'class', assign: 'class', students: 'students', reports: 'reports', guides: 'guides' };
const DEFAULT_TAB = { class: 'overview', students: 'students', reports: 'reports', guides: 'guides' };
let api = null;          // the dashboard's hooks (showView, renderCatalog), set by start()
let navigatingTo = null; // the tab setTab() asked for, while the dashboard switches view
function setTab(tab, { focus = false } = {}) {
    const view = VIEW_OF_TAB[tab] || 'class';
    navigatingTo = tab;
    if (location.hash.slice(1) !== view) history.replaceState(null, '', `#${view}`);
    if (api) api.showView(view, { focus });
    else renderView(view);
    navigatingTo = null;
}
// The dashboard calls this each time it shows a view. A rail click lands on the view's
// default (Class overview, not a half-finished "Assign several"; the Reports list, not the
// last drill-down); setTab() lands where it asked.
function renderView(view) {
    if (view === 'home') { renderHomeClass(); return; }
    if (!DEFAULT_TAB[view]) return;
    let tab = navigatingTo && VIEW_OF_TAB[navigatingTo] === view ? navigatingTo : DEFAULT_TAB[view];
    if (!navigatingTo && view === 'reports') state.drillId = null;
    state.tab = tab;
    if (!state.code) return;   // still loading: load() renders when it is done
    renderTab(tab);
    scrollTop();
}
function scrollTop() {
    const main = $('main');
    if (main) main.scrollTop = 0;
    window.scrollTo({ top: 0 });
}

function renderAll() {
    $('cnt-students').textContent = state.allStudents.length || '';
    renderTab(state.tab);
    renderHomeClass();
    if (state.panelUid) renderPanel(state.panelUid);
    if (api) api.renderCatalog();   // the cards' Assign / Assigned ✓
}
function renderTab(tab) {
    const assigning = tab === 'assign';
    $('pane-overview').hidden = assigning;
    $('pane-assign').hidden = !assigning;
    document.querySelector('.t-acts').hidden = assigning;
    if (tab === 'overview') renderOverview();
    else if (assigning) renderAssign();
    else if (tab === 'students') renderStudents();
    else if (tab === 'reports') renderReports();
    else if (tab === 'guides') renderGuides();
}

/* ═════════════════════════════════════════════════════════════════════════════
   OVERVIEW
   ═════════════════════════════════════════════════════════════════════════════ */
function capBanner() {
    if (state.plan.pro || !state.hiddenCount) return '';
    return `<div class="banner"><span><strong>${state.students.length} of ${state.allStudents.length} students.</strong> Students can always join and play. On the free plan you'll see the first ${FREE_STUDENT_LIMIT} here.</span>
        <button class="btn sm" type="button" data-pro="students">See Pro</button></div>`;
}
function classItems() {
    const c = state.classroom || {};
    return [...(c.assignedModules || []), ...(c.assignedGames || []), ...(c.assignedSims || [])];
}
/* Español (2026-11-27): a link to the /espanol/ hub. The stories themselves are tracked and
   assignable from their cards (Español view, Assign several); this card is only the way in. Icon: Lucide "languages", copied from the bundled
   /assets/js/lucide.min.js. Self-contained; the Mission Control redesign replaces it. */
const ESPANOL_CARD = `<a class="es-card" href="/espanol/">
      <span class="ic" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg></span>
      <span class="meta"><b lang="es">Español</b>Spanish stories for your students, free.</span>
      <span class="chev" aria-hidden="true">›</span></a>`;
/* The class at a glance: the four numbers, Assigned work and Could use a check-in. Shown
   on Class overview and, first, on the teacher's Home. */
function renderOverview() {
    $('pane-overview').innerHTML = capBanner() + classSummaryHtml() + ESPANOL_CARD;
}
function renderHomeClass() {
    const el = $('t-home');
    if (!el || !state.code) return;
    el.innerHTML = `<p class="t-lead">Here's your class today, then your own practice.</p>${capBanner()}${classSummaryHtml()}`;
}
// One row of assigned work; tapping it opens that piece of work's report.
function workRow(id, justFor) {
    const students = state.students;
    const it = itemOf(id);
    const who = justFor ? students.filter((s) => allAssignedIds(s.mine).includes(id)) : students;
    const done = who.filter((s) => statusFor(s, id).done).length;
    const np = it.kind === 'story' ? presentedFor(id).length : 0;
    const hint = it.kind === 'story' ? `see where the class split${np ? ` · ${plural(np, 'presented session')}` : ''}` : 'see where they got stuck';
    const pct = who.length ? Math.round(done / who.length * 100) : 0;
    const verb = it.type === 'game' ? 'played' : 'finished';
    return `<button class="wi" type="button" data-drill="${esc(id)}">
        <span class="ic t-${it.type}" aria-hidden="true">${ICONS[shownType(it)] || ICONS.lab}</span>
        <span><b>${esc(it.name)}</b><span class="meta">${TYPE_LABEL[shownType(it)] || 'Lesson'} · ${it.minutes} min${justFor ? ` · just for ${plural(who.length, 'student')}` : ''} · ${hint}</span></span>
        <span class="prog">${done} of ${who.length} ${verb}<span class="bar" aria-hidden="true"><i style="width:${pct}%"></i></span></span>
        <span class="chev" aria-hidden="true">›</span></button>`;
}
function classSummaryHtml() {
    const items = classItems();
    const students = state.students;
    if (!students.length) return setupSteps(items.length > 0);

    const n = students.length;
    const active = students.filter((s) => s.lastSeen && (Date.now() - s.lastSeen) < ACTIVE_WINDOW_DAYS * DAY).length;
    const finishedOne = students.filter((s) => allAssignedIds(s.mine).some((id) => statusFor(s, id).done)).length;
    const weekMs = students.reduce((a, s) => a + s.weekMs, 0);
    const cap = state.plan.pro ? '' : ` <small>of ${FREE_STUDENT_LIMIT}</small>`;
    const stats = `<div class="stats">
        <div class="stat"><div class="k">Students in this class</div><div class="n">${n}${cap}</div>
          ${state.plan.pro ? '<div class="s">Everyone who joined with your code</div>' : `<div class="meter" aria-hidden="true"><i style="width:${Math.min(100, Math.round(n / FREE_STUDENT_LIMIT * 100))}%"></i></div>`}</div>
        <div class="stat"><div class="k">Active this week</div><div class="n">${active} <small>of ${n}</small></div><div class="s">Opened anything in the last 7 days</div></div>
        <div class="stat"><div class="k">Finished at least one</div><div class="n">${finishedOne} <small>of ${n}</small></div><div class="s">Of the work you assigned them</div></div>
        <div class="stat"><div class="k">Time on task this week</div><div class="n">${state.sessionsReadable ? (() => { const [v, u] = fmtMins(weekMs).split(' '); return `${esc(v)} <small>${esc(u)}</small>`; })() : '—'}</div><div class="s">Only while the tab was in use</div></div>
      </div>`;

    // Assigned work: the class set, then anything only some students were given.
    const extraOnly = unionAll().filter((id) => !items.includes(id));
    const work = items.length || extraOnly.length
        ? items.map((id) => workRow(id, false)).join('') + extraOnly.map((id) => workRow(id, true)).join('')
        : '<div class="empty">Nothing is assigned yet. <button class="link" type="button" data-goto="assign">Choose work</button>, or tap Assign on any lesson, game or simulation, and it appears here.</div>';

    const checkRows = attentionList(students, unionModules()).filter((r) => r.severity !== 'all-done');
    const check = checkRows.length
        ? `<div class="check">${checkRows.slice(0, 6).map((r) => `<div class="ck"><span class="dot${r.fact && r.fact.kind === 'never-started' ? ' grey' : ''}" aria-hidden="true"></span>
              <span><b>${esc(r.name)}</b><div class="why">${esc(checkInReason(r))}</div></span>
              <button class="link" type="button" data-open="${esc(r.uid)}">Open</button></div>`).join('')}</div>
           ${checkRows.length > 6 ? `<p class="note"><button class="link" type="button" data-goto="students" data-filter="check">See all ${checkRows.length} on Students</button></p>` : ''}`
        : '<div class="empty">Nobody right now. Everyone is moving at the pace you would expect.</div>';

    return stats + `<div class="cols">
        <div class="box"><div class="boxhead"><div><h2>Assigned work</h2><p class="sub">Tap one to see each step, each choice and who got stuck.</p></div>
          ${state.readOnly ? '' : '<button class="btn ghost sm" type="button" data-goto="assign">Assign more</button>'}</div>
          ${work}
          <p class="note">Counts include only students who joined this class. If a student plays a game at home on a device that never joined, it won't show here.</p></div>
        <div class="box"><h2>Could use a check-in</h2><p class="sub">Most useful first. Not grades — just where to look.</p>${check}</div>
      </div>`;
}

/* REPORTS (2026-11-27, prompt R): one tab per kind of work. Each tab lists that kind's
   assigned items for this class (Español also lists a story the class has played without it
   being assigned); tapping one opens today's drill-down for it, unchanged. The last tab is
   remembered per teacher, on this device. */
const REPORT_TABS = [
    { id: 'lessons', label: 'Lessons', none: 'No lessons assigned yet.', from: 'Lab Packs', href: '#packs' },
    { id: 'challenges', label: 'Challenges', none: 'No Challenges assigned yet.', from: 'Lab Packs', href: '#packs' },
    { id: 'games', label: 'Games', none: 'No games assigned yet.', from: 'Games', href: '#games' },
    { id: 'sims', label: 'Simulations', none: 'No simulations assigned yet.', from: 'Simulations', href: '#sims' },
    { id: 'espanol', label: 'Español', none: 'No Español stories assigned or played yet.', from: 'Español', href: '#espanol' },
];
function reportKindOf(id) {
    const it = itemOf(id);
    if (it.kind === 'story') return 'espanol';
    if (it.type === 'sim') return 'sims';
    if (it.type === 'game') return 'games';
    return it.type === 'challenge' ? 'challenges' : 'lessons';
}
const stories = () => [...state.registryById.values()].filter((m) => m.type === 'story' && !m.retired);
function reportIds() {
    const out = unionAll();
    for (const id of playedStoryIds(stories(), state.students)) if (!out.includes(id)) out.push(id);
    for (const p of state.presented) if (state.registryById.has(p.story) && !out.includes(p.story)) out.push(p.story);
    return out;
}
const presentedFor = (id) => state.presented.filter((p) => p.story === id);
const reportTabKey = () => `mc_reports_tab_${(state.user && state.user.uid) || 'me'}`;
function reportTab() {
    if (state.reportTab) return state.reportTab;
    let saved = null;
    try { saved = localStorage.getItem(reportTabKey()); } catch (e) { /* storage blocked */ }
    state.reportTab = REPORT_TABS.some((t) => t.id === saved) ? saved : 'lessons';
    return state.reportTab;
}
function setReportTab(id, focus) {
    if (!REPORT_TABS.some((t) => t.id === id)) return;
    state.reportTab = id;
    try { localStorage.setItem(reportTabKey(), id); } catch (e) { /* storage blocked */ }
    renderReports();
    if (focus) { const b = $(`rtab-${id}`); if (b) b.focus(); }
}
function renderReports() {
    const pane = $('pane-reports');
    if (state.drillId) { pane.innerHTML = renderDrill(state.drillId); return; }
    const items = classItems();
    const ids = reportIds();
    const cur = reportTab();
    const tab = REPORT_TABS.find((t) => t.id === cur);
    const mine = ids.filter((id) => reportKindOf(id) === cur);
    const assigned = unionAll();
    const tabs = REPORT_TABS.map((t) => {
        const n = ids.filter((id) => reportKindOf(id) === t.id).length;
        const on = t.id === cur;
        return `<button class="rtab" type="button" role="tab" id="rtab-${t.id}" data-rtab="${t.id}" aria-selected="${on}" aria-controls="rpanel" tabindex="${on ? 0 : -1}"${t.id === 'espanol' ? ' lang="es"' : ''}>${t.label}<span class="n" lang="en">${n}<span class="sr"> to report</span></span></button>`;
    }).join('');
    const body = mine.length
        ? `<div class="box"><h2${cur === 'espanol' ? ' lang="es"' : ''}>${tab.label}</h2><p class="sub">${cur === 'espanol' ? 'Pick a story to see where the class split at each Puerta.' : 'Pick one to see each step, each choice and who got stuck.'}</p>
            ${mine.map((id) => workRow(id, assigned.includes(id) && !items.includes(id))).join('')}
            <p class="note">Counts include only students who joined this class.</p></div>`
        : `<div class="box"><p class="empty">${tab.none} <a class="link" href="${tab.href}">Assign one from ${tab.from}.</a></p></div>`;
    pane.innerHTML = `<div class="rtabs" role="tablist" aria-label="Reports, by kind of work">${tabs}</div>
        <div role="tabpanel" id="rpanel" aria-labelledby="rtab-${cur}" tabindex="0">${body}</div>`;
}
function setupSteps(hasWork) {
    return `<div class="box"><h2>Set up your class in three steps</h2><p class="sub">Most teachers are ready in about five minutes.</p>
      <div class="steps">
        <div class="stp"><div class="num${hasWork ? ' done' : ''}">${hasWork ? '✓' : '1'}</div><h3>Pick what to assign</h3><p>Lessons, a Challenge, a game or a simulation. You can change it any time.</p>
          ${state.readOnly ? '' : `<button class="btn${hasWork ? ' ghost' : ''} sm" type="button" data-goto="assign">${hasWork ? 'Change work' : 'Choose work'}</button>`}</div>
        <div class="stp"><div class="num">2</div><h3>Share your class code</h3><p>Put it on the board. Students go to allgoodacademy.com/join and type it — no accounts.</p>
          <button class="btn ghost sm" type="button" data-wall>Show code on screen</button></div>
        <div class="stp"><div class="num">3</div><h3>Watch progress here</h3><p>Students appear as they join. Tap any assignment to see exactly where the class got stuck.</p></div>
      </div></div>`;
}
const unionModules = () => unionAssigned((state.classroom && state.classroom.assignedModules) || [], state.extrasByUid);
function unionAll() {
    const out = classItems();
    for (const e of Object.values(state.extrasByUid)) for (const id of [...(e.modules || []), ...(e.games || []), ...(e.sims || [])]) if (!out.includes(id)) out.push(id);
    return out;
}

/* ═════════════════════════════════════════════════════════════════════════════
   THE DRILL-DOWN (Ticket 3). Free on every plan.
   ═════════════════════════════════════════════════════════════════════════════ */
const nameLinks = (list) => list.map((x) => `<button class="link" type="button" data-open="${esc(x.uid)}">${esc(x.name)}</button>`).join(', ');
const funnelRow = (label, num, n, cls = '') => {
    const pct = n ? Math.round(num / n * 100) : 0;
    return `<div class="fr ${cls}"><div class="lab">${label}</div><div class="track" aria-hidden="true"><i style="width:${pct}%"></i></div><div class="num">${num} <small>of ${n}</small></div></div>`;
};
const rateRow = (label, rate) => `<div class="rate"><div>${label}</div><div class="split" aria-hidden="true"><i style="width:${rate}%"></i></div><div class="p">${rate}%</div></div>`;
const talk = (sentence) => (sentence ? `<div class="talk"><b>Worth five minutes tomorrow:</b> ${esc(sentence)}</div>` : '');
const eventsNote = () => (state.eventsReadable ? '' : '<p class="note">Showing each student\'s saved answers. Prediction detail for simulations appears once the teacher read grant for activity events is live.</p>');

function renderDrill(id) {
    const it = itemOf(id);
    // A story the class played without it being assigned reports on everyone.
    const isClass = classItems().includes(id) || !unionAll().includes(id);
    const who = isClass ? state.students : state.students.filter((s) => allAssignedIds(s.mine).includes(id));
    const backTo = REPORT_TABS.find((t) => t.id === reportKindOf(id));
    const head = `<button class="back" type="button" data-back>‹ All ${backTo ? backTo.label : 'assigned work'}</button>
      <div class="dhead"><span class="ic t-${it.type}" aria-hidden="true">${ICONS[shownType(it)] || ICONS.lab}</span>
        <div><div class="eyebrow">${TYPE_LABEL[shownType(it)] || 'Lesson'}</div><h2${it.kind === 'story' ? ' lang="es"' : ''}>${esc(it.name)}</h2></div>
        ${state.readOnly ? '' : '<button class="btn ghost sm" type="button" data-goto="students">Assign to someone else too</button>'}</div>`;
    let body = '';
    const n = who.length;
    if (!n) body = '<div class="box"><p class="empty">Nobody in this class has this yet.</p></div>';
    else if (it.kind === 'story') body = drillStoryHtml(it, who);
    else if (it.type === 'sim') body = drillSimHtml(it, who);
    else if (it.type === 'game') body = drillGameHtml(it, who);
    else if (MODULE_DATA[id] && it.type === 'challenge') body = drillChallengeHtml(MODULE_DATA[id], who);
    else if (MODULE_DATA[id]) body = drillLessonHtml(MODULE_DATA[id], who);
    else {
        const done = who.filter((s) => statusFor(s, id).done).length;
        const started = who.filter((s) => statusFor(s, id).started).length;
        body = `<div class="box"><h3>How far the class got</h3><p class="sub">Step-by-step detail for this one isn't available yet. Finished and started still are.</p>
          <div class="fun">${funnelRow('Started', started, n)}${funnelRow('Finished', done, n)}</div></div>`;
    }
    return head + body;
}

function drillLessonHtml(meta, who) {
    const d = drillLesson(meta, who);
    const steps = d.steps.map((st) => funnelRow(`<span>${st.index + 1}</span>${esc(st.title)}`, st.reached, d.n)
        + (st.stopped.length ? `<div class="stuck names">Stopped here: ${nameLinks(st.stopped)}</div>` : '')).join('');
    const ns = d.notStarted.length ? `<p class="note names">Not started yet: ${nameLinks(d.notStarted)}</p>` : '';
    const checks = d.checks.length
        ? d.checks.map((c) => rateRow(`<b>${esc(c.title)}</b> — ${esc(c.label)} <span class="muted">(${c.attempted} answered)</span>`, c.rate)).join('')
        : '<p class="empty">No answers recorded yet.</p>';
    return `<div class="box"><h3>How far the class got</h3><p class="sub">Furthest step each student reached. ${d.finished} of ${d.n} finished.</p><div class="fun">${steps}</div>${ns}</div>
      <div class="box"><h3>How they did on each check</h3><p class="sub">Share of students who reached the step and got it on the first try.</p>${checks}
      ${talk(worthFiveMinutes(d))}${eventsNote()}</div>`;
}

function drillChallengeHtml(meta, who) {
    const d = drillChallenge(meta, who);
    const groups = d.groups.map((g) => funnelRow(`Scenarios ${g.start}–${g.end}`, g.through, d.n, 'f-ch')).join('');
    const split = d.hardest.length ? d.hardest.map((x) => `<div class="scn">
        <div class="eyebrow" style="color:var(--faint)">Scenario ${x.number}</div>
        <p class="q">${esc(x.title)}</p>
        ${x.options.map((o) => `<div class="ch"><div class="t${o.tag === 'BEST' ? ' best' : ''}">${tagHtml(o.tag)}${esc(o.text)}</div>
            <div class="split" aria-hidden="true"><i style="width:${o.share}%;background:${o.tag === 'BEST' ? 'var(--sage)' : (o.tag === 'OK' ? 'var(--gold)' : 'var(--orange)')}"></i></div><div class="p">${o.share}%</div></div>`).join('')}
        ${x.riskyNames.length ? `<p class="note names" style="margin-top:6px">Picked the risky answer: ${nameLinks(x.riskyNames)}</p>` : ''}</div>`).join('')
        : `<p class="empty">${d.answeredAny ? 'Nobody picked a risky answer yet.' : 'No answers recorded yet.'}</p>`;
    return `<div class="box"><h3>How far the class got</h3><p class="sub">${meta.stepsTotal} scenarios, in groups of seven. ${d.finished} of ${d.n} finished.</p><div class="fun">${groups}</div></div>
      <div class="box"><h3>Where the class split</h3><p class="sub">The scenarios where the most students picked the risky answer, hardest first. These are judgment calls, not grades.</p>${split}
      ${talk(worthFiveMinutes(d))}${eventsNote()}</div>`;
}

function lessonForGame(it) {
    const dest = [...state.registryById.values()].find((m) => m.type === 'lab' && m.url && m.url === it.defaultDestination);
    return dest || null;
}
function drillGameHtml(it, who) {
    const d = drillGame(it.id, who);
    const lesson = lessonForGame(it);
    const rows = d.buckets.map((b) => funnelRow(esc(b.label), b.n, d.played, 'f-gm')).join('');
    const low = d.low.length
        ? `<div class="talk"><b>Scored under 50%:</b> <span class="names">${nameLinks(d.low)}</span>.${lesson ? ` The game already pointed them to ${esc(lesson.name)}.` : ''}
            ${lesson && !state.readOnly ? ` <button class="link" type="button" data-assign-lesson="${esc(lesson.id)}" data-uids="${esc(d.low.map((x) => x.uid).join(','))}">Assign ${esc(lesson.name)} to ${d.low.length === 1 ? 'them' : `these ${d.low.length}`}</button>` : ''}</div>`
        : '';
    return `<div class="box"><h3>Best scores</h3><p class="sub">${d.played} of ${d.n} students played${d.avg != null ? ` · class average ${d.avg}%` : ''}.</p>
      ${d.played ? `<div class="fun">${rows}</div>` : '<p class="empty">Nobody in this class has played it yet from a device that joined.</p>'}
      ${low}${d.low.length ? '' : talk(worthFiveMinutes(d, { name: it.name, lessonName: lesson && lesson.name }))}</div>`;
}

function drillSimHtml(it, who) {
    const d = drillSim(it, who);
    const steps = d.steps.map((x) => funnelRow(`Step ${x.step}`, x.reached, d.n, 'f-sm')).join('');
    const present = !d.eventsKnown ? ''
        : (d.presentSessions ? ` Present mode was used in ${plural(d.presentSessions, 'session')}.` : ' Present mode has not been used by this class yet.');
    const preds = d.predictions.length
        ? d.predictions.map((p) => rateRow(`<b>Step ${p.step}</b> — guess matched what the model then showed <span class="muted">(${p.revealed} answered)</span>`, p.rate)).join('')
        : `<p class="empty">${d.eventsKnown ? 'No predictions recorded yet.' : 'Prediction detail appears once the teacher read grant for activity events is live.'}</p>`;
    return `<div class="box"><h3>How far they got</h3><p class="sub">${d.played} of ${d.n} opened it, ${d.finished} reached the last step.${present}</p><div class="fun">${steps}</div></div>
      <div class="box"><h3>Predictions</h3><p class="sub">Each step asks for a guess before the model shows what happens.</p>${preds}
      ${talk(worthFiveMinutes(d))}</div>`;
}

/* ESPAÑOL STORIES (2026-11-27): where the class split at each Puerta, with the real Spanish.
   The numbers come from espanol-report.js; the prompts, options and right answers from the
   story's own report.json, fetched once per story. First tries are practice: the words here
   are "picked" and "right answer", never a score or a grade. */
function storyCfg(it) {
    const hit = state.storyCfg[it.id];
    if (hit !== undefined) return hit;      // the config, or null when it could not load
    state.storyCfg[it.id] = false;          // loading
    fetch(`${it.url}report.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((cfg) => {
        state.storyCfg[it.id] = cfg && Array.isArray(cfg.puertas) ? cfg : null;
        if (state.tab === 'reports' && state.drillId === it.id) renderReports();
        if (state.panelUid) renderPanel(state.panelUid);
    });
    return false;
}
const countOrShare = (count, n, showPercent) => (showPercent ? `${count} <small>(${n ? Math.round(count / n * 100) : 0}%)</small>` : `${count} <small>of ${n}</small>`);
function blankHtml(b, showPercent) {
    const rows = b.options.map((o) => `<div class="eo${o.right ? ' ok' : ''}">
          <div class="t" lang="es">${esc(o.text)}${o.right ? ' <span class="mk b" lang="en">✓ Right answer</span>' : ''}</div>
          <div class="split" aria-hidden="true"><i style="width:${o.share}%"></i></div>
          <div class="p">${countOrShare(o.count, b.n, showPercent)}</div></div>`).join('');
    return `<div class="eblank">${b.sentence ? `<p class="q" lang="es">${esc(b.sentence)}</p>` : ''}${rows}</div>`;
}
/* EMBARQUE → ADUANA (flag on only): the class's growth by skill, and the postcard rubric. */
function storyChecks(it) {
    if (!CHECKS_ON) return null;
    const hit = state.storyChecks[it.id];
    if (hit !== undefined) return hit;
    state.storyChecks[it.id] = false;
    fetch(`${it.url}checks.json`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((cfg) => {
        state.storyChecks[it.id] = cfg && Array.isArray(cfg.slots) ? cfg : null;
        if (state.tab === 'reports' && state.drillId === it.id) renderReports();
        if (state.panelUid) renderPanel(state.panelUid);
    });
    return false;
}
const growthBar = (label, count, n, pct, showPercent, cls) => `<div class="gr ${cls}"><span class="gl">${label}</span>
    <span class="split" aria-hidden="true"><i style="width:${pct}%"></i></span>
    <span class="p">${showPercent ? `${pct}%` : `${count} <small>of ${n}</small>`}</span></div>`;
// A presented session's class vote on a check, in words (a quick vote has no numbers).
const CHECK_WORDS = { right: 'the class picked the right answer', other: 'the class picked another answer', split: 'the class was split' };
const checkLine = (label, v) => (v ? `<p class="note" style="margin:2px 0">${label}: ${CHECK_WORDS[v]}</p>` : '');
function growthHtml(it, who) {
    const checks = storyChecks(it);
    if (!checks) return '';
    const g = growthReport(checks, it.id, who);
    if (!g.boarded) return '';
    const body = g.n
        ? g.slots.map((sl) => `<div class="eblank"><p class="q">${esc(sl.skill)} <span class="muted" style="font-weight:400">· ${esc(sl.puerta)}</span></p>
            ${growthBar('Embarque (before)', sl.emb, g.n, sl.embPct, g.showPercent, 'before')}${growthBar('Aduana (after)', sl.adu, g.n, sl.aduPct, g.showPercent, 'after')}</div>`).join('')
        : '<p class="empty">Nobody has reached the Aduana yet. This fills in as students finish the story.</p>';
    return `<div class="box epu"><h3>Embarque → Aduana: before and after</h3>
        <p class="sub">${g.n} of ${who.length} students did both checks. Each skill shows how many got it on the first try before the story and after it.</p>
        ${g.worth ? `<div class="talk"><b>Worth five minutes tomorrow:</b> ${esc(g.worth)}</div>` : ''}
        ${body}${transferHtml(g.transfer)}
        <p class="note">${checks.slots.length} questions is a practice check, not a test of any one student.</p></div>`;
}
/* La Habana's transfer (two sentences after the Aduana): how many picked the right verb. */
function transferHtml(t) {
    if (!t || !t.n) return '';
    return `<div class="eblank"><p class="q">${esc(t.label)} <span class="muted" style="font-weight:400">· ${t.n} did it</span></p>
        ${t.items.map((it) => growthBar(`<span lang="es">${esc(it.q)}</span>`, it.right, t.n, it.pct, t.showPercent, 'after')).join('')}</div>`;
}
/* The postcard rubric, in a student's panel: four rows, three levels. The postcard itself is
   on paper or in Google Classroom; only these taps are saved, by the teacher, to their class. */
const RUBRIC_LEVELS = ['Todavía no', 'Casi', '¡Listo!'];
function rubricHtml(it, s) {
    const checks = storyChecks(it);
    if (!checks || !Array.isArray(checks.rubric)) return '';
    const saved = state.rubrics[`${s.uid}_${it.id}`];
    const levels = (saved && saved.levels) || {};
    const rows = checks.rubric.map((r, ri) => `<div class="rub" role="group" aria-label="${esc(r.title)}">
        <div><b>${esc(r.title)}</b><div class="meta">${esc(r.detail)}</div></div>
        <div class="rubl">${RUBRIC_LEVELS.map((l, li) => `<button class="rubb" type="button" data-rubric="${esc(it.id)}" data-uid="${esc(s.uid)}" data-row="${ri}" data-level="${li}" aria-pressed="${levels[ri] === li}"${state.readOnly ? ' disabled' : ''} lang="es">${l}</button>`).join('')}</div></div>`).join('');
    return `<div class="sec" style="margin-top:12px">Postcard rubric</div>
        <p class="pick">The postcard is written on paper or in Google Classroom. Tap what you saw; only your taps are saved.</p>${rows}`;
}
async function saveRubric(btn) {
    if (state.readOnly) return;
    const { rubric: story, uid } = btn.dataset;
    const row = Number(btn.dataset.row), level = Number(btn.dataset.level);
    const id = `${uid}_${story}`;
    const prev = state.rubrics[id];
    const levels = { ...((prev && prev.levels) || {}) };
    if (levels[row] === level) delete levels[row]; else levels[row] = level;   // tap again to clear
    state.rubrics[id] = { uid, story, classroomCode: state.code, teacherUid: state.user.uid, levels };
    renderPanel(uid);
    const again = document.querySelector(`#drawer [data-rubric="${CSS.escape(story)}"][data-row="${row}"][data-level="${level}"]`);
    if (again) again.focus();
    try {
        await setDoc(doc(db, 'artifacts', appId, 'classrooms', state.code, 'rubric_scores', id), { ...state.rubrics[id], updatedAt: serverTimestamp() });
    } catch (e) {
        console.warn('[Mission Control] rubric tap did not save', e && e.code);
        if (prev) state.rubrics[id] = prev; else delete state.rubrics[id];
        renderPanel(uid);
        toast('That did not save. Please try again.', true);
    }
}

/* Presented sessions (Presentar en clase), kept apart from solo play: these are the class's
   votes by show of hands, saved by the teacher from the projector. Exact hand counts show
   bars and the counts. A quick vote ("nearly everyone", "split") shows words only, never a
   percentage: nobody counted (AA-17). Older sessions are read through presentedVote. */
function presentedHtml(it, cfg) {
    const list = presentedFor(it.id);
    if (!list.length) return '';
    const sessions = list.map((p) => {
        const puertas = (cfg.puertas || []).map((pc) => {
            const saved = p.puertas && p.puertas[pc.n];
            if (!saved || !Array.isArray(saved.rows)) return '';
            const rows = pc.blanks.map((b, bi) => {
                const r = saved.rows[bi];
                const vote = presentedVote(r);
                if (!vote) return '';
                const mark = (o, pick) => `${b.right.includes(o.k) ? ' <span class="mk b" lang="en">✓ Right answer</span>' : ''}${pick === o.k ? ' <span class="mk o" lang="en">Class pick</span>' : ''}`;
                let opts;
                if (vote.mode === 'quick') {
                    const split = vote.quick === 'split';
                    const pick = split ? null : vote.quick;
                    opts = `<p class="note" style="margin:2px 0">Quick vote: ${split ? 'the class was split' : 'nearly everyone picked one answer'}. Not a count.</p>`
                        + b.options.filter((o) => o.k === pick || b.right.includes(o.k))
                            .map((o) => `<div class="eo q${b.right.includes(o.k) ? ' ok' : ''}"><div class="t" lang="es">${esc(o.text || o.k)}${mark(o, pick)}</div></div>`).join('');
                } else {
                    opts = b.options.map((o) => {
                        const c = vote.counts[o.k] || 0;
                        const pct = vote.total ? Math.round((c / vote.total) * 100) : 0;
                        return `<div class="eo${b.right.includes(o.k) ? ' ok' : ''}"><div class="t" lang="es">${esc(o.text || o.k)}${mark(o, r.pick)}</div>
                          <div class="split" aria-hidden="true"><i style="width:${pct}%"></i></div>
                          <div class="p">${c} <small>of ${vote.total}</small></div></div>`;
                    }).join('');
                }
                return `<div class="eblank">${b.sentence ? `<p class="q" lang="es">${esc(b.sentence)}</p>` : ''}${opts}</div>`;
            }).join('');
            return `<div class="epres"><div class="eyebrow">Puerta ${pc.n} · ${esc(pc.label)}</div>${rows}</div>`;
        }).join('');
        const forks = (cfg.forks || []).map((f) => { const o = f.options.find((x) => x.k === (p.forks || {})[f.key]); return o ? `<span lang="es">${esc(f.label)}: ${esc(o.text)}</span>` : ''; }).filter(Boolean).join(' · ');
        const pg = CHECKS_ON && p.checks ? presentedGrowth(storyChecks(it) || null, p.checks) : null;
        const growth = pg && pg.length ? `<div class="epres"><div class="eyebrow">Embarque → Aduana · class votes</div>${pg.map((sl) => `<div class="eblank"><p class="q">${esc(sl.skill)}</p>
            ${checkLine('Embarque (before)', sl.emb)}${checkLine('Aduana (after)', sl.adu)}</div>`).join('')}<p class="note" style="margin-top:4px">Quick votes by show of hands, not a count.</p></div>` : '';
        return `<details class="as"${list.length === 1 ? ' open' : ''}><summary><span><b style="font-size:13.5px">Presented ${esc(fmtDate(toMillis(p.createdAt)))}</b><div class="meta">The class voted by show of hands${forks ? ` · path: ${forks}` : ''}</div></span></summary>
            <div class="body">${puertas || '<p class="empty">No votes were saved in this session.</p>'}${growth}</div></details>`;
    }).join('');
    return `<div class="box epu"><h3>${plural(list.length, 'presented session')}</h3>
        <p class="sub">Played together on the projector with Presentar en clase. These are class votes, kept apart from what students did on their own. No student is named or counted.</p>${sessions}</div>`;
}
function drillStoryHtml(it, who) {
    const cfg = storyCfg(it);
    if (cfg === false) return '<div class="box"><p class="empty">Loading this story\'s report…</p></div>';
    if (!cfg) return '<div class="box"><p class="empty">This story\'s report could not load. Reload the page to try again.</p></div>';
    const d = storyReport(it, cfg, who);
    const head = `<div class="box"><h3><span lang="es">${esc(it.name)}</span> · ${d.finished} of ${d.n} finished${presentedFor(it.id).length ? ` · ${plural(presentedFor(it.id).length, 'presented session')}` : ''}</h3>
        <p class="sub">${d.played} of ${d.n} opened it. What you see below is each student's first try at each Puerta. First tries are practice.</p>
        ${d.worth ? `<div class="talk"><b>Worth five minutes tomorrow:</b> <span lang="es">${esc(d.worth.text)}</span></div>` : ''}
        ${d.forks.map((f) => `<p class="efork"><b>Paths picked <span class="muted">(<span lang="es">${esc(f.label)}</span>, no right answer here)</span>:</b> <span lang="es">${f.options.map((o) => `${esc(o.text)} ${o.count}`).join(' · ')}</span></p>`).join('')}
        ${eventsNote()}</div>`;
    const shown = growthHtml(it, who) + presentedHtml(it, cfg);
    if (!d.played) return `${head}<div class="box"><p class="empty">Nobody in this class has opened it on their own yet from a device that joined.</p></div>${shown}`;
    const cards = d.puertas.map((p) => `<div class="box epu"><div class="eyebrow">Puerta ${p.n} · ${esc(p.label)}</div>
        <p class="eprompt" lang="es">${esc(p.prompt)}</p>${p.ask ? `<p class="sub" lang="es">${esc(p.ask)}</p>` : ''}
        ${p.answered
            ? `<p class="sub">${p.right} of ${p.answered} got it on the first try${p.showPercent ? ` (${p.rate}%)` : ''}.${p.blanks.length > 1 ? ' Each blank is shown on its own.' : ''}</p>${p.blanks.map((b) => blankHtml(b, p.showPercent)).join('')}`
            : '<p class="empty">Nobody has reached this Puerta yet.</p>'}</div>`).join('');
    return head + cards + shown;
}

/* One tap from a game's drill-down: give the lesson the game points to to the students who
   scored low, as per-student extras (classroom_assignments, one doc each). */
async function assignLessonTo(lessonId, uids) {
    try {
        await Promise.all(uids.map((uid) => {
            const cur = state.extrasByUid[uid] || { modules: [], games: [], sims: [] };
            const modules = cur.modules.includes(lessonId) ? cur.modules : [...cur.modules, lessonId];
            return writeExtras(uid, { modules, games: cur.games || [], sims: cur.sims || [] });
        }));
        rebuildAll();
        renderAll();
        toast(`${itemOf(lessonId).name} assigned to ${plural(uids.length, 'student')}.`);
    } catch (e) {
        console.warn('[Mission Control] assigning the lesson failed', e);
        toast('That did not save. Please try again.', true);
    }
}

/* ═════════════════════════════════════════════════════════════════════════════
   STUDENTS
   ═════════════════════════════════════════════════════════════════════════════ */
function checkSet() {
    return new Set(attentionList(state.students, unionModules()).filter((r) => r.severity !== 'all-done').map((r) => r.uid));
}
function studentRows() {
    const needs = checkSet();
    let list = state.students;
    if (state.search) { const q = state.search.toLowerCase(); list = list.filter((s) => s.name.toLowerCase().includes(q)); }
    if (state.filter === 'check') list = list.filter((s) => needs.has(s.uid));
    if (state.filter === 'done') list = list.filter((s) => { const ids = allAssignedIds(s.mine); return ids.length && ids.every((id) => statusFor(s, id).done); });
    return { list, needs };
}
function renderStudents() {
    const pane = $('pane-students');
    const prevFocus = document.activeElement && document.activeElement.id === 'stu-search';
    if (!state.allStudents.length) {
        pane.innerHTML = '<div class="box"><p class="empty">Nobody has joined yet. Students go to allgoodacademy.com/join and type your class code.</p></div>';
        return;
    }
    const { list, needs } = studentRows();
    const chip = (f, label) => `<button class="chip" type="button" data-filter-chip="${f}" aria-pressed="${state.filter === f}">${label}</button>`;
    const rows = list.map((s) => {
        const ids = allAssignedIds(s.mine);
        const done = ids.filter((id) => statusFor(s, id).done).length;
        const extras = s.mine.extraModules.length + s.mine.extraGames.length + s.mine.extraSims.length;
        const allDone = ids.length && done === ids.length;
        const tag = allDone ? '<span class="tag ok">All done</span>' : (needs.has(s.uid) ? '<span class="tag chk">Check in</span>' : '');
        const sel = state.selected.has(s.uid);
        return `<tr class="r${sel ? ' sel' : ''}" data-row="${esc(s.uid)}">
          <td class="cb"><input type="checkbox" data-tick="${esc(s.uid)}" aria-label="Select ${esc(s.name)}"${sel ? ' checked' : ''}></td>
          <td><button class="nm" type="button" data-open="${esc(s.uid)}"><span class="av" style="background:${s.color}" aria-hidden="true">${esc(s.initials.slice(0, 1))}</span>${esc(s.name)}</button></td>
          <td><div class="mini"><span class="bar" aria-hidden="true"><i style="width:${ids.length ? Math.round(done / ids.length * 100) : 0}%"></i></span><span class="meta">${done} of ${ids.length}</span>${extras ? `<span class="tag extra">+${extras} just for them</span>` : ''}</div></td>
          <td class="hm">${esc(s.lastSeen ? relativeTime(s.lastSeen) : 'Never')}</td>
          <td class="hm">${state.sessionsReadable ? esc(fmtMins(s.weekMs)) : '—'}</td>
          <td>${tag}</td></tr>`;
    }).join('');
    const over = state.hiddenCount && !state.plan.pro
        ? `<tr class="over"><td colspan="6">+${plural(state.hiddenCount, 'more student')} joined. Students can always join and play. On the free plan you'll see the first ${FREE_STUDENT_LIMIT} here. <button class="link" type="button" data-pro="students">See Pro</button></td></tr>`
        : '';
    const allTicked = list.length && list.every((s) => state.selected.has(s.uid));
    pane.innerHTML = `<div class="toolbar">
        <input class="search" id="stu-search" type="search" placeholder="Find a student" aria-label="Find a student" value="${esc(state.search)}">
        <div class="chips" role="group" aria-label="Show">${chip('all', 'Everyone')}${chip('check', 'Could use a check-in')}${chip('done', 'All done')}</div>
        <div class="exports"><button class="btn ghost sm" type="button" id="btn-export-csv">Export CSV</button>
          <button class="btn ghost sm" type="button" id="btn-export-choices">Choice-level CSV${state.plan.pro ? '' : ' · Pro'}</button></div>
      </div>
      <div class="tablewrap"><table>
        <thead><tr><th class="cb"><input type="checkbox" id="tick-all" aria-label="Select everyone shown"${allTicked ? ' checked' : ''}></th><th>Student</th><th>Assigned work</th><th class="hm">Last active</th><th class="hm">Time this week</th><th><span class="sr">Status</span></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">Nobody matches that.</td></tr>'}${over}</tbody>
      </table></div>
      ${state.selected.size ? `<div class="bulk" role="region" aria-label="Selected students"><span><strong>${state.selected.size}</strong> selected</span>
        <button class="btn ghost sm go" type="button" id="btn-clear-sel">Clear</button>
        ${state.readOnly ? '' : `<button class="btn sm" type="button" id="btn-assign-sel">Assign to ${state.selected.size === 1 ? 'this student' : `these ${state.selected.size}`}</button>`}</div>` : ''}`;
    if (prevFocus) { const el = $('stu-search'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
}
$('pane-students').addEventListener('input', (e) => {
    if (e.target.id === 'stu-search') { state.search = e.target.value; renderStudents(); }
});
$('pane-students').addEventListener('change', (e) => {
    const t = e.target.closest('[data-tick]');
    if (t) { if (t.checked) state.selected.add(t.dataset.tick); else state.selected.delete(t.dataset.tick); renderStudents(); return; }
    if (e.target.id === 'tick-all') {
        const { list } = studentRows();
        for (const s of list) { if (e.target.checked) state.selected.add(s.uid); else state.selected.delete(s.uid); }
        renderStudents();
    }
});
$('pane-students').addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter-chip]');
    if (f) { state.filter = f.dataset.filterChip; renderStudents(); return; }
    if (e.target.closest('#btn-clear-sel')) { state.selected.clear(); renderStudents(); return; }
    if (e.target.closest('#btn-assign-sel')) { openAssignFor([...state.selected]); return; }
    if (e.target.closest('#btn-export-csv')) { exportRosterCsv(); return; }
    if (e.target.closest('#btn-export-choices')) { if (!state.plan.pro) openPro('csv'); else exportChoiceCsv(); return; }
    const row = e.target.closest('tr.r');
    if (row && !e.target.closest('input, button')) openPanel(row.dataset.row);
});

/* ═════════════════════════════════════════════════════════════════════════════
   THE STUDENT PANEL
   ═════════════════════════════════════════════════════════════════════════════ */
function openPanel(uid) {
    state.panelUid = uid;
    lastFocus = document.activeElement;
    renderPanel(uid);
    $('scrim').hidden = false;
    const d = $('drawer');
    d.classList.add('on');
    d.setAttribute('aria-hidden', 'false');
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-modal', 'true');
    const x = d.querySelector('.x'); if (x) x.focus();
}
function closePanel() {
    state.panelUid = null;
    $('scrim').hidden = true;
    const d = $('drawer');
    d.classList.remove('on');
    d.setAttribute('aria-hidden', 'true');
    d.removeAttribute('role');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
}
$('scrim').addEventListener('click', closePanel);

function moduleNameFor(session) {
    const id = session.module;
    if (state.registryById.has(id)) return state.registryById.get(id).name;
    const md = Object.values(MODULE_DATA).find((m) => m.slug === id);
    if (md) return md.name;
    const byGame = [...state.registryById.values()].find((m) => (m.gameNames || []).includes(session.gameName));
    return (byGame && byGame.name) || session.gameName || id || 'Activity';
}

function panelItemBody(s, id) {
    const it = itemOf(id);
    if (it.kind === 'story') {
        const cfg = storyCfg(it);
        if (cfg === false) return '<div class="pick">Loading…</div>';
        const d = studentStory(it, cfg || { puertas: [], forks: [] }, s);
        const top = `<div class="pick">${d.finished ? 'Finished' : (d.opened ? 'Not finished yet' : 'Not started')}${d.lastActive ? ` · last active ${esc(relativeTime(d.lastActive))}` : ''}</div>`;
        const rows = d.puertas.map((p) => `<div class="stepl"><span class="s${p.answered ? (p.right ? ' d' : ' h') : ''}">${p.n}</span>
            <div>Puerta ${p.n} <span class="meta">· ${esc(p.label)}</span></div>
            <span class="meta">${p.answered ? (p.right ? '✓ Right on the first try' : 'Not yet') : 'Not reached'}</span></div>`).join('');
        const path = d.forks.filter((f) => f.text).map((f) => `<span lang="es">${esc(f.label)}: ${esc(f.text)}</span>`).join(' · ');
        return `${top}${rows}${path ? `<div class="pick">Path: ${path}</div>` : ''}${rubricHtml(it, s)}`;
    }
    if (it.type === 'sim') {
        const p = simProgress(s, it);
        const reveals = Array.isArray(s.events) ? s.events.filter((e) => e.event === `${it.eventPrefix}_reveal` && e.meta) : [];
        const matched = reveals.filter((e) => e.meta.matched).length;
        return `<div class="stepl"><span class="s${p.completed ? ' d' : ''}">${p.maxStep}</span><div>Reached step ${p.maxStep} of ${it.stepsTotal}</div><span class="meta">${fmtMins(p.activeMs)}</span></div>
          ${reveals.length ? `<div class="pick">Predictions matched the model ${matched} of ${reveals.length} times.</div>` : ''}`;
    }
    if (it.type === 'game') {
        const g = (s.games || []).find((x) => x.id === id);
        if (!g) return '<div class="pick">No play recorded yet from a device that joined this class.</div>';
        return `<div class="pick">${plural(g.plays, 'play')} · best ${g.bestPct != null ? `${g.bestPct}%` : '—'} · last played ${esc(relativeTime(g.lastPlayed))}</div>
          ${g.weakestCategory ? `<div class="pick">Weakest: ${esc(String(g.weakestCategory.name).replace(/[-_]/g, ' '))} (${g.weakestCategory.correct} of ${g.weakestCategory.played})</div>` : ''}`;
    }
    const meta = MODULE_DATA[id];
    const m = s.modules[id];
    if (!meta || !m) return `<div class="pick">${esc(statusFor(s, id).label)}. Step-by-step detail for this one isn't available yet.</div>`;
    const choices = choicesFor(s, meta);
    const timing = state.sessionsReadable ? perStepTiming(m) : {};
    return meta.steps.map((st, i) => {
        const at = choices.filter((c) => c.step === i);
        const reached = i < m.maxStep;
        const last = at[at.length - 1];
        const text = last && last.choiceIndex != null && st.choices && st.choices[last.choiceIndex] ? st.choices[last.choiceIndex].text : '';
        const tag = choiceTag(last ? last.score : null);
        const cur = !m.completed && i === m.maxStep - 1;
        const t = timing[i];
        return `<div class="stepl"><span class="s${reached ? (cur ? ' h' : ' d') : ''}">${i + 1}</span>
          <div>${esc(meta.kind === 'challenge' ? `Scenario ${i + 1}` : st.title)}${cur ? ' <span class="meta">· where they are</span>' : ''}
            ${text ? `<div class="pick">${tagHtml(tag)}${esc(text)}${at.length > 1 ? ` · ${at.length} tries` : ''}</div>` : ''}</div>
          <span class="meta">${typeof t === 'number' ? `${Math.max(1, Math.round(t / 60000))} min` : ''}</span></div>`;
    }).join('');
}

function renderPanel(uid) {
    const s = state.allStudents.find((x) => x.uid === uid);
    const d = $('drawer');
    if (!s) { d.innerHTML = '<button class="x" type="button" data-close-panel aria-label="Close">×</button><p class="empty">That student is no longer in this class.</p>'; return; }
    const ids = allAssignedIds(s.mine);
    for (const id of playedStoryIds(stories(), [s])) if (!ids.includes(id)) ids.push(id);
    const extraSet = new Set([...s.mine.extraModules, ...s.mine.extraGames, ...s.mine.extraSims]);
    const items = ids.map((id) => {
        const it = itemOf(id);
        const st = statusFor(s, id);
        const pill = st.done ? '<span class="tag ok">Finished</span>' : (st.started ? '<span class="tag new">In progress</span>' : '<span class="tag grey">Not started</span>');
        return `<details class="as"><summary><span class="ic t-${it.type}" aria-hidden="true">${ICONS[shownType(it)] || ICONS.lab}</span>
            <span><b style="font-size:13.5px">${esc(it.name)}</b><div class="meta">${TYPE_LABEL[shownType(it)] || 'Lesson'}${extraSet.has(id) ? ' · just for them' : ''}</div></span>${pill}</summary>
            <div class="body">${panelItemBody(s, id)}</div></details>`;
    }).join('');
    const sessions = (s.raw.sessions || []).slice()
        .sort((a, b) => (toMillis(b.lastSeenAt) || toMillis(b.startedAt)) - (toMillis(a.lastSeenAt) || toMillis(a.startedAt)))
        .slice(0, 8)
        .map((x) => `<div class="sess"><span class="meta">${esc(fmtDate(toMillis(x.lastSeenAt) || toMillis(x.startedAt)))}</span><span>${esc(moduleNameFor(x))}</span><span class="meta">${esc(fmtMins(x.activeMs))} · ${esc(x.device || 'device unknown')}</span></div>`)
        .join('');
    const first = s.name.split(' ')[0];
    d.innerHTML = `<button class="x" type="button" data-close-panel aria-label="Close">×</button>
      <div class="eyebrow">Student</div><h2>${esc(s.name)}</h2>
      <p class="meta" style="margin:6px 0 0">Last active: ${esc(s.lastSeen ? relativeTime(s.lastSeen) : 'never')}${state.sessionsReadable ? ` · ${esc(fmtMins(s.weekMs))} this week` : ''}</p>
      <div class="sec">Assigned work · tap to open</div>
      ${items || '<p class="empty">Nothing assigned yet.</p>'}
      ${state.readOnly ? '' : `<button class="btn ghost sm" type="button" data-assign-for="${esc(s.uid)}" style="margin-top:6px">Assign something just for ${esc(first)}</button>`}
      <div class="sec">Recent sessions</div>
      ${sessions || `<p class="empty">${state.sessionsReadable ? 'No sessions yet.' : 'Session times are not available right now.'}</p>`}
      <p class="note">Time counts only while the tab is in use. Students choose their own nickname. Nothing here is a grade.</p>`;
}
$('drawer').addEventListener('click', (e) => {
    if (e.target.closest('[data-close-panel]')) { closePanel(); return; }
    const rb = e.target.closest('[data-rubric]');
    if (rb && !rb.disabled) { saveRubric(rb); return; }
    const a = e.target.closest('[data-assign-for]');
    if (a) { const uid = a.dataset.assignFor; closePanel(); openAssignFor([uid]); }
});

/* ═════════════════════════════════════════════════════════════════════════════
   ASSIGN
   Whole class: classrooms/{code}.assignedModules / assignedGames / assignedSims.
   One student or a group: classroom_assignments/{code}_{uid}, one doc per student, holding
   only the EXTRAS on top of the class set (additive — never a replacement; see
   docs/mission-control.md). Simulations get their own array beside games, for the same
   reasons games did — see the note above saveAssignments().
   ═════════════════════════════════════════════════════════════════════════════ */
const KINDS = ['modules', 'games', 'sims'];
// An Español story is assigned beside the simulations, in assignedSims (no new class field).
const kindOf = (type) => (type === 'game' ? 'games' : (type === 'sim' || type === 'story' ? 'sims' : 'modules'));
function classSet() {
    const c = state.classroom || {};
    return { modules: new Set(c.assignedModules || []), games: new Set(c.assignedGames || []), sims: new Set(c.assignedSims || []) };
}
function resetDraft() {
    if (state.scope && state.scope.length) {
        // The group's shared extras: an item is ticked when EVERY selected student already
        // has it as an extra. Saving applies only what changed to each student.
        const lists = state.scope.map((uid) => state.extrasByUid[uid] || { modules: [], games: [], sims: [] });
        const inter = (k) => new Set((lists[0][k] || []).filter((id) => lists.every((l) => (l[k] || []).includes(id))));
        state.draftBase = { modules: inter('modules'), games: inter('games'), sims: inter('sims') };
    } else {
        state.draftBase = classSet();
    }
    state.draft = { modules: new Set(state.draftBase.modules), games: new Set(state.draftBase.games), sims: new Set(state.draftBase.sims) };
}
function changeCount() {
    let n = 0;
    for (const k of KINDS) {
        for (const id of state.draft[k]) if (!state.draftBase[k].has(id)) n++;
        for (const id of state.draftBase[k]) if (!state.draft[k].has(id)) n++;
    }
    return n;
}
function openAssignFor(uids) {
    state.scope = uids.slice();
    resetDraft();
    setTab('assign');
}
function scopeNames() {
    const names = state.scope.map((uid) => (state.allStudents.find((s) => s.uid === uid) || {}).name || 'a student');
    return names.length <= 3 ? names.join(', ').replace(/, ([^,]*)$/, ' and $1') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}
function renderAssign() {
    const pane = $('pane-assign');
    if (!state.draft) resetDraft();
    if (!state.catalog || !state.catalog.packs.length) {
        pane.innerHTML = '<div class="box"><p class="empty">The list of lessons could not be loaded just now. Reload the page to try again — your assignments are untouched.</p></div>';
        return;
    }
    const scoped = !!(state.scope && state.scope.length);
    const locked = scoped ? classSet() : { modules: new Set(), games: new Set(), sims: new Set() };
    const card = (item) => {
        const k = kindOf(item.type);
        const isClass = locked[k].has(item.id);
        const on = isClass || state.draft[k].has(item.id);
        const type = item.kind === 'story' ? 'story' : (item.type === 'challenge' ? 'challenge' : item.type);
        return `<button class="ac${isClass ? ' cls' : ''}" type="button" data-item="${esc(item.id)}" data-kind="${k}" aria-pressed="${on}"${isClass || state.readOnly ? ' disabled' : ''}>
            <span class="ic t-${type}" aria-hidden="true">${ICONS[type] || ICONS.lab}</span>
            <span class="grow"><b>${esc(item.name)}${isClass ? '<span class="wc">Whole class</span>' : ''}</b><span class="meta">${TYPE_LABEL[type] || 'Lesson'} · ${item.minutes} min</span></span>
            <span class="tick" aria-hidden="true">${on ? '✓' : ''}</span></button>`;
    };
    const group = (title, sub, items) => `<div class="cat"><h2>${esc(title)}</h2><p class="sub">${esc(sub)}</p><div class="grid">${items.map(card).join('')}</div></div>`;
    const packs = state.catalog.packs.map((p) => group(p.name, p.slug ? 'Lab Pack' : 'Lessons', p.items)).join('');
    const games = state.catalog.gamePacks.flatMap((p) => p.items);
    const sims = (state.catalog.simPacks || []).flatMap((p) => p.items).filter((it) => it.kind !== 'story');
    const stories = (state.catalog.simPacks || []).flatMap((p) => p.items).filter((it) => it.kind === 'story');
    const intro = scoped
        ? `<div class="scope"><span><strong>Assigning just for ${esc(scopeNames())}.</strong> This adds to what the whole class has — it doesn't replace it, and nobody else's list changes. Whole-class work is shown greyed.</span>
            <button class="btn ghost sm" type="button" id="btn-scope-class">Whole class instead</button></div>`
        : `<button class="back" type="button" data-assign-done>‹ Class overview</button>
            <h2 class="t-mode">Assign several</h2>
            <p class="sub" style="font-size:13px;color:var(--soft)">Tick everything for the unit, then save once. To give one student or a few students extra work, tick them on Students.</p>`;
    const ro = state.readOnly ? '<div class="cbanner" style="margin-bottom:14px">This class is read-only, so its assignments can\'t change until you renew Pro.</div>' : '';
    const n = changeCount();
    const summary = assignmentSummary({ modules: [...state.draft.modules], games: [...state.draft.games], sims: [...state.draft.sims], catalog: state.catalog });
    pane.innerHTML = ro + intro + packs
        + (games.length ? group('Games', `${GAME_MINUTES}–10 minutes · warm-ups and quick checks`, games) : '')
        + (sims.length ? group('Simulations', 'Project with Present mode, or students play on their own', sims) : '')
        + (stories.length ? group('Español stories', 'Spanish stories students play on their own, about 30–35 minutes each', stories) : '')
        + (n && !state.readOnly ? `<div class="save" role="region" aria-label="Unsaved changes"><span>${scoped ? `Extra for ${esc(scopeNames())}` : esc(summary.label)}</span>
            <button class="btn ghost sm go" type="button" id="btn-cancel-assign">Cancel</button>
            <button class="btn sm" type="button" id="btn-save-assign">Save assignments (${plural(n, 'change')})</button></div>` : '');
}
$('pane-assign').addEventListener('click', (e) => {
    const card = e.target.closest('[data-item]');
    if (card && !card.disabled) {
        const set = state.draft[card.dataset.kind];
        if (set.has(card.dataset.item)) set.delete(card.dataset.item); else set.add(card.dataset.item);
        // Keep the place: the window scrolls on a phone, the dashboard's screen on a laptop.
        const y = window.scrollY;
        const my = $('main').scrollTop;
        renderAssign();
        window.scrollTo({ top: y });
        $('main').scrollTop = my;
        const again = $('pane-assign').querySelector(`[data-item="${CSS.escape(card.dataset.item)}"]`);
        if (again) again.focus();
        return;
    }
    if (e.target.closest('#btn-scope-class')) { state.scope = null; resetDraft(); renderAssign(); return; }
    if (e.target.closest('[data-assign-done]')) { resetDraft(); setTab('overview'); return; }
    if (e.target.closest('#btn-cancel-assign')) {
        const was = state.scope;
        state.scope = null; resetDraft();
        if (was && was.length === 1) { setTab('students'); openPanel(was[0]); } else setTab(was ? 'students' : 'overview');
        return;
    }
    if (e.target.closest('#btn-save-assign')) saveAssignments();
});

/* SCHEMA (Tickets 2-3): games in `assignedGames`, simulations in `assignedSims`, never in
 * `assignedModules`. assignedModules feeds buildStudent(), whose per-module shape is a fixed
 * step sequence and whose headline % is the mean over assigned modules; MODULE_DATA filters
 * anything without step data out of it. A simulation has its own telemetry stream and its
 * own step count, reads from sessions rather than module_progress, and would sit there as
 * untracked dead weight — exactly the reasons games got their own array. All three are
 * fields on the same document: no extra read or write. */
async function saveAssignments() {
    const btn = $('btn-save-assign');
    if (btn) btn.disabled = true;
    const scoped = state.scope && state.scope.length;
    try {
        if (scoped) {
            const added = {}, removed = {};
            for (const k of KINDS) {
                added[k] = [...state.draft[k]].filter((id) => !state.draftBase[k].has(id));
                removed[k] = [...state.draftBase[k]].filter((id) => !state.draft[k].has(id));
            }
            await Promise.all(state.scope.map((uid) => {
                const cur = state.extrasByUid[uid] || { modules: [], games: [], sims: [] };
                const next = {};
                for (const k of KINDS) {
                    const base = (cur[k] || []).filter((id) => !removed[k].includes(id));
                    next[k] = [...base, ...added[k].filter((id) => !base.includes(id))];
                }
                return writeExtras(uid, next);
            }));
            const who = scopeNames();
            const count = state.scope.length;
            state.scope = null;
            state.selected.clear();
            rebuildAll();
            resetDraft();
            setTab('students');
            renderAll();
            track('content_assigned', { scope: 'students' });
            toast(`Saved — extra work for ${count === 1 ? who : `${count} students`}. Everyone else's list is unchanged.`);
        } else {
            const next = { assignedModules: [...state.draft.modules], assignedGames: [...state.draft.games], assignedSims: [...state.draft.sims] };
            await setDoc(doc(db, 'artifacts', appId, 'classrooms', state.code), next, { merge: true });
            state.classroom = { ...state.classroom, ...next };
            rebuildAll();
            resetDraft();
            setTab('overview');
            renderAll();
            toast('Assignments saved.');
            track('content_assigned', { scope: 'class' });
        }
    } catch (e) {
        console.warn('[Mission Control] saving assignments failed', e);
        toast('That did not save. Your changes are still here — try again.', true);
        if (btn) btn.disabled = false;
    }
}

/* One student's extras doc. Only the delta, never the merged set; empty deletes the doc so
   "no extras" has one representation. */
async function writeExtras(uid, { modules, games, sims }) {
    const ref = doc(db, 'artifacts', appId, 'classroom_assignments', `${state.code}_${uid}`);
    if (!modules.length && !games.length && !sims.length) {
        await deleteDoc(ref).catch((e) => { if (!e || e.code !== 'not-found') throw e; });
        delete state.extrasByUid[uid];
        return;
    }
    await setDoc(ref, { classroomCode: state.code, uid, modules, games, sims, updatedAt: Date.now() });
    state.extrasByUid[uid] = { modules, games, sims };
}

/* ═════════════════════════════════════════════════════════════════════════════
   TEACHER GUIDES (plan-config.js). Every tile is the same: a title and ONE button,
   "Download facilitator guide". Founder rule (2026-11-25): keep it that simple.
   - The button is a <button>, not a visible <a href="….pdf">, on purpose: PDF-helper
     browser extensions attach their own "Open" chips to visible PDF links. Clicking makes
     a temporary download link and removes it.
   - Paid guide, free plan: the same button goes to the guide's TPT listing instead.
   - A guide with no file yet (Room to Think) isn't shown at all.
   ═════════════════════════════════════════════════════════════════════════════ */
function renderGuides() {
    const pro = state.plan.pro;
    const visible = GUIDES.filter((g) => g.storagePath || g.tptUrl);
    const cards = visible.map((g) => {
        const paid = g.tpt && g.tpt !== 'FREE';
        const head = `<div class="eyebrow">${esc(g.kind)}</div><h3>${esc(g.title)}</h3><div class="meta">${esc(g.sub)}</div>`;
        let row;
        if (!paid) {
            row = `<a class="btn sm" href="${esc(g.tptUrl)}" target="_blank" rel="noopener" data-guide-track="${esc(g.id)}">Get it free on TPT</a>`;
        } else if (pro && g.storagePath) {
            row = `<button class="btn sm" type="button" data-guide-path="${esc(g.storagePath)}" data-guide-id="${esc(g.id)}" data-guide-name="${esc(`Allgood Academy - ${g.title} facilitator guide.pdf`)}">Download facilitator guide</button>`;
        } else {
            row = `<span class="incl">Included with Pro</span><button class="btn sm" type="button" data-pro="guides">Get Pro</button>`
                + (g.tptUrl ? `<a class="text-btn" href="${esc(g.tptUrl)}" target="_blank" rel="noopener" data-guide-track="${esc(g.id)}">or ${esc(g.tpt)} on TPT</a>` : '');
        }
        return `<div class="gc">${head}<div class="row">${row}</div></div>`;
    }).join('');
    const banner = pro ? '' : `<div class="gbanner"><div><b>Every paid facilitator guide is included with Pro.</b> Free guides stay free for everyone.</div><button class="btn sm" type="button" data-pro="guides">Get Pro · ${esc(PRO_PRICE_LABEL)}</button></div>`;
    const bundle = (!pro && GUIDE_BUNDLE && GUIDE_BUNDLE.tptUrl)
        ? `<p class="gbundle">Just the guides? <a href="${esc(GUIDE_BUNDLE.tptUrl)}" target="_blank" rel="noopener">${esc(GUIDE_BUNDLE.title)} — ${esc(GUIDE_BUNDLE.tpt)} on TPT</a></p>` : '';
    $('pane-guides').innerHTML = `${banner}<div class="gl">${cards}</div>${bundle}`;
}
// A Pro download: Storage hands back a short-lived link only if storage.rules says this
// teacher is Pro. The Storage SDK loads on the first click, not with the page.
let storageApi = null;
async function guideLink(path) {
    if (!storageApi) {
        const [{ getApp }, st] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js'),
        ]);
        storageApi = { st, storage: st.getStorage(getApp()) };
    }
    return storageApi.st.getDownloadURL(storageApi.st.ref(storageApi.storage, path));
}
document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-guide-track]');
    if (t) { track('guide_download', { guide: t.dataset.guideTrack, via: 'tpt' }); return; }
    const b = e.target.closest('[data-guide-path]');
    if (!b) return;
    e.preventDefault();
    track('guide_download', { guide: b.dataset.guideId, via: 'pro' });
    const label = b.textContent;
    b.disabled = true; b.textContent = 'Preparing…';
    try {
        const url = await guideLink(b.dataset.guidePath);
        // A cross-origin link ignores the download attribute, so it opens in a new tab,
        // where the PDF viewer has its own download button.
        window.open(url, '_blank', 'noopener');
    } catch (err) {
        console.warn('[Mission Control] guide download failed', err && err.code);
        toast(err && err.code === 'storage/unauthorized'
            ? 'That guide is part of Pro. If you just upgraded, reload the page.'
            : "Couldn't get that guide just now. Try again in a moment.", true);
    } finally {
        b.disabled = false; b.textContent = label;
    }
});

/* ═════════════════════════════════════════════════════════════════════════════
   CSV. The roster export is unchanged in shape for everyone: name, email, last active,
   then one column per assigned module (the union). The choice-level export is Pro.
   ═════════════════════════════════════════════════════════════════════════════ */
const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
function download(name, text) {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
function rosterCsv() {
    const statusOf = (s, id) => {
        const m = s.modules[id];
        if (!m) return MODULE_DATA[id] ? 'not_started' : 'assigned_no_progress_data';
        if (m.completed) return 'completed';
        return m.maxStep > 0 ? `in_progress_step_${m.maxStep}_of_${m.meta.stepsTotal}` : 'not_started';
    };
    const cols = unionModules();
    const header = ['Name', 'Email', 'Last Active'].concat(cols.map((id) => itemOf(id).name)).map(q).join(',');
    const rows = state.students.map((s) => {
        const mine = new Set(s.mine.modules);
        return [q(s.name), q((s.raw.row && s.raw.row.email) || ''), q(s.lastActive ? new Date(s.lastActive).toISOString() : 'never')]
            .concat(cols.map((id) => q(mine.has(id) ? statusOf(s, id) : 'not_assigned'))).join(',');
    });
    return [header, ...rows].join('\n') + '\n';
}
function exportRosterCsv() {
    if (!state.students.length) { toast('Nobody has joined yet, so there is nothing to export.', true); return; }
    download(`class-${state.code}-roster.csv`, rosterCsv());
    toast(`Exported ${plural(state.students.length, 'student')}.`);
}
function exportChoiceCsv() {
    const metas = Object.values(MODULE_DATA);
    const rows = choiceLevelRows(state.students, metas);
    if (!rows.length) { toast('No choices recorded yet, so there is nothing to export.', true); return; }
    const head = ['Student', 'Module', 'Kind', 'Step', 'Step or scenario', 'Choice', 'Label', 'Score (0-3)', 'Tries', 'First try best', 'When'];
    const body = rows.map((r) => [r.student, r.module, r.kind, r.step, r.stepTitle, r.choice, r.tag, r.score, r.tries, r.firstTry, r.at].map(q).join(','));
    download(`class-${state.code}-choices.csv`, [head.map(q).join(','), ...body].join('\n') + '\n');
    toast(`Exported ${plural(rows.length, 'choice')}.`);
}

/* ── shared clicks (drill-down, open a student, go to a tab) ──────────────── */
$('main').addEventListener('click', (e) => {
    const drill = e.target.closest('[data-drill]');
    if (drill) { state.drillId = drill.dataset.drill; setTab('reports'); return; }
    if (e.target.closest('[data-back]')) { state.drillId = null; renderReports(); return; }
    const rt = e.target.closest('[data-rtab]');
    if (rt) { setReportTab(rt.dataset.rtab, true); return; }
    const open = e.target.closest('[data-open]');
    if (open) { openPanel(open.dataset.open); return; }
    if (e.target.closest('[data-wall]')) { showWall(true); return; }
    const al = e.target.closest('[data-assign-lesson]');
    if (al) { assignLessonTo(al.dataset.assignLesson, al.dataset.uids.split(',').filter(Boolean)); return; }
    const go = e.target.closest('[data-goto]');
    if (go) {
        if (go.dataset.filter) state.filter = go.dataset.filter;
        if (go.dataset.goto === 'assign') { state.scope = null; resetDraft(); }
        if (go.dataset.goto === 'students' && state.drillId) toast('Tick the students, then "Assign to these".');
        setTab(go.dataset.goto);
    }
});

// Reports tabs: Left/Right (and Home/End) move between tabs and select, as tabs do.
$('pane-reports').addEventListener('keydown', (e) => {
    const t = e.target.closest('[data-rtab]');
    if (!t) return;
    const i = REPORT_TABS.findIndex((x) => x.id === t.dataset.rtab);
    const to = { ArrowRight: (i + 1) % REPORT_TABS.length, ArrowLeft: (i + REPORT_TABS.length - 1) % REPORT_TABS.length, Home: 0, End: REPORT_TABS.length - 1 }[e.key];
    if (to == null) return;
    e.preventDefault();
    setReportTab(REPORT_TABS[to].id, true);
});

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('wall').hidden) { showWall(false); return; }
    if (!$('pro-panel').hidden) { closeModal('pro-panel'); return; }
    if (!$('name-dlg').hidden) { closeModal('name-dlg'); return; }
    if (!$('del-dlg').hidden) { closeModal('del-dlg'); return; }
    if (!$('cls-menu').hidden) { toggleMenu(false); $('cls-btn').focus(); return; }
    if (state.panelUid) closePanel();
});

/* ── back from Stripe: ?pro=welcome ─────────────────────────────────────────
   The Payment Link's after-payment redirect lands here. The Stripe webhook (functions/)
   writes teacher_plans/{uid} within seconds, so re-read the plan every few seconds for up
   to a minute, then repaint. The page still grants nothing itself: only the plan doc does. */
const PRO_WELCOME_WAIT_MS = 60 * 1000;
const PRO_WELCOME_EVERY_MS = 4 * 1000;
function proNotice(html, tone) {
    let el = $('pro-welcome');
    if (!el) {
        el = document.createElement('div');
        el.id = 'pro-welcome';
        el.className = 'cbanner';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        const host = $('class-banner');
        host.parentNode.insertBefore(el, host);
    }
    el.innerHTML = html;
    el.dataset.tone = tone || '';
}
async function welcomePro() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pro') !== 'welcome' || !state.user || !$('class-banner')) return;
    // Drop the parameter so a reload doesn't start the wait again.
    params.delete('pro');
    const qs = params.toString();
    history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    const started = Date.now();
    proNotice('<span><strong>Payment received — turning on Pro…</strong></span>');
    let plan = state.plan;
    while (!plan.pro && Date.now() - started < PRO_WELCOME_WAIT_MS) {
        await new Promise((r) => setTimeout(r, PRO_WELCOME_EVERY_MS));
        plan = await readPlan(state.user.uid);
    }
    if (plan.pro) {
        if (!state.plan.pro) await load();
        const until = new Date(plan.until).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
        proNotice(`<span><strong>Pro is on.</strong> Thank you! Your plan runs through ${esc(until)}.</span>`, 'ok');
    } else {
        proNotice(`<span><strong>Taking longer than usual.</strong> It'll be on shortly; email <a href="mailto:${esc(PRO_CONTACT_EMAIL)}">${esc(PRO_CONTACT_EMAIL)}</a> if not.</span>`, 'wait');
    }
}

/* ── content cards, teacher view ──────────────────────────────────────────────
   On Lab Packs, Games and Simulations every card gets Try it (the same link a student's
   Play is), Assign (toggles to "Assigned ✓" for the class, on the same class fields
   "Assign several" saves: assignedModules / assignedGames / assignedSims) and, on a
   simulation with a present mode (simulations.json `present`), Present (its #present
   view). The dashboard draws the card; this says what goes on it. Students get none of it:
   this module never loads for them. */
const CLASS_FIELD = { modules: 'assignedModules', games: 'assignedGames', sims: 'assignedSims' };
// The dashboard's simulations come from simulations.json; assignment uses the registry's
// type 'sim' entry, which names its simulations.json row as simulationId.
function registryIdFor(m) {
    if (m.type !== 'simulation') return m.id;
    const r = [...state.registryById.values()].find((x) => x.type === 'sim' && x.simulationId === m.id);
    return r ? r.id : null;
}
function cardActions(m) {
    // An admin previewing the checks (?checks=preview) keeps the preview when they open a story.
    const tryIt = `<a class="btn ghost sm" href="${esc(m.url)}${m.type === 'story' && CHECKS_PREVIEW() ? '?checks=preview' : ''}" data-name="${esc(m.name)}">Try it</a>`;
    const present = m.type === 'simulation' && m.present
        ? `<a class="btn ghost sm" href="${esc(m.url)}#present" data-name="${esc(m.name)}">Present</a>` : '';
    // Español stories: the class plays it together on the projector (story-presentar.js).
    // Teacher-only like everything here; the class code rides along so the recap can save.
    const presentar = m.type === 'story' && state.code
        ? `<a class="btn ghost sm" href="${esc(m.url)}?mode=presentar&amp;class=${encodeURIComponent(state.code)}${CHECKS_PREVIEW() ? '&amp;checks=preview' : ''}" data-name="${esc(m.name)}" lang="es">Presentar en clase</a>` : '';
    const id = state.code ? registryIdFor(m) : null;
    if (!id || !state.registryById.has(id)) return tryIt + present + presentar;
    const kind = kindOf(m.type === 'simulation' ? 'sim' : m.type);
    const on = ((state.classroom && state.classroom[CLASS_FIELD[kind]]) || []).includes(id);
    const assign = `<button class="btn sm assign${on ? ' on' : ''}" type="button" data-assign-card="${esc(id)}" data-kind="${kind}"${state.readOnly ? ' disabled' : ''}>${on ? 'Assigned ✓' : 'Assign'}<span class="sr"> ${esc(m.name)}${on ? ' (tap to unassign)' : ''}</span></button>`;
    return tryIt + present + presentar + assign;
}
async function toggleCardAssign(btn) {
    if (state.readOnly || !state.code) return;
    const id = btn.dataset.assignCard;
    const field = CLASS_FIELD[btn.dataset.kind];
    if (!field) return;
    const cur = Array.isArray(state.classroom[field]) ? state.classroom[field] : [];
    const on = cur.includes(id);
    const next = on ? cur.filter((x) => x !== id) : [...cur, id];
    btn.disabled = true;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'classrooms', state.code), { [field]: next }, { merge: true });
        state.classroom = { ...state.classroom, [field]: next };
        rebuildAll();
        if (state.tab !== 'assign') resetDraft();
        renderAll();
        const name = itemOf(id).name;
        toast(on ? `${name} is no longer assigned to ${className(state.classroom)}.` : `${name} assigned to ${className(state.classroom)}.`);
        if (!on) track('content_assigned', { scope: 'card' });
        const again = document.querySelector(`[data-assign-card="${CSS.escape(id)}"]`);
        if (again) again.focus();
    } catch (e) {
        console.warn('[Mission Control] assigning from the card failed', e);
        toast('That did not save. Please try again.', true);
        btn.disabled = false;
    }
}
$('main').addEventListener('click', (e) => {
    const b = e.target.closest('[data-assign-card]');
    if (b && !b.disabled) toggleCardAssign(b);
});

/* ── start: called by /dashboard/ once it has confirmed a teacher with a class ──
   `dashboard` is the page's small API: addViews(names, onShow), showView(name, opts),
   setCardActions(fn) and renderCatalog(). */
export async function start(dashboard) {
    api = dashboard;
    api.setCardActions(cardActions);
    api.addViews(Object.keys(DEFAULT_TAB), renderView);
    showOnly('screen-loading');
    try {
        await load();
    } catch (err) {
        console.warn('[Mission Control] load failed', err);
        showGate(
            'Could not load your class.',
            `Something went wrong reading it: ${err && err.message ? err.message : 'unknown error'}`,
            'Reload', window.location.pathname + window.location.hash,
        );
        return;
    }
    welcomePro().catch((e) => console.warn('[Mission Control] Pro welcome', e));
}
