// The shaping layer behind Mission Control: everything that turns raw Firestore documents
// into the per-student, per-module shape the page renders. Kept out of index.html and free of
// any DOM or network access so it can be exercised directly by tests/mission-control.test.mjs
// — this is where the subtle mistakes live (a 1-based index read as 0-based, a lab's
// highestUnlocked read as a step count), and none of them are visible by looking at the page.

export const DAY = 24 * 60 * 60 * 1000;

// The thresholds the teacher brief defines, in one place so the top-bar tiles, the roster
// dots and the detail banner can never disagree about what "at risk" means.
export const ACTIVE_WINDOW_DAYS = 7;
export const NEEDS_ATTENTION_DAYS = 4;
export const AT_RISK_DAYS = 8;

/* Firestore hands back a Timestamp for a serverTimestamp() field, but a document written
   moments ago and read from the local cache can still carry null there, and older rows may
   hold a plain number or an ISO string. All of them have to collapse to one comparable
   value, and an unparseable one has to become 0 rather than NaN — NaN poisons every
   Math.max() it touches, which would silently blank out "last active" for a whole roster. */
export function toMillis(v) {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? 0 : t; }
    return 0;
}

export function relativeTime(ms, now = Date.now()) {
    if (!ms) return 'never';
    const diff = now - ms;
    if (diff < 60 * 1000) return 'just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} min ago`;
    if (diff < DAY) {
        const h = Math.floor(diff / (60 * 60 * 1000));
        return h === 1 ? '1 hour ago' : `${h} hours ago`;
    }
    const days = Math.floor(diff / DAY);
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    return new Date(ms).toLocaleDateString();
}

export const initialsOf = (name) =>
    (String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('') || '?').toUpperCase();

/* A lab's module_progress holds highestUnlocked, a 0-INDEXED page number: Case 1 merely open
   is 0, one Case cleared is 1. The step number a teacher reads is therefore one higher. The
   Challenge instead stores a map of answered scenarios, where the count IS the step. Neither
   value is a step number on its own, and treating either as one shifts a whole module's
   progress bar. */
export function stepFromProgress(progressDoc) {
    if (!progressDoc) return 0;
    if (typeof progressDoc.highestUnlocked === 'number') return progressDoc.highestUnlocked + 1;
    const answered = progressDoc.answeredScenarioScores;
    if (answered && typeof answered === 'object') return Object.keys(answered).length;
    return 0;
}

/* Labs deliberately write no numeric score — they are not graded quizzes — so this returns
   null for them and the card shows no "best score" line rather than a misleading 0%.
   percentage is preferred over finalScore because finalScore is out of a per-module maximum
   (the Challenge's is 90), so it is not comparable across modules on its own. */
export function bestScore(scoreDocs) {
    let best = null;
    for (const s of scoreDocs) {
        if (typeof s.percentage === 'number') best = Math.max(best ?? 0, Math.round(s.percentage));
        else if (typeof s.finalScore === 'number' && s.finalScore > 0) best = Math.max(best ?? 0, Math.round(s.finalScore));
    }
    return best;
}

/* Buckets a module's scenario_attempts documents by the step they belong to.

   scenarioIndex is written 1-BASED by the Challenge and 0-BASED by every lab — see indexBase
   in module-data.js, which records it per module rather than leaving it to be guessed. Get
   this wrong and every choice in the drill-down silently shifts by one row, attributing each
   student's answer to the neighbouring question.

   A step can legitimately hold more than one attempt: the Scam Sort grades each of five
   messages under one Case, and Friday grades each of three picks, so the value is always an
   array, oldest first. */
export function attemptsByStep(meta, attemptDocs) {
    const byStep = {};
    for (const a of attemptDocs) {
        if (typeof a.scenarioIndex !== 'number') continue;
        const step = a.scenarioIndex - meta.indexBase;
        if (step < 0 || step >= meta.stepsTotal) continue;
        (byStep[step] = byStep[step] || []).push(a);
    }
    for (const k of Object.keys(byStep)) byStep[k].sort((x, y) => toMillis(x.timestamp) - toMillis(y.timestamp));
    return byStep;
}

/* The three statuses the brief defines.

   Order matters. "At risk" is checked before "needs attention" because eight days of silence
   is the more urgent reading of a student who satisfies both. A student who has never started
   anything is deliberately NOT left on track: an untouched roster entry is exactly the one a
   teacher loses track of, so silence counts against them whether or not they ever began. */
export function deriveStatus({ lastActive, started, allDone }, now = Date.now()) {
    if (allDone) return 'on-track';
    const idleDays = lastActive ? (now - lastActive) / DAY : Infinity;
    if (idleDays >= AT_RISK_DAYS) return 'at-risk';
    if (idleDays >= NEEDS_ATTENTION_DAYS) return 'needs-attention';
    return 'on-track';
}

