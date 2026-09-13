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
export function buildStudent({ row, assigned, moduleData, scores = [], attempts = [], progress = {}, sessions = [] }, now = Date.now()) {
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
        };
    }

    const ids = assigned.filter((id) => modules[id]);
    const started = ids.some((id) => modules[id].maxStep > 0);
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

/* One row per game this student has ever played, best-scoring session first read off
   correct/scenariosPlayed (every game's schema carries both), most-recently-played last
   read off playedAt. A game never played is simply absent — there is no "not started"
   state to show for something with no assignment to be behind on. */
export function summarizeGameSessions(sessions) {
    const byGame = {};
    for (const s of sessions) {
        const meta = GAME_REGISTRY[s.game];
        if (!meta) continue;
        const pct = (typeof s.scenariosPlayed === 'number' && s.scenariosPlayed > 0 && typeof s.correct === 'number')
            ? Math.round((s.correct / s.scenariosPlayed) * 100)
            : null;
        const playedAtMs = toMillis(s.playedAt);
        const g = byGame[s.game] || { id: s.game, meta, plays: 0, bestPct: null, lastPlayed: 0 };
        g.plays += 1;
        if (pct != null) g.bestPct = g.bestPct == null ? pct : Math.max(g.bestPct, pct);
        if (playedAtMs > g.lastPlayed) g.lastPlayed = playedAtMs;
        byGame[s.game] = g;
    }
    return Object.values(byGame).sort((a, b) => b.lastPlayed - a.lastPlayed);
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