/* Turns one student's raw documents into the per-module shape every view renders.

   Three sources overlap deliberately, because each holds something the others do not:
     sessions        — the only source of activeMs, and the most accurate maxStep
     module_progress — written every time a Case is cleared, so it survives when sessions
                       cannot be read, and is the ONLY in-progress signal a lab produces
     game_scores     — the completion flag, and the only numeric score
   Progress therefore takes the HIGHEST step any of them can prove rather than the first one
   found: a teacher reading a lower number than the student's real position would chase
   someone who is not actually behind. */
export function buildStudent({ row, assigned, moduleData, scores = [], attempts = [], progress = {}, sessions = [], gameSessions = [] }, now = Date.now()) {
    const name = row.displayName || 'Agent Learner';
    const modules = {};
    let lastActive = 0;

    for (const id of assigned) {
        const meta = moduleData[id];
        if (!meta) continue;

        const mScores = scores.filter((s) => meta.gameNames.includes(s.gameName));
        const mSessions = sessions.filter((s) => s.module === meta.slug);
        const mProgress = progress[meta.slug] || null;

        const completed = mScores.some((s) => s.completed === true);
        const activeMs = mSessions.reduce((n, s) => n + (Number(s.activeMs) || 0), 0);

        const seen = Math.max(
            0,
            ...mSessions.map((s) => toMillis(s.lastSeenAt)),
            ...mScores.map((s) => toMillis(s.lastUpdated)),
            toMillis(mProgress && mProgress.lastUpdated),
        );
        if (seen > lastActive) lastActive = seen;

        let maxStep = Math.max(0, ...mSessions.map((s) => Number(s.maxStep) || 0), stepFromProgress(mProgress));
        if (completed) maxStep = meta.stepsTotal;
        maxStep = Math.min(maxStep, meta.stepsTotal);

        modules[id] = {
            id,
            meta,
            completed,
            maxStep,
            activeMs,
            lastSeen: seen,
            score: bestScore(mScores),
            attempts: attemptsByStep(meta, attempts.filter((a) => meta.gameNames.includes(a.gameName))),
            pct: meta.stepsTotal ? Math.round((maxStep / meta.stepsTotal) * 100) : 0,
            // How many separate visits this student made. "Opened it three times and never
            // got past Case 4" is a different problem from "opened it once and stopped", and
            // only the visit count can tell them apart. One telemetry session is one visit.
            opens: mSessions.length,
            // Kept so per-step timing can be derived (see perStepTiming): a step's elapsed
            // time is only defensible inside a single visit, so the visit windows are needed
            // alongside the attempt timestamps.
            sessions: mSessions,
        };
    }

    // The four standalone games aren't assigned modules, but a student who is actively
    // playing one is exactly as "active" as one working through a lab — lastActive (and the
    // status derived from it) must not ignore them just because they never entered the loop
    // above. playedAt is the field every game's telemetry write actually carries (see the
    // create rule in firestore.rules and each game's setDoc call).
    const gamesLastActive = Math.max(0, ...gameSessions.map((s) => toMillis(s.playedAt)));
    if (gamesLastActive > lastActive) lastActive = gamesLastActive;

    const ids = assigned.filter((id) => modules[id]);
    const started = ids.some((id) => modules[id].maxStep > 0) || gameSessions.length > 0;
    const allDone = ids.length > 0 && ids.every((id) => modules[id].completed);

    /* Overall completion is the MEAN of each assigned module's own percentage, not the share
       of all steps done. The two are very different here: the Challenge is 30 scenarios and a
       lab is 6 or 7 Cases, so pooling steps lets the Challenge account for four fifths of the
       figure. A student half way through a lab and yet to open the Challenge would read as 7%
       — which a teacher scanning a roster would fairly take to mean "has done almost
       nothing". Weighting each assigned module equally answers the question actually being
       asked: how much of what I set has this student got through. */
    const overall = ids.length
        ? Math.round(ids.reduce((n, id) => n + modules[id].pct, 0) / ids.length)
        : 0;

    return {
        uid: row.uid,
        name,
        initials: initialsOf(name),
        modules,
        lastActive,
        activeMs: ids.reduce((n, id) => n + modules[id].activeMs, 0),
        completedCount: ids.filter((id) => modules[id].completed).length,
        pct: overall,
        allDone,
        status: deriveStatus({ lastActive, started, allDone }, now),
    };
}

/* Class average. Labs write no numeric score at all, so in practice this is the Challenge
   average. It is expressed as a percentage because finalScore is out of a per-module maximum,
   and averaging raw points across modules with different maxima would not mean anything. */
export function classAverage(students, assigned) {
    const values = [];
    for (const s of students) {
        for (const id of assigned) {
            const m = s.modules[id];
            if (m && typeof m.score === 'number') values.push(m.score);
        }
    }
    if (!values.length) return null;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function countActiveThisWeek(students, now = Date.now()) {
    return students.filter((s) => s.lastActive && (now - s.lastActive) < ACTIVE_WINDOW_DAYS * DAY).length;
}

/* The four standalone games (Read the Signal, Before You Send, The Rumor Mill, Money
   Moves) are guest-first and randomized-bank — no fixed Case sequence, so they were never
   folded into MODULE_DATA/MODULE_REGISTRY's step-by-step review model (that would mean a
   "step 3 of 10" that names a different scenario every time a student replays). They get
   their own lightweight summary instead: best score and last-played per game, sourced
   directly from the game_sessions collection rather than assigned/completed/stepped like
   a GoodBlock or Challenge. */
export const GAME_REGISTRY = {
    'read-the-signal':  { name: 'Read the Signal', icon: '📡', url: '/educational-games/read-the-signal/' },
    'before-you-send':  { name: 'Before You Send', icon: '✉️', url: '/educational-games/before-you-send/' },
    'the-rumor-mill':   { name: 'The Rumor Mill', icon: '🌀', url: '/educational-games/the-rumor-mill/' },
    'money-moves':      { name: 'Money Moves', icon: '💸', url: '/educational-games/money-moves/' },
};

/* Pull the four standalone games out of a student's telemetry session documents.
 *
 * A game's session doc is an ordinary telemetry session — uid, module, startedAt,
 * activeMs, completed — plus a `summary` map the game attaches on complete()
 * (Telemetry.summary(); see public/js/telemetry.js). The summary is where the numbers a
 * teacher actually wants live: scenariosPlayed, correct, the per-category breakdown, and
 * whether the student clicked through to the recommended lesson. It rides on the session
 * document rather than in the event stream because a teacher can read their own students'
 * sessions (firestore.rules 10b) and cannot read events at all (rule 11).
 *
 * Flattened here into the shape summarizeGameSessions() already consumed, so everything
 * downstream — and the roster UI — is unchanged by where the data came from. A session
 * for a module that is not one of the four games, or one with no summary yet (a round
 * still in progress), is skipped rather than counted as a play. */
export function gameSessionsFromTelemetry(sessions = []) {
    const out = [];
    for (const s of sessions) {
        if (!s || !GAME_REGISTRY[s.module]) continue;
        const summary = s.summary || {};
        if (!summary || typeof summary !== 'object' || summary.scenariosPlayed == null) continue;
        out.push({
            id: s.sessionId || null,
            game: s.module,
            // A game's round is over the moment the end screen renders, so lastSeenAt is the
            // closest thing to the old playedAt; startedAt covers a doc flushed before the
            // first heartbeat.
            playedAt: s.lastSeenAt || s.startedAt || null,
            scenariosPlayed: summary.scenariosPlayed,
            correct: summary.correct,
            categories: summary.categories || null,
            clickedDeeperLink: summary.clickedDeeperLink === true,
        });
    }
    return out;
}

/* A single session's categories map comes back from Firestore as either `categories` or
   `categoryStats` depending on which game wrote it (both games in production write
   `categories`, but this stays tolerant of either key so an older/renamed field never
   silently drops a session's breakdown). Shape is always { [name]: { played, correct } }. */
function categoriesOf(session) {
    return session.categories || session.categoryStats || null;
}

/* Merges one session's category map into a running per-game total, summing played/correct
   per category name across every session of that game this student has. */
function mergeCategories(total, cats) {
    if (!cats) return total;
    for (const [name, stat] of Object.entries(cats)) {
        if (!stat || typeof stat.played !== 'number') continue;
        const t = total[name] || { played: 0, correct: 0 };
        t.played += stat.played;
        t.correct += (typeof stat.correct === 'number') ? stat.correct : 0;
        total[name] = t;
    }
    return total;
}

/* Picks the strongest/weakest category by accuracy across ALL of a student's sessions of one
   game, considering only categories actually played (played > 0) — an unplayed category is
   not "weak", it just never came up. Ties break toward whichever was played more, since a
   50%-of-2 and a 50%-of-20 are not equally informative about where the student stands. */
function strongestAndWeakest(categoryTotals) {
    const withAccuracy = Object.entries(categoryTotals)
        .filter(([, s]) => s.played > 0)
        .map(([name, s]) => ({ name, played: s.played, correct: s.correct, accuracy: Math.round((s.correct / s.played) * 100) }));
    if (!withAccuracy.length) return { strongest: null, weakest: null };
    const byAccDesc = [...withAccuracy].sort((a, b) => b.accuracy - a.accuracy || b.played - a.played);
    const byAccAsc = [...withAccuracy].sort((a, b) => a.accuracy - b.accuracy || b.played - a.played);
    return { strongest: byAccDesc[0], weakest: byAccAsc[0] };
}

/* One row per game this student has ever played, best-scoring session first read off
   correct/scenariosPlayed (every game's schema carries both), most-recently-played last
   read off playedAt. A game never played is simply absent — there is no "not started"
   state to show for something with no assignment to be behind on.

   Beyond the existing aggregate fields (plays/bestPct/lastPlayed), each row now also carries:
     categoryTotals    — summed played/correct per category across every session of this game
     strongestCategory — { name, accuracy, played } by accuracy, ties broken by more played
     weakestCategory   — same, lowest accuracy first
     deeperLinkClicks  — count of sessions where the student clicked through to the
                         recommended lesson after finishing
     sessions          — the raw per-session list (id, pct, timestamp, this session's own
                         category breakdown, clickedDeeperLink), newest first, so the UI can
                         render an actual drill-down instead of only the aggregate. */
export function summarizeGameSessions(sessions) {
    const byGame = {};
    for (const s of sessions) {
        const meta = GAME_REGISTRY[s.game];
        if (!meta) continue;
        const pct = (typeof s.scenariosPlayed === 'number' && s.scenariosPlayed > 0 && typeof s.correct === 'number')
            ? Math.round((s.correct / s.scenariosPlayed) * 100)
            : null;
        const playedAtMs = toMillis(s.playedAt);
        const cats = categoriesOf(s);
        const g = byGame[s.game] || {
            id: s.game, meta, plays: 0, bestPct: null, lastPlayed: 0,
            categoryTotals: {}, deeperLinkClicks: 0, sessions: [],
        };
        g.plays += 1;
        if (pct != null) g.bestPct = g.bestPct == null ? pct : Math.max(g.bestPct, pct);
        if (playedAtMs > g.lastPlayed) g.lastPlayed = playedAtMs;
        mergeCategories(g.categoryTotals, cats);
        if (s.clickedDeeperLink === true) g.deeperLinkClicks += 1;
        g.sessions.push({
            id: s.id || null,
            pct,
            playedAt: playedAtMs,
            categories: cats || null,
            clickedDeeperLink: s.clickedDeeperLink === true,
        });
        byGame[s.game] = g;
    }
    return Object.values(byGame)
        .map((g) => {
            const { strongest, weakest } = strongestAndWeakest(g.categoryTotals);
            return {
                ...g,
                strongestCategory: strongest,
                weakestCategory: weakest,
                sessions: g.sessions.sort((a, b) => b.playedAt - a.playedAt),
            };
        })
        .sort((a, b) => b.lastPlayed - a.lastPlayed);
}

/* Turns a stored choiceIndex back into the words the student saw. The text always comes from
   module-data.js — generated from the Challenge's own SCENARIO_DATA and each lab's
   CASE_CHOICES — never from a copy kept in the dashboard, so a reworded option cannot leave a
   teacher confidently reading a sentence nobody was ever shown. An index outside the option
   list (an attempt written by an older build of a module) is said plainly, not guessed at. */
export function choiceTextFor(step, attempt) {
    const options = step && step.choices;
    const idx = attempt && attempt.choiceIndex;
    if (options && typeof idx === 'number' && options[idx]) return options[idx].text;
    if (typeof idx === 'number') return `Option ${idx + 1} — no longer in this module`;
    return 'No choice recorded';
}

/* ═════════════════════════════════════════════════════════════════════════════
   THE ASSIGNMENT CATALOG — what a teacher can put on the roster.

   Sourced entirely from /data/modules-registry.json. Nothing here enumerates
   modules: adding a GoodBlock, Challenge or game to the registry makes it
   appear in the picker with no change to this file or to index.html. That is
   the point — the dashboard's old picker held its own MODULE_REGISTRY copy, so
   every new GoodBlock needed a code edit in a second place to become
   assignable.
   ═════════════════════════════════════════════════════════════════════════════ */

/* Class-time estimates. A teacher assigning work is budgeting minutes of a period, not
   counting rows, so the save bar totals time. The registry carries durationMinutes for
   Challenges and labs and these are only the fallback when it does not; games never carry
   one, so GAME_MINUTES is always what they cost. Games really are about a third of a lab —
   one randomized round, no Case sequence — and averaging the two together would make "about
   88 minutes" wrong in the direction that matters (a teacher planning a 50-minute period). */
export const MODULE_MINUTES = 20;
export const GAME_MINUTES = 8;

// Display names for the registry's pack slugs. The registry stores the slug and nothing
// else, so the human name has to live somewhere; an unknown slug falls back to a
// title-cased version of itself rather than being dropped, so a NEW Lab Pack appears in the
// picker (as "Some New Pack") the moment its modules are registered, without a code change
// here. Adding it to this map only improves the label.
export const PACK_NAMES = {
    'digital-decisions': 'Digital Decisions',
    'real-world-ready': 'Real World Ready',
    'room-to-think': 'Room to Think',
};
export const UNPACKED_LABEL = 'Standalone';

export function packLabel(slug) {
    if (!slug) return UNPACKED_LABEL;
    return PACK_NAMES[slug] || String(slug).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* A game's pack is not on its registry entry — games are pack-less by design, since a guest
   can play one without ever meeting a Lab Pack. What a game DOES carry is
   defaultDestination, the lab it routes a weak player into, so the pack a game belongs to
   for a teacher's purposes is the pack of that lab. Resolved by looking the destination up
   in the registry rather than parsing the URL, so a lab that moves house keeps its game
   grouped with it. */
export function packForGame(entry, allModules) {
    if (entry.pack) return entry.pack;
    const dest = (allModules || []).find((m) => m.url && m.url === entry.defaultDestination);
    return (dest && dest.pack) || null;
}

/* Every lab in the registry that claims one of this game's own skill codes — i.e. every
   place the shared resolver in /js/skill-routing.js could actually send a student who
   played it. Rendered as "routes to Privacy & Security or Social Intelligence", which is
   the honest answer: a game has several categories and routes per-category, so naming only
   its defaultDestination would understate where it leads.

   Derived from skillTags and the registry, never hardcoded. Alias tags are skipped so a
   code and its alias do not double-count the same skill. */
export function routingTargetsFor(entry, allModules, { normalize: norm = defaultNormalize } = {}) {
    const codes = new Set(
        (entry.skillTags || [])
            .filter((t) => t && t.framework === 'internal' && !t.alias_of)
            .map((t) => norm(t.code)),
    );
    if (!codes.size) return [];
    const names = [];
    for (const m of allModules || []) {
        if (m.type !== 'lab' || !m.url) continue;
        const mine = (m.skillTags || [])
            .filter((t) => t && t.framework === 'internal')
            .some((t) => codes.has(norm(t.code)));
        if (mine && !names.includes(m.name)) names.push(m.name);
    }
    return names;
}

// Same normalization the resolver uses, duplicated only so this module keeps its no-imports
// property (derive.js is loaded by tests directly and by the page as a module). Callers that
// already have the resolver's own normalize can pass it in.
function defaultNormalize(s) {
    return String(s == null ? '' : s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function formatList(names) {
    if (!names.length) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} or ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

/* Turns the flat registry into the two grouped lists the Assign page renders.

   `retired` entries are excluded: Jolene's Lemonade is still in the registry so old
   telemetry can be attributed to a name, and putting it back in front of a teacher as
   assignable work would be a bug, not a feature.

   Challenges sit inside their own pack alongside its GoodBlocks and are marked
   isCapstone — a Challenge is the thing you assign AFTER the labs, and pulling them into a
   separate "Challenges" group would hide that relationship. `trackable` says whether
   Mission Control can show step-by-step progress for it (see module-data.js, whose
   generator covers the Digital Decisions lab only today); the picker still offers the rest,
   because a teacher assigning them is legitimate and the roster says plainly what it cannot
   yet show. */
export function buildCatalog(registryModules = []) {
    // `hidden` is dropped alongside `retired`, and for the same reason the dashboard drops
    // games: a module a teacher must not be able to assign has no row on the Assign page.
    // Pattern Lab is the one today — free CogAT-style practice published for parents
    // arriving from search, with no classroom use and no GoodBlock it routes into. See the
    // `hidden` contract in public/data/modules-registry.json.
    const live = registryModules.filter((m) => m && m.id && !m.retired && !m.hidden);
    const packOrder = [];
    const byPack = new Map();

    const push = (slug, item) => {
        const key = slug || '';
        if (!byPack.has(key)) { byPack.set(key, []); packOrder.push(key); }
        byPack.get(key).push(item);
    };

    for (const m of live) {
        if (m.type !== 'lab' && m.type !== 'challenge') continue;
        push(m.pack, {
            id: m.id,
            name: m.name,
            type: m.type,
            url: m.url || null,
            blurb: m.blurb || (m.type === 'challenge' ? 'Capstone — pulls from the whole pack' : ''),
            minutes: Number(m.durationMinutes) > 0 ? Number(m.durationMinutes) : MODULE_MINUTES,
            isCapstone: m.type === 'challenge',
        });
    }

    const gamePackOrder = [];
    const gamesByPack = new Map();
    for (const m of live) {
        if (m.type !== 'game') continue;
        const slug = packForGame(m, live) || '';
        if (!gamesByPack.has(slug)) { gamesByPack.set(slug, []); gamePackOrder.push(slug); }
        gamesByPack.get(slug).push({
            id: m.id,
            name: m.name,
            type: 'game',
            url: m.url || null,
            minutes: GAME_MINUTES,
            routesTo: routingTargetsFor(m, live),
        });
    }

    return {
        // A capstone always renders last within its pack, whatever order the registry
        // happens to list it in — the registry orders rwr-challenge before the Room to
        // Think labs, and a Challenge floating above the lessons it tests reads as an error.
        packs: packOrder.map((slug) => ({
            slug: slug || null,
            name: packLabel(slug),
            items: byPack.get(slug).slice().sort((a, b) => (a.isCapstone ? 1 : 0) - (b.isCapstone ? 1 : 0)),
        })),
        gamePacks: gamePackOrder.map((slug) => ({
            slug: slug || null,
            name: slug ? `${packLabel(slug)} games` : 'Other games',
            items: gamesByPack.get(slug),
        })),
        moduleIds: live.filter((m) => m.type === 'lab' || m.type === 'challenge').map((m) => m.id),
        gameIds: live.filter((m) => m.type === 'game').map((m) => m.id),
        byId: new Map(live.map((m) => [m.id, m])),
    };
}

/* The live count on the save bar. Modules and games are counted separately and the minutes
   are the sum of each item's own estimate, so a 30-minute Challenge is not billed as a
   20-minute lab. */
export function assignmentSummary({ modules = [], games = [], catalog }) {
    const flat = new Map();
    for (const p of catalog.packs) for (const it of p.items) flat.set(it.id, it);
    for (const p of catalog.gamePacks) for (const it of p.items) flat.set(it.id, it);

    const picked = [...modules, ...games].map((id) => flat.get(id)).filter(Boolean);
    const mods = picked.filter((it) => it.type !== 'game');
    const gms = picked.filter((it) => it.type === 'game');
    const minutes = picked.reduce((n, it) => n + it.minutes, 0);

    const parts = [];
    if (mods.length) parts.push(`${mods.length} module${mods.length === 1 ? '' : 's'}`);
    if (gms.length) parts.push(`${gms.length} game${gms.length === 1 ? '' : 's'}`);
    return {
        moduleCount: mods.length,
        gameCount: gms.length,
        minutes,
        label: parts.length
            ? `${parts.join(' + ')} assigned · about ${minutes} minute${minutes === 1 ? '' : 's'} of class time`
            : 'Nothing assigned yet',
    };
}

/* ═════════════════════════════════════════════════════════════════════════════
   CLASS-WIDE GAME RESULTS (the roster's game strip)
   ═════════════════════════════════════════════════════════════════════════════ */

/* How many students must have played a game before its class-wide weakest skill is stated
   as a fact rather than withheld.

   Five, and the reason is what the number is used for: a teacher reads "weakest across
   class: permissions" as a reteach signal for the whole room. Off two players that is one
   student's bad round wearing the class's name. Five is the smallest count where a single
   outlier cannot own the answer on its own, and it is still reachable in a normal period —
   a higher bar would mean the line a teacher most wants almost never appears. Below it the
   strip says "not enough plays to call it yet", which is information, not a blank. */
export const WEAK_SKILL_MIN_PLAYERS = 5;

/* Per-game, class-wide roll-up computed from real telemetry — every student's own
   per-category played/correct totals, summed across the class.

   `players` counts STUDENTS who played, not sessions: three rounds by one student is one
   player, and the threshold above is about how many different people the claim rests on.
   Accuracy is pooled (total correct / total played) rather than averaged per student, so a
   student who played 40 scenarios is not weighted the same as one who played 4. */
export function classGameStats(students = [], { minPlayers = WEAK_SKILL_MIN_PLAYERS } = {}) {
    const byGame = new Map();
    for (const s of students) {
        for (const g of (s.games || [])) {
            const row = byGame.get(g.id) || {
                id: g.id, meta: g.meta, players: 0, plays: 0,
                correct: 0, played: 0, categoryTotals: {},
            };
            row.players += 1;
            row.plays += g.plays || 0;
            for (const [name, stat] of Object.entries(g.categoryTotals || {})) {
                if (!stat || typeof stat.played !== 'number' || stat.played <= 0) continue;
                const t = row.categoryTotals[name] || { played: 0, correct: 0 };
                t.played += stat.played;
                t.correct += (typeof stat.correct === 'number') ? stat.correct : 0;
                row.categoryTotals[name] = t;
            }
            byGame.set(g.id, row);
        }
    }
    // Pooled totals are summed from the finished category map in one pass rather than
    // accumulated inside the loop above, where a category seen twice for the same student
    // would double-count it.
    for (const row of byGame.values()) {
        row.played = 0; row.correct = 0;
        for (const stat of Object.values(row.categoryTotals)) {
            row.played += stat.played;
            row.correct += stat.correct;
        }
        row.avgPct = row.played > 0 ? Math.round((row.correct / row.played) * 100) : null;
        row.enoughPlayers = row.players >= minPlayers;
        const ranked = Object.entries(row.categoryTotals)
            .filter(([, st]) => st.played > 0)
            .map(([name, st]) => ({ name, played: st.played, correct: st.correct, accuracy: Math.round((st.correct / st.played) * 100) }))
            .sort((a, b) => a.accuracy - b.accuracy || b.played - a.played);
        // Withheld, not guessed at, below the threshold — the strip renders the honest
        // "not enough plays to call it yet" instead.
        row.weakestCategory = row.enoughPlayers ? (ranked[0] || null) : null;
    }
    return byGame;
}

/* ═════════════════════════════════════════════════════════════════════════════
   NEEDS YOUR ATTENTION (roster triage) and the reteach signal
   ═════════════════════════════════════════════════════════════════════════════ */

/* Where each student is stalled, per module: not completed, past the start, and therefore
   sitting on a specific step. Keyed moduleId -> stepIndex -> [uid].

   This is what turns one student's problem into a class signal. "Two other students stalled
   at the same point" is the single most useful line on the student page, and it is only
   computable across the whole roster, so it is derived once here rather than per student.

   stepIndex is maxStep - 1: maxStep is a 1-based "furthest step reached", so a student on
   maxStep 4 is sitting on step index 3. Students with maxStep 0 are not stalled at a step,
   they have not started — a different problem, and lumping them in would report a phantom
   cohort at step 0. */
export function stallPoints(students = [], assigned = []) {
    const byModule = {};
    for (const id of assigned) {
        const steps = {};
        for (const s of students) {
            const m = s.modules && s.modules[id];
            if (!m || m.completed || !(m.maxStep > 0)) continue;
            const step = m.maxStep - 1;
            (steps[step] = steps[step] || []).push(s.uid);
        }
        byModule[id] = steps;
    }
    return byModule;
}

/* How many OTHER students are stalled on the same step as `uid`. Zero means the signal is
   not shown at all — "nobody else is stuck here" is not a reteach cue, and the mockup's
   promise is that the line appears only when it is true. */
export function othersStalledAt(stalls, moduleId, step, uid) {
    const at = (stalls[moduleId] || {})[step] || [];
    return at.filter((u) => u !== uid).length;
}

/* The module a student is most plausibly stuck on: the assigned one they have started and
   not finished, furthest along first (that is the one they were last working in), and among
   equals the one they have opened most. Returns null when nothing is started-but-unfinished
   — a student who has opened nothing is not "stuck on" anything in particular. */
export function stuckModule(student, assigned = []) {
    const candidates = assigned
        .map((id) => student.modules && student.modules[id])
        .filter((m) => m && !m.completed && m.maxStep > 0);
    if (!candidates.length) return null;
    return candidates.sort((a, b) => (b.maxStep - a.maxStep) || ((b.opens || 0) - (a.opens || 0)))[0];
}

/* The Needs-your-attention rows, ordered by urgency.

   Deliberately built on the SAME signals the detail banner already used — deriveStatus's
   at-risk / needs-attention and allDone — rather than a second set of thresholds. There is
   exactly one definition of "at risk" in this file and both surfaces read it, so the roster
   and the student page can never disagree about who needs a check-in.

   Each row carries the specific FACT and the ACTION, per the mockup: a bare severity is what
   the old top-bar tile already gave, and a teacher cannot do anything with "3 need
   attention". `action` is a hint for the UI, never copy.

   Students who are fine produce no row at all — this list is meant to be short, and
   frequently empty. */
export function attentionList(students = [], assigned = [], now = Date.now()) {
    const rows = [];
    for (const s of students) {
        const stuck = stuckModule(s, assigned);
        if (s.status === 'at-risk') {
            rows.push({
                uid: s.uid, name: s.name, severity: 'at-risk', action: 'open',
                fact: s.lastActive
                    ? { kind: 'silent', days: Math.floor((now - s.lastActive) / DAY), started: !!stuck, moduleName: stuck ? stuck.meta.name : null }
                    : { kind: 'never-started' },
            });
        } else if (s.status === 'needs-attention') {
            rows.push({
                uid: s.uid, name: s.name, severity: 'needs-attention', action: 'open',
                fact: stuck
                    ? { kind: 'stalled', moduleName: stuck.meta.name, step: stuck.maxStep, stepsTotal: stuck.meta.stepsTotal, opens: stuck.opens || 0 }
                    : { kind: 'slowing', days: s.lastActive ? Math.floor((now - s.lastActive) / DAY) : null },
            });
        } else if (s.allDone) {
            // Not a problem, but it IS an action: a student with nothing left to do is a
            // student who stops showing up. Ranked last because it can wait until the two
            // above are handled.
            rows.push({
                uid: s.uid, name: s.name, severity: 'all-done', action: 'assign-more',
                fact: { kind: 'all-complete', count: assigned.filter((id) => s.modules[id]).length },
            });
        }
    }
    const rank = { 'at-risk': 0, 'needs-attention': 1, 'all-done': 2 };
    return rows.sort((a, b) => rank[a.severity] - rank[b.severity] || a.name.localeCompare(b.name));
}

/* ═════════════════════════════════════════════════════════════════════════════
   PER-STEP TIMING
   ═════════════════════════════════════════════════════════════════════════════ */

/* A visit longer than this is treated as having ended: nothing is claimed about the gap that
   spans it. Telemetry records activeMs and lastSeenAt per visit but never a per-step
   duration, so the only honest source for "how long did this step take" is the gap between
   consecutive graded answers — and that gap is only a duration if the student was actually
   at the screen for it. Half an hour between two answers is far more likely a closed laptop
   than thirty minutes of thinking. */
export const STEP_GAP_CEILING_MS = 30 * 60 * 1000;

/* Per-step elapsed time for one module, keyed by step index.

   A step's time is the interval from the previous graded answer to this one; the first
   answered step is measured from the start of the visit it happened in. A step is reported
   ONLY when both ends of that interval fall inside the same visit and the gap is under the
   ceiling above. Anything else is omitted rather than estimated, which is why the return is
   sparse: a missing key means "not knowable", and the UI shows nothing rather than a number
   it cannot stand behind.

   This is an approximation and the UI must label it as one ("between answers"), not as time
   on task. It is still worth showing: the step a student spent eleven minutes on is the step
   that lost them, and no other field in the data says so. */
export function perStepTiming(module) {
    const out = {};
    if (!module || !module.attempts) return out;

    // Visit windows, from the module's own sessions. startedAt..lastSeenAt bounds one visit.
    const visits = (module.sessions || [])
        .map((s) => ({ from: toMillis(s.startedAt), to: Math.max(toMillis(s.lastSeenAt), toMillis(s.startedAt)) }))
        .filter((v) => v.from > 0)
        .sort((a, b) => a.from - b.from);
    const visitOf = (ms) => visits.find((v) => ms >= v.from && ms <= v.to) || null;

    // Every graded answer, in the order it was actually given.
    const answered = Object.keys(module.attempts)
        .map((k) => Number(k))
        .map((step) => {
            const rows = module.attempts[step] || [];
            // The LAST attempt at a step is when the student left it — a revised answer means
            // they were still working on that step until the revision.
            const ts = Math.max(0, ...rows.map((a) => toMillis(a.timestamp)));
            return { step, ts };
        })
        .filter((a) => a.ts > 0)
        .sort((a, b) => a.ts - b.ts);

    let prev = null;
    for (const a of answered) {
        const visit = visitOf(a.ts);
        const from = prev && visitOf(prev.ts) === visit ? prev.ts : (visit ? visit.from : 0);
        prev = a;
        if (!visit || !from || a.ts <= from) continue;
        const gap = a.ts - from;
        if (gap > STEP_GAP_CEILING_MS) continue;
        out[a.step] = gap;
    }
    return out;
}

/* ═════════════════════════════════════════════════════════════════════════════
   PER-STUDENT EXTRAS

   A Task Force has one class-wide assigned set (classrooms/{code}.assignedModules
   and .assignedGames). On top of that, a teacher can give ONE named student extra
   work — the "Jamal also gets Money as a Skill because he's stuck" case — stored
   per student in classroom_assignments/{code}_{uid} (firestore.rules #6c).

   ADDITIVE, NOT A REPLACEMENT, and that is the load-bearing choice. If each
   student's set were wholly their own, the roster grid would lose its shared
   columns (every student a different set of modules), classAverage would be
   averaging students who were set different work, and changing what the class
   does would mean rewriting N documents instead of one. Extras keep the class
   set as the spine and let individuals hang off it.
   ═════════════════════════════════════════════════════════════════════════════ */

/* One student's effective assignment: the class set, then anything extra given to
   them, deduped, class set first.

   Order matters and is not cosmetic. The class set leads so a student's roster row
   lines up column-for-column with everyone else's, and their extras appear after —
   the same reading order as the roster grid itself. A duplicate (a teacher assigns
   an extra that later becomes class-wide) collapses to one entry rather than being
   counted twice in "3 of 5 complete". */
export function effectiveAssignment({ classModules = [], classGames = [], extras = null } = {}) {
    const merge = (base, extra) => {
        const out = [...base];
        for (const id of (extra || [])) if (!out.includes(id)) out.push(id);
        return out;
    };
    return {
        modules: merge(classModules, extras && extras.modules),
        games: merge(classGames, extras && extras.games),
        // What this student has that the class does not — the UI marks these, and the
        // student-detail page needs to tell an extra apart from class work to explain it.
        extraModules: (extras && extras.modules ? extras.modules : []).filter((id) => !classModules.includes(id)),
        extraGames: (extras && extras.games ? extras.games : []).filter((id) => !classGames.includes(id)),
    };
}

/* Every module id anyone in the Task Force is working on: the class set plus the union
   of all extras, class set first.

   This is what the roster-wide functions take. stallPoints() and attentionList() both
   index into a student's OWN s.modules, which buildStudent only populates for that
   student's own effective assignment — so passing the union is correct and self-filtering:
   a student who was never given a module simply has no entry for it and is skipped,
   rather than being counted as "not started" on work that was never theirs. */
export function unionAssigned(classModules = [], extrasByUid = {}) {
    const out = [...classModules];
    for (const extras of Object.values(extrasByUid || {})) {
        for (const id of (extras && extras.modules ? extras.modules : [])) {
            if (!out.includes(id)) out.push(id);
        }
    }
    return out;
}

/* Is this module/game an extra for anyone at all? Used to decide whether a roster column
   or CSV column needs the "not assigned to this student" state at all — with no extras
   anywhere, every column applies to everyone and the export stays exactly as it was. */
export function hasAnyExtras(extrasByUid = {}) {
    return Object.values(extrasByUid || {}).some(
        (e) => e && ((e.modules && e.modules.length) || (e.games && e.games.length)),
    );
}

/* Normalises one classroom_assignments document into the shape everything above expects.
   A missing document, a document with neither array, or a malformed one all collapse to
   null rather than a half-populated object — a student with no extras and a student whose
   extras failed to load must not be distinguishable by accident. */
export function extrasFromDoc(docData) {
    if (!docData || typeof docData !== 'object') return null;
    const modules = Array.isArray(docData.modules) ? docData.modules.filter((x) => typeof x === 'string') : [];
    const games = Array.isArray(docData.games) ? docData.games.filter((x) => typeof x === 'string') : [];
    if (!modules.length && !games.length) return null;
    return { modules, games };
}
