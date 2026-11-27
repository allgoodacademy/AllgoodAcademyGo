// Unit tests for Mission Control's shaping layer (public/mission-control/derive.js).
//
// These cover the mistakes that are invisible on the page but wrong on a teacher's screen:
// a 1-based scenarioIndex read as 0-based, a lab's highestUnlocked read as a step count, a
// student's real position taken from whichever source answered first rather than the highest,
// and a status that quietly leaves someone who never started looking fine.
//
// Run with: node --test tests/mission-control.test.mjs   (or `npm run test:mission-control`)
import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DAY, toMillis, relativeTime, initialsOf, stepFromProgress, bestScore,
    attemptsByStep, deriveStatus, buildStudent, classAverage, countActiveThisWeek, choiceTextFor,
    gameSessionsFromTelemetry, summarizeGameSessions,
    buildCatalog, assignmentSummary, packLabel, packForGame, routingTargetsFor, formatList,
    classGameStats, WEAK_SKILL_MIN_PLAYERS,
    stallPoints, othersStalledAt, stuckModule, attentionList,
    perStepTiming, STEP_GAP_CEILING_MS,
    MODULE_MINUTES, GAME_MINUTES,
    effectiveAssignment, unionAssigned, hasAnyExtras, extrasFromDoc,
    choiceTag, choicesFor, drillLesson, drillChallenge, drillGame, drillSim, simProgress,
    worthFiveMinutes, checkInReason, capRoster, activeMsThisWeek, choiceLevelRows,
} from '../public/mission-control/derive.js';
import { readFileSync } from 'node:fs';
import { MODULE_DATA } from '../public/mission-control/module-data.js';

const NOW = Date.parse('2026-03-10T12:00:00Z');
const daysAgo = (n) => NOW - n * DAY;

test('toMillis normalises every timestamp shape Firestore can hand back', () => {
    assert.equal(toMillis(null), 0);
    assert.equal(toMillis(undefined), 0);
    assert.equal(toMillis({ toMillis: () => 1234 }), 1234);
    assert.equal(toMillis({ seconds: 2 }), 2000);
    assert.equal(toMillis(new Date(5000)), 5000);
    assert.equal(toMillis(7000), 7000);
    assert.equal(toMillis('2026-03-10T12:00:00Z'), NOW);
    // An unparseable value must become 0, not NaN: NaN poisons the Math.max() that
    // computes "last active" and would blank the figure for the whole row.
    assert.equal(toMillis('not a date'), 0);
    assert.equal(toMillis(NaN), 0);
});

test('relativeTime reads the way a teacher expects', () => {
    assert.equal(relativeTime(0, NOW), 'never');
    assert.equal(relativeTime(NOW - 30 * 1000, NOW), 'just now');
    assert.equal(relativeTime(NOW - 5 * 60 * 1000, NOW), '5 min ago');
    assert.equal(relativeTime(NOW - 60 * 60 * 1000, NOW), '1 hour ago');
    assert.equal(relativeTime(daysAgo(1), NOW), 'yesterday');
    assert.equal(relativeTime(daysAgo(5), NOW), '5 days ago');
});

test('initialsOf handles one word, many words and nothing at all', () => {
    assert.equal(initialsOf('Zara Okoye'), 'ZO');
    assert.equal(initialsOf('Theo'), 'T');
    assert.equal(initialsOf('Ana Maria Diallo Santos'), 'AM');
    assert.equal(initialsOf(''), '?');
    assert.equal(initialsOf(null), '?');
});

test('stepFromProgress reads a lab and the Challenge by their own conventions', () => {
    // highestUnlocked is 0-indexed: 0 means Case 1 is merely open, so the step is 1.
    assert.equal(stepFromProgress({ highestUnlocked: 0 }), 1);
    assert.equal(stepFromProgress({ highestUnlocked: 3 }), 4);
    // The Challenge counts answered scenarios instead.
    assert.equal(stepFromProgress({ answeredScenarioScores: { 1: 3, 2: 0, 3: 1 } }), 3);
    assert.equal(stepFromProgress(null), 0);
    assert.equal(stepFromProgress({}), 0);
});

test('bestScore prefers percentage and stays null for labs, which write no score', () => {
    assert.equal(bestScore([]), null);
    assert.equal(bestScore([{ completed: true }]), null, 'a lab completion must not read as 0%');
    assert.equal(bestScore([{ finalScore: 72 }, { percentage: 88 }]), 88);
    assert.equal(bestScore([{ finalScore: 0 }]), null, 'an abandoned run is not a score of 0');
});

test('attemptsByStep normalises the Challenge (1-based) and labs (0-based) to the same rows', () => {
    const ddc = MODULE_DATA.ddc;
    const si = MODULE_DATA['social-intelligence'];
    assert.equal(ddc.indexBase, 1);
    assert.equal(si.indexBase, 0);

    // Challenge scenario 1 is step index 0, and its LAST scenario is step index
    // stepsTotal - 1. Read off the module's own step count rather than written as a literal:
    // this assertion used to hardcode scenario 30 / step 29, and went stale — and started
    // throwing rather than failing cleanly — when the Challenge was cut to 28 scenarios.
    const lastScenario = ddc.stepsTotal;            // 1-based, so the last index IS the total
    const a = attemptsByStep(ddc, [{ scenarioIndex: 1, choiceIndex: 2 }, { scenarioIndex: lastScenario, choiceIndex: 0 }]);
    assert.equal(a[0].length, 1);
    assert.equal(a[ddc.stepsTotal - 1].length, 1);
    assert.equal(a[1], undefined);

    // One past the end is dropped, not folded onto the last step.
    assert.deepEqual(attemptsByStep(ddc, [{ scenarioIndex: lastScenario + 1 }]), {});

    // Lab Case 2 is written as scenarioIndex 1 and is step index 1.
    const b = attemptsByStep(si, [{ scenarioIndex: 1, choiceIndex: 2 }]);
    assert.equal(b[1].length, 1);
    assert.equal(b[0], undefined);

    // Out-of-range and non-numeric indexes are dropped rather than rendered somewhere wrong.
    const c = attemptsByStep(si, [{ scenarioIndex: 99 }, { scenarioIndex: -3 }, { scenarioIndex: 'x' }, {}]);
    assert.deepEqual(c, {});
});

test('attemptsByStep keeps multi-item Cases together, oldest first', () => {
    const ps = MODULE_DATA['privacy-security'];
    const rows = [
        { scenarioIndex: 1, choiceIndex: 1, timestamp: 300 },
        { scenarioIndex: 1, choiceIndex: 0, timestamp: 100 },
        { scenarioIndex: 1, choiceIndex: 0, timestamp: 200 },
    ];
    const out = attemptsByStep(ps, rows);
    assert.equal(out[1].length, 3, 'the Scam Sort grades five messages under one Case');
    assert.deepEqual(out[1].map((r) => r.timestamp), [100, 200, 300]);
});

test('deriveStatus applies the brief’s thresholds, at-risk first', () => {
    assert.equal(deriveStatus({ lastActive: daysAgo(1), started: true, allDone: false }, NOW), 'on-track');
    assert.equal(deriveStatus({ lastActive: daysAgo(5), started: true, allDone: false }, NOW), 'needs-attention');
    assert.equal(deriveStatus({ lastActive: daysAgo(9), started: true, allDone: false }, NOW), 'at-risk');
    // Finished trumps silence: there is nothing left for them to be behind on.
    assert.equal(deriveStatus({ lastActive: daysAgo(30), started: true, allDone: true }, NOW), 'on-track');
    // Never started, never seen — the roster entry a teacher most easily loses.
    assert.equal(deriveStatus({ lastActive: 0, started: false, allDone: false }, NOW), 'at-risk');
});

/* ── buildStudent ─────────────────────────────────────────────────────────── */
const assigned = ['ddc', 'social-intelligence'];
const base = { row: { uid: 'u1', displayName: 'Zara Okoye' }, assigned, moduleData: MODULE_DATA };

test('buildStudent takes the highest step any source can prove', () => {
    // sessions say Case 2, module_progress says Case 5 was cleared (highestUnlocked 4).
    // Reading the lower one would send a teacher chasing a student who is not behind.
    const s = buildStudent({
        ...base,
        sessions: [{ module: 'social-intelligence', maxStep: 2, activeMs: 60000, lastSeenAt: daysAgo(1) }],
        progress: { 'social-intelligence': { highestUnlocked: 4, lastUpdated: daysAgo(1) } },
    }, NOW);
    assert.equal(s.modules['social-intelligence'].maxStep, 5);
});

test('buildStudent still reports progress when sessions cannot be read', () => {
    // The degraded path: firestore.rules #10 is admin-only today, so a teacher sees no
    // sessions at all. Everything except time on task must still be right.
    const s = buildStudent({
        ...base,
        sessions: [],
        progress: { 'social-intelligence': { highestUnlocked: 3, lastUpdated: daysAgo(2) } },
    }, NOW);
    assert.equal(s.modules['social-intelligence'].maxStep, 4);
    assert.equal(s.modules['social-intelligence'].activeMs, 0);
    assert.equal(s.status, 'on-track');
    assert.equal(s.lastActive, daysAgo(2));
});

test('buildStudent marks a completed module full even if no step was ever recorded', () => {
    const s = buildStudent({
        ...base,
        scores: [{ gameName: 'Social Intelligence', completed: true, lastUpdated: daysAgo(1) }],
    }, NOW);
    const m = s.modules['social-intelligence'];
    assert.equal(m.completed, true);
    assert.equal(m.maxStep, m.meta.stepsTotal);
    assert.equal(m.pct, 100);
});

test('buildStudent never lets a step run past the module length', () => {
    const s = buildStudent({
        ...base,
        sessions: [{ module: 'social-intelligence', maxStep: 999 }],
    }, NOW);
    assert.equal(s.modules['social-intelligence'].maxStep, MODULE_DATA['social-intelligence'].stepsTotal);
    assert.equal(s.modules['social-intelligence'].pct, 100);
});

test('buildStudent routes each module’s documents by gameName, not by position', () => {
    const s = buildStudent({
        ...base,
        scores: [
            { gameName: 'Digital Decisions Challenge', percentage: 88, completed: true, lastUpdated: daysAgo(1) },
            { gameName: 'Social Intelligence', completed: false, lastUpdated: daysAgo(1) },
        ],
        attempts: [
            { gameName: 'Digital Decisions Challenge', scenarioIndex: 1, choiceIndex: 2, score: 3 },
            { gameName: 'Social Intelligence', scenarioIndex: 1, choiceIndex: 0, score: 0 },
        ],
    }, NOW);
    assert.equal(s.modules.ddc.score, 88);
    assert.equal(s.modules['social-intelligence'].score, null);
    assert.equal(s.modules.ddc.attempts[0][0].choiceIndex, 2);
    assert.equal(s.modules['social-intelligence'].attempts[1][0].choiceIndex, 0);
    assert.equal(s.modules.ddc.attempts[1], undefined, 'a lab attempt must not land in the Challenge');
});

test('buildStudent aggregates the overall figures across assigned modules only', () => {
    const s = buildStudent({
        ...base,
        scores: [
            { gameName: 'Digital Decisions Challenge', completed: true, percentage: 90, lastUpdated: daysAgo(1) },
            // A module the classroom has NOT assigned must not count toward completion.
            { gameName: 'Privacy & Security', completed: true, lastUpdated: daysAgo(1) },
        ],
    }, NOW);
    assert.equal(s.completedCount, 1);
    assert.equal(s.allDone, false);
    assert.equal(Object.keys(s.modules).length, 2);
});

test('overall completion weights each assigned module equally, not by step count', () => {
    // The Challenge is 30 scenarios and Social Intelligence is 7 Cases. Finishing the lab
    // outright and not opening the Challenge is half the assigned work, not 19% of it.
    const s = buildStudent({
        ...base,
        scores: [{ gameName: 'Social Intelligence', completed: true, lastUpdated: daysAgo(1) }],
    }, NOW);
    assert.equal(s.modules['social-intelligence'].pct, 100);
    assert.equal(s.modules.ddc.pct, 0);
    assert.equal(s.pct, 50);
});

test('buildStudent handles a student with no records at all', () => {
    const s = buildStudent(base, NOW);
    assert.equal(s.pct, 0);
    assert.equal(s.lastActive, 0);
    assert.equal(s.completedCount, 0);
    assert.equal(s.status, 'at-risk');
    assert.equal(s.name, 'Zara Okoye');
});

test('buildStudent falls back to a neutral name rather than showing nothing', () => {
    const s = buildStudent({ ...base, row: { uid: 'u2' } }, NOW);
    assert.equal(s.name, 'Agent Learner');
    assert.equal(s.initials, 'AL');
});

test('classAverage covers only scored modules and returns null when there are none', () => {
    const a = buildStudent({ ...base, scores: [{ gameName: 'Digital Decisions Challenge', percentage: 80, lastUpdated: NOW }] }, NOW);
    const b = buildStudent({ ...base, row: { uid: 'u3', displayName: 'B B' }, scores: [{ gameName: 'Digital Decisions Challenge', percentage: 90, lastUpdated: NOW }] }, NOW);
    assert.equal(classAverage([a, b], assigned), 85);
    assert.equal(classAverage([buildStudent(base, NOW)], assigned), null);
    assert.equal(classAverage([], assigned), null);
});

test('countActiveThisWeek uses a seven-day window', () => {
    const mk = (uid, d) => buildStudent({
        ...base, row: { uid, displayName: 'A B' },
        progress: { 'social-intelligence': { highestUnlocked: 1, lastUpdated: daysAgo(d) } },
    }, NOW);
    assert.equal(countActiveThisWeek([mk('a', 1), mk('b', 6), mk('c', 8)], NOW), 2);
});

/* ── choice text ──────────────────────────────────────────────────────────── */
test('choiceTextFor returns the real wording from the module that owns it', () => {
    const step = MODULE_DATA.ddc.steps[0];
    assert.equal(choiceTextFor(step, { choiceIndex: 0 }), step.choices[0].text);
    assert.match(step.choices[0].text, /\S/);
});

test('choiceTextFor says so plainly rather than guessing when an index no longer exists', () => {
    const step = MODULE_DATA['social-intelligence'].steps[1];
    assert.match(choiceTextFor(step, { choiceIndex: 99 }), /no longer in this module/);
    assert.equal(choiceTextFor(step, {}), 'No choice recorded');
    // An ungraded Case (the intro montage) carries no options at all.
    assert.equal(MODULE_DATA['social-intelligence'].steps[0].choices, null);
    assert.match(choiceTextFor(MODULE_DATA['social-intelligence'].steps[0], { choiceIndex: 0 }), /no longer in this module/);
});

/* ── the generated data itself ────────────────────────────────────────────── */
test('every module’s generated data lines up with the module it came from', () => {
    for (const [id, m] of Object.entries(MODULE_DATA)) {
        assert.equal(m.steps.length, m.stepsTotal, `${id}: step count`);
        assert.ok(m.gameNames.length > 0, `${id}: gameNames`);
        assert.ok([0, 1].includes(m.indexBase), `${id}: indexBase`);
        for (const step of m.steps) {
            assert.ok(typeof step.title === 'string' && step.title.length, `${id}: every step needs a title`);
            if (step.choices) {
                assert.ok(step.choices.length > 0, `${id}: a graded step needs options`);
                for (const c of step.choices) assert.ok(typeof c.text === 'string' && c.text.length, `${id}: option text`);
            }
        }
    }
});

test('every lab Case wired with Telemetry.choice has choice text to render it with', () => {
    // Each of these is a (module, case) the labs now commit — if a CASE_CHOICES entry were
    // missing or nulled, the teacher would see "no longer in this module" for a live answer.
    const wired = {
        'social-intelligence': [1, 2, 3, 4, 5],
        'privacy-security': [1, 2, 3, 4],
        'professional-brand': [1, 2, 3, 4, 5],
        'digital-citizenship': [1, 2, 3, 4, 5],
    };
    for (const [id, cases] of Object.entries(wired)) {
        for (const i of cases) {
            const step = MODULE_DATA[id].steps[i];
            assert.ok(step, `${id} step ${i} exists`);
            assert.ok(step.choices && step.choices.length, `${id} Case ${i + 1} commits a choice but has no CASE_CHOICES entry`);
        }
    }
});


// --- the four standalone games, after they moved onto the shared telemetry pipe.
// They used to write their own documents to a root-level game_sessions collection; they now
// write ordinary telemetry session documents with a `summary` map. gameSessionsFromTelemetry
// is the whole of the difference, so everything Mission Control shows per game depends on it
// getting exactly these cases right.
const gameSession = (over = {}) => ({
    module: 'read-the-signal', sessionId: 'rts_1', startedAt: 100, lastSeenAt: 500,
    summary: { game: 'read-the-signal', scenariosPlayed: 10, correct: 7, categories: { phishing: { played: 5, correct: 2 } } },
    ...over,
});

test('a game session document is flattened into the shape the summary code consumes', () => {
    const [g] = gameSessionsFromTelemetry([gameSession()]);
    assert.equal(g.game, 'read-the-signal');
    assert.equal(g.id, 'rts_1');
    assert.equal(g.scenariosPlayed, 10);
    assert.equal(g.correct, 7);
    assert.equal(g.playedAt, 500, 'lastSeenAt is the closest thing to the old playedAt');
    assert.deepEqual(g.categories, { phishing: { played: 5, correct: 2 } });
    assert.equal(g.clickedDeeperLink, false);
});

test('a GoodBlock session is not a game session', () => {
    // Every module writes to the same collection now, so the filter is the only thing
    // keeping labs out of the games strip — and a lab has no summary to misread either.
    const out = gameSessionsFromTelemetry([
        { module: 'social-intelligence', sessionId: 'si_1', lastSeenAt: 5, activeMs: 900 },
        { module: 'ddc', sessionId: 'ddc_1', lastSeenAt: 6 },
    ]);
    assert.deepEqual(out, []);
});

test('a round still in progress is not counted as a play', () => {
    // complete() is what attaches the summary. Until then there are no numbers to show, and
    // counting it would inflate `plays` every time a student opened a game and wandered off.
    const out = gameSessionsFromTelemetry([
        gameSession({ summary: undefined }),
        gameSession({ sessionId: 'rts_2', summary: {} }),
    ]);
    assert.deepEqual(out, []);
});

test('startedAt stands in when a session was never flushed again', () => {
    const [g] = gameSessionsFromTelemetry([gameSession({ lastSeenAt: null })]);
    assert.equal(g.playedAt, 100);
});

test('the deeper-link click survives the move onto the session document', () => {
    // It used to be its own field on a game_sessions doc with its own update rule; it is
    // now part of the summary, written through Telemetry.summary().
    const [g] = gameSessionsFromTelemetry([gameSession({ summary: { ...gameSession().summary, clickedDeeperLink: true } })]);
    assert.equal(g.clickedDeeperLink, true);
});

test('two rounds in one tab are two plays, and the best one is the best score', () => {
    // Telemetry.restart() gives each replay its own session document precisely so this
    // holds; before it, a second round would have overwritten the first one's numbers.
    const rows = summarizeGameSessions(gameSessionsFromTelemetry([
        gameSession({ sessionId: 'rts_1', lastSeenAt: 500, summary: { scenariosPlayed: 10, correct: 4, categories: { phishing: { played: 6, correct: 1 } } } }),
        gameSession({ sessionId: 'rts_2', lastSeenAt: 900, summary: { scenariosPlayed: 10, correct: 9, categories: { phishing: { played: 4, correct: 4 }, social: { played: 6, correct: 5 } } } }),
    ]));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].plays, 2);
    assert.equal(rows[0].bestPct, 90);
    assert.equal(rows[0].lastPlayed, 900);
    assert.equal(rows[0].weakestCategory.name, 'phishing', 'summed across both rounds: 5 of 10');
});

/* ═════════════════════════════════════════════════════════════════════════════
   THE ASSIGNMENT CATALOG — Mission Control's picker is registry-driven

   The point of these: adding a GoodBlock to /data/modules-registry.json must make it
   assignable with no code change anywhere. The tests below run against the REAL registry
   file, not a fixture, so a registry entry that the catalog silently drops fails here.
   ═════════════════════════════════════════════════════════════════════════════ */
const REGISTRY = JSON.parse(readFileSync(new URL('../public/data/modules-registry.json', import.meta.url), 'utf8'));

test('buildCatalog groups every live lab and Challenge in the real registry by pack', () => {
    const cat = buildCatalog(REGISTRY.modules);
    const fromCatalog = cat.packs.flatMap((p) => p.items.map((i) => i.id)).sort();
    const expected = REGISTRY.modules
        .filter((m) => !m.retired && (m.type === 'lab' || m.type === 'challenge'))
        .map((m) => m.id).sort();
    assert.deepEqual(fromCatalog, expected, 'every live lab/Challenge must reach the picker');
    // Three real Lab Packs today, named — not slugs in front of a teacher.
    const names = cat.packs.map((p) => p.name);
    assert.ok(names.includes('Digital Decisions'));
    assert.ok(names.includes('Real World Ready'));
    assert.ok(names.includes('Room to Think'));
});

test('a retired module stays out of the picker but keeps its registry entry', () => {
    const retired = REGISTRY.modules.filter((m) => m.retired).map((m) => m.id);
    assert.ok(retired.length > 0, 'fixture assumption: the registry still carries a retired entry');
    const cat = buildCatalog(REGISTRY.modules);
    const offered = [...cat.packs, ...cat.gamePacks].flatMap((p) => p.items.map((i) => i.id));
    for (const id of retired) assert.ok(!offered.includes(id), `${id} is retired and must not be assignable`);
});

test('a brand-new GoodBlock in the registry appears with NO change to the catalog code', () => {
    // This is the acceptance criterion for Ticket 2, asserted rather than demonstrated by
    // hand: the module below exists nowhere in this repo.
    const withNew = REGISTRY.modules.concat([{
        id: 'the-invented-block', name: 'The Invented Block', type: 'lab',
        pack: 'room-to-think', url: '/jsh/room-to-think-lab/the-invented-block/',
        blurb: 'A lesson that does not exist', durationMinutes: 25, skillTags: [], status: 'draft',
    }]);
    const cat = buildCatalog(withNew);
    const rtt = cat.packs.find((p) => p.slug === 'room-to-think');
    const found = rtt.items.find((i) => i.id === 'the-invented-block');
    assert.ok(found, 'a new registry entry must appear in its pack unprompted');
    assert.equal(found.name, 'The Invented Block');
    assert.equal(found.blurb, 'A lesson that does not exist');
    assert.equal(found.minutes, 25, "the registry's own durationMinutes wins over the fallback");
});

test('a module in an UNKNOWN pack still appears, under a readable name', () => {
    // A new Lab Pack must not need an edit to PACK_NAMES before its modules are assignable.
    const cat = buildCatalog(REGISTRY.modules.concat([{
        id: 'x1', name: 'X One', type: 'lab', pack: 'future-proof-lab', url: '/x/', skillTags: [],
    }]));
    const pack = cat.packs.find((p) => p.slug === 'future-proof-lab');
    assert.ok(pack, 'an unrecognised pack slug must still produce a group');
    assert.equal(pack.name, 'Future Proof Lab');
});

test('a Challenge renders inside its pack, last, marked as a capstone', () => {
    const cat = buildCatalog(REGISTRY.modules);
    for (const pack of cat.packs) {
        const caps = pack.items.filter((i) => i.isCapstone);
        for (const c of caps) {
            assert.equal(c.type, 'challenge');
            const idx = pack.items.indexOf(c);
            // Everything after a capstone must also be a capstone — i.e. capstones are last.
            assert.ok(pack.items.slice(idx).every((i) => i.isCapstone),
                `${c.id} must sort after the GoodBlocks it tests, in pack ${pack.slug}`);
        }
    }
    // The registry lists rwr-challenge BEFORE the Room to Think labs, so this ordering is
    // genuinely doing work and is not an accident of registry order.
    const rwr = cat.packs.find((p) => p.slug === 'real-world-ready');
    assert.equal(rwr.items[rwr.items.length - 1].id, 'rwr-challenge');
});

test('packLabel falls back to a title-cased slug and never shows a raw slug', () => {
    assert.equal(packLabel('digital-decisions'), 'Digital Decisions');
    assert.equal(packLabel('some_new-pack'), 'Some New Pack');
    assert.equal(packLabel(null), 'Standalone');
});

test('a game is grouped by the pack of the lab it routes into, not by a hardcoded map', () => {
    const live = REGISTRY.modules.filter((m) => !m.retired);
    const rts = live.find((m) => m.id === 'read-the-signal');
    assert.equal(rts.pack, null, 'fixture assumption: games carry no pack of their own');
    // Its defaultDestination is a Digital Decisions lab, so that is its pack for a teacher.
    assert.equal(packForGame(rts, live), 'digital-decisions');
    const mm = live.find((m) => m.id === 'money-moves');
    assert.equal(packForGame(mm, live), 'real-world-ready');

    const cat = buildCatalog(REGISTRY.modules);
    const gameIds = cat.gamePacks.flatMap((p) => p.items.map((i) => i.id)).sort();
    // `hidden` modules are dropped alongside `retired` — see buildCatalog(). They are live
    // and registered, but a teacher must not be able to assign them.
    assert.deepEqual(gameIds, live.filter((m) => m.type === 'game' && !m.hidden).map((m) => m.id).sort());
});

test('a hidden module is registered but appears nowhere a teacher can assign it', () => {
    // Pattern Lab is registered deliberately (so check-modules.js can validate it, and so a
    // future session does not read an unregistered live module as a bug and "fix" it by
    // surfacing it) and is equally deliberately absent from the Assign page. Absence by
    // omission would be untestable; absence by flag is this.
    const hidden = REGISTRY.modules.filter((m) => m.hidden && !m.retired);
    assert.ok(hidden.length, 'fixture assumption: the registry has at least one hidden module');

    const cat = buildCatalog(REGISTRY.modules);
    const assignableIds = new Set([
        ...cat.packs.flatMap((p) => p.items.map((i) => i.id)),
        ...cat.gamePacks.flatMap((p) => p.items.map((i) => i.id)),
    ]);
    for (const m of hidden) {
        assert.ok(!assignableIds.has(m.id), `hidden module "${m.id}" is assignable from Mission Control`);
    }

    // And it is the flag doing the work, not the entry happening to be malformed: clear the
    // flag on a copy and the same module becomes assignable again.
    const unhidden = REGISTRY.modules.map((m) => (m.hidden ? { ...m, hidden: false } : m));
    const catB = buildCatalog(unhidden);
    const idsB = new Set([
        ...catB.packs.flatMap((p) => p.items.map((i) => i.id)),
        ...catB.gamePacks.flatMap((p) => p.items.map((i) => i.id)),
    ]);
    for (const m of hidden) {
        assert.ok(idsB.has(m.id), `"${m.id}" stays out of the catalog with hidden:false — something other than the flag is excluding it, so the flag is not what is being tested`);
    }
});

test("a game's routing targets come from skillTags and the registry, not a hardcoded string", () => {
    const live = REGISTRY.modules.filter((m) => !m.retired);
    const rts = live.find((m) => m.id === 'read-the-signal');
    const targets = routingTargetsFor(rts, live);
    // Read the Signal's own categories are tagged onto real labs; those labs are the answer.
    assert.ok(targets.length >= 2, `expected several routing targets, got ${JSON.stringify(targets)}`);
    assert.ok(targets.includes('Privacy & Security'));
    // And the phrasing the Assign tab uses reads as a sentence.
    assert.match(formatList(targets), / or /);

    // Prove it is derived: retag a game and the targets move with it.
    const invented = { id: 'g9', name: 'G Nine', type: 'game', pack: null, url: '/g9/', skillTags: [{ framework: 'internal', code: 'money-decisions' }] };
    const moved = routingTargetsFor(invented, live);
    assert.notDeepEqual(moved, targets);
});

test('formatList joins one, two and many names the way a sentence would', () => {
    assert.equal(formatList([]), '');
    assert.equal(formatList(['A']), 'A');
    assert.equal(formatList(['A', 'B']), 'A or B');
    assert.equal(formatList(['A', 'B', 'C']), 'A, B or C');
});

test('assignmentSummary counts modules and games separately and totals real minutes', () => {
    const cat = buildCatalog(REGISTRY.modules);
    const empty = assignmentSummary({ modules: [], games: [], catalog: cat });
    assert.equal(empty.label, 'Nothing assigned yet');
    assert.equal(empty.minutes, 0);

    const four = ['social-intelligence', 'privacy-security', 'digital-citizenship', 'money-as-a-skill'];
    const s = assignmentSummary({ modules: four, games: ['read-the-signal'], catalog: cat });
    assert.equal(s.moduleCount, 4);
    assert.equal(s.gameCount, 1);
    // A game is ~8 minutes, not ~20 — the whole reason the two are counted apart.
    const expected = four.reduce((n, id) => {
        const e = REGISTRY.modules.find((m) => m.id === id);
        return n + (Number(e.durationMinutes) > 0 ? Number(e.durationMinutes) : MODULE_MINUTES);
    }, 0) + GAME_MINUTES;
    assert.equal(s.minutes, expected);
    assert.match(s.label, /^4 modules \+ 1 game assigned · about \d+ minutes of class time$/);
});

test('assignmentSummary ignores an assigned id that is no longer in the registry', () => {
    // A module removed from the registry must not crash the save bar or inflate its count.
    const cat = buildCatalog(REGISTRY.modules);
    const s = assignmentSummary({ modules: ['social-intelligence', 'a-module-that-was-deleted'], games: [], catalog: cat });
    assert.equal(s.moduleCount, 1);
});

test('one module reads "1 module", not "1 modules"', () => {
    const cat = buildCatalog(REGISTRY.modules);
    const s = assignmentSummary({ modules: ['privacy-security'], games: [], catalog: cat });
    assert.match(s.label, /^1 module assigned/);
    const g = assignmentSummary({ modules: [], games: ['money-moves'], catalog: cat });
    assert.match(g.label, /^1 game assigned · about 8 minutes/);
});

/* ═════════════════════════════════════════════════════════════════════════════
   CLASS-WIDE GAME RESULTS — the threshold is the point
   ═════════════════════════════════════════════════════════════════════════════ */
const gameRow = (id, cats, plays = 1) => ({
    id, meta: { name: id }, plays, bestPct: null, lastPlayed: 0,
    categoryTotals: cats, deeperLinkClicks: 0, sessions: [],
});

test('classGameStats pools accuracy across the class rather than averaging students', () => {
    const students = [
        { uid: 'a', games: [gameRow('read-the-signal', { permissions: { played: 40, correct: 20 } })] },
        { uid: 'b', games: [gameRow('read-the-signal', { permissions: { played: 4, correct: 4 } })] },
    ];
    const stats = classGameStats(students, { minPlayers: 1 });
    const g = stats.get('read-the-signal');
    assert.equal(g.players, 2);
    // Pooled: 24/44 = 55%. A per-student mean would be (50 + 100) / 2 = 75%, which would let
    // one four-scenario round outweigh a forty-scenario one.
    assert.equal(g.avgPct, 55);
});

test('a weakest-skill claim is WITHHELD below the player threshold, not guessed at', () => {
    const two = [
        { uid: 'a', games: [gameRow('money-moves', { 'long-term': { played: 5, correct: 1 } })] },
        { uid: 'b', games: [gameRow('money-moves', { 'long-term': { played: 5, correct: 1 } })] },
    ];
    const g = classGameStats(two).get('money-moves');
    assert.equal(g.players, 2);
    assert.equal(g.enoughPlayers, false);
    assert.equal(g.weakestCategory, null, 'two players must not name the class\'s weakest skill');
    // The number that IS supportable — how many played — is still reported.
    assert.equal(g.avgPct, 20);
});

test('...and is stated once enough different students have played', () => {
    const many = Array.from({ length: WEAK_SKILL_MIN_PLAYERS }, (_, i) => ({
        uid: `s${i}`,
        games: [gameRow('money-moves', {
            'long-term': { played: 4, correct: 1 },
            budgeting: { played: 4, correct: 4 },
        })],
    }));
    const g = classGameStats(many).get('money-moves');
    assert.equal(g.enoughPlayers, true);
    assert.equal(g.weakestCategory.name, 'long-term');
    assert.equal(g.weakestCategory.accuracy, 25);
});

test('players counts STUDENTS, not sessions — three rounds by one student is one player', () => {
    const one = [{ uid: 'a', games: [gameRow('the-rumor-mill', { accuracy: { played: 30, correct: 10 } }, 3)] }];
    const g = classGameStats(one, { minPlayers: 2 }).get('the-rumor-mill');
    assert.equal(g.players, 1);
    assert.equal(g.plays, 3);
    assert.equal(g.enoughPlayers, false, 'replaying alone must not clear a threshold about people');
});

test('a game nobody played is simply absent from the stats', () => {
    assert.equal(classGameStats([{ uid: 'a', games: [] }]).size, 0);
});

/* ═════════════════════════════════════════════════════════════════════════════
   STALL COHORTS and NEEDS-YOUR-ATTENTION
   ═════════════════════════════════════════════════════════════════════════════ */
const stu = (uid, name, mods, extra = {}) => ({
    uid, name, modules: mods, status: 'on-track', allDone: false, lastActive: NOW, games: [], ...extra,
});
const mod = (id, maxStep, completed = false, opens = 1, stepsTotal = 7) => ({
    id, meta: { name: id, stepsTotal }, maxStep, completed, opens, activeMs: 0, attempts: {}, sessions: [],
});

test('stallPoints groups students by the exact step they are sitting on', () => {
    const students = [
        stu('a', 'A', { 'money-as-a-skill': mod('money-as-a-skill', 4) }),
        stu('b', 'B', { 'money-as-a-skill': mod('money-as-a-skill', 4) }),
        stu('c', 'C', { 'money-as-a-skill': mod('money-as-a-skill', 6) }),
        stu('d', 'D', { 'money-as-a-skill': mod('money-as-a-skill', 7, true) }),
        stu('e', 'E', { 'money-as-a-skill': mod('money-as-a-skill', 0) }),
    ];
    const stalls = stallPoints(students, ['money-as-a-skill']);
    // maxStep 4 means sitting on step INDEX 3.
    assert.deepEqual(stalls['money-as-a-skill'][3], ['a', 'b']);
    assert.deepEqual(stalls['money-as-a-skill'][5], ['c']);
    // A finished student is not stalled, and a student who never started is not "stalled at
    // step 0" — that would report a phantom cohort.
    assert.equal(stalls['money-as-a-skill'][6], undefined);
    assert.equal(stalls['money-as-a-skill'][-1], undefined);
    assert.ok(!Object.values(stalls['money-as-a-skill']).some((l) => l.includes('d') || l.includes('e')));
});

test('othersStalledAt excludes the student being viewed, and returns 0 when alone', () => {
    const students = [
        stu('a', 'A', { m: mod('m', 4) }),
        stu('b', 'B', { m: mod('m', 4) }),
        stu('c', 'C', { m: mod('m', 4) }),
        stu('z', 'Z', { m: mod('m', 2) }),
    ];
    const stalls = stallPoints(students, ['m']);
    assert.equal(othersStalledAt(stalls, 'm', 3, 'a'), 2, 'the mockup\'s "two other students" line');
    assert.equal(othersStalledAt(stalls, 'm', 1, 'z'), 0, 'alone at a step means no reteach signal');
    // Never true for a module or step nobody is on.
    assert.equal(othersStalledAt(stalls, 'nope', 3, 'a'), 0);
    assert.equal(othersStalledAt(stalls, 'm', 99, 'a'), 0);
});

test('stuckModule picks the started-and-unfinished module they got furthest into', () => {
    const s = stu('a', 'A', {
        one: mod('one', 2, false, 1),
        two: mod('two', 5, false, 1),
        three: mod('three', 7, true),
        four: mod('four', 0),
    });
    assert.equal(stuckModule(s, ['one', 'two', 'three', 'four']).id, 'two');
    // Nothing started means nothing to be stuck on.
    assert.equal(stuckModule(stu('b', 'B', { four: mod('four', 0) }), ['four']), null);
});

test('...and breaks a tie toward the module they have opened most', () => {
    const s = stu('a', 'A', { one: mod('one', 4, false, 1), two: mod('two', 4, false, 3) });
    assert.equal(stuckModule(s, ['one', 'two']).id, 'two');
});

test('attentionList is EMPTY when nobody needs anything', () => {
    const fine = [stu('a', 'A', { m: mod('m', 3) })];
    assert.deepEqual(attentionList(fine, ['m'], NOW), []);
});

test('attentionList orders at-risk above needs-attention above ready-for-more', () => {
    const students = [
        stu('c', 'Cleared', { m: mod('m', 7, true) }, { allDone: true }),
        stu('b', 'Behind', { m: mod('m', 4, false, 3) }, { status: 'needs-attention', lastActive: daysAgo(5) }),
        stu('a', 'Absent', { m: mod('m', 0) }, { status: 'at-risk', lastActive: daysAgo(9) }),
    ];
    const rows = attentionList(students, ['m'], NOW);
    assert.deepEqual(rows.map((r) => r.severity), ['at-risk', 'needs-attention', 'all-done']);
});

test('an at-risk row states the specific fact — days silent, or never started at all', () => {
    const never = attentionList([stu('a', 'A', { m: mod('m', 0) }, { status: 'at-risk', lastActive: 0 })], ['m'], NOW);
    assert.equal(never[0].fact.kind, 'never-started');

    const silent = attentionList([stu('b', 'B', { m: mod('m', 3) }, { status: 'at-risk', lastActive: daysAgo(9) })], ['m'], NOW);
    assert.equal(silent[0].fact.kind, 'silent');
    assert.equal(silent[0].fact.days, 9);
    assert.equal(silent[0].fact.moduleName, 'm');
});

test('a needs-attention row names the module AND the step, per the mockup', () => {
    const rows = attentionList(
        [stu('b', 'B', { 'money-as-a-skill': mod('money-as-a-skill', 4, false, 3) }, { status: 'needs-attention', lastActive: daysAgo(5) })],
        ['money-as-a-skill'], NOW,
    );
    assert.equal(rows[0].fact.kind, 'stalled');
    assert.equal(rows[0].fact.moduleName, 'money-as-a-skill');
    assert.equal(rows[0].fact.step, 4);
    assert.equal(rows[0].fact.opens, 3, 'the "opened it 3 times" half of the sentence');
});

test('an all-done row offers assigning more, not a check-in', () => {
    const rows = attentionList([stu('c', 'C', { m: mod('m', 7, true) }, { allDone: true })], ['m'], NOW);
    assert.equal(rows[0].action, 'assign-more');
    assert.equal(rows[0].fact.count, 1);
});

test('attentionList reuses deriveStatus rather than inventing its own idle thresholds', () => {
    // A student exactly at the at-risk boundary must be triaged by the same constant the
    // roster dots and top-bar tiles use, so the two surfaces can never disagree.
    const built = buildStudent({
        row: { uid: 'x', displayName: 'Edge Case' },
        assigned: ['privacy-security'], moduleData: MODULE_DATA,
        progress: { 'privacy-security': { highestUnlocked: 2, lastUpdated: daysAgo(8) } },
    }, NOW);
    assert.equal(built.status, 'at-risk');
    const rows = attentionList([{ ...built, games: [] }], ['privacy-security'], NOW);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].severity, 'at-risk');
});

/* ═════════════════════════════════════════════════════════════════════════════
   PER-STEP TIMING — sparse on purpose
   ═════════════════════════════════════════════════════════════════════════════ */
const MIN = 60 * 1000;

test('perStepTiming measures each answer from the previous one inside the same visit', () => {
    const start = NOW;
    const m = {
        sessions: [{ startedAt: start, lastSeenAt: start + 20 * MIN }],
        attempts: {
            0: [{ timestamp: start + 2 * MIN }],
            1: [{ timestamp: start + 5 * MIN }],
            2: [{ timestamp: start + 6 * MIN }],
        },
    };
    const t = perStepTiming(m);
    assert.equal(t[0], 2 * MIN, 'the first answer is measured from the start of the visit');
    assert.equal(t[1], 3 * MIN);
    assert.equal(t[2], 1 * MIN);
});

test('a gap that spans two visits is OMITTED, not reported as thinking time', () => {
    const d1 = NOW;
    const d2 = NOW + 3 * DAY;
    const m = {
        sessions: [
            { startedAt: d1, lastSeenAt: d1 + 5 * MIN },
            { startedAt: d2, lastSeenAt: d2 + 5 * MIN },
        ],
        attempts: {
            0: [{ timestamp: d1 + 1 * MIN }],
            1: [{ timestamp: d2 + 2 * MIN }],
        },
    };
    const t = perStepTiming(m);
    assert.equal(t[0], 1 * MIN);
    // Step 1 is measured from its OWN visit's start, never from three days earlier.
    assert.equal(t[1], 2 * MIN);
});

test('a gap over the ceiling is omitted — a closed laptop is not 40 minutes of work', () => {
    const start = NOW;
    const m = {
        sessions: [{ startedAt: start, lastSeenAt: start + 3 * 60 * MIN }],
        attempts: {
            0: [{ timestamp: start + 1 * MIN }],
            1: [{ timestamp: start + 1 * MIN + STEP_GAP_CEILING_MS + MIN }],
        },
    };
    const t = perStepTiming(m);
    assert.equal(t[0], 1 * MIN);
    assert.equal(t[1], undefined, 'not knowable is absent, not estimated');
});

test('a revised answer extends its own step rather than starting the next one early', () => {
    const start = NOW;
    const m = {
        sessions: [{ startedAt: start, lastSeenAt: start + 20 * MIN }],
        attempts: {
            0: [{ timestamp: start + 1 * MIN }, { timestamp: start + 4 * MIN, replay: true }],
            1: [{ timestamp: start + 6 * MIN }],
        },
    };
    const t = perStepTiming(m);
    assert.equal(t[0], 4 * MIN, 'the student was still on step 0 until the revision');
    assert.equal(t[1], 2 * MIN);
});

test('perStepTiming returns nothing rather than guessing when there are no sessions', () => {
    assert.deepEqual(perStepTiming({ attempts: { 0: [{ timestamp: NOW }] }, sessions: [] }), {});
    assert.deepEqual(perStepTiming(null), {});
    assert.deepEqual(perStepTiming({}), {});
});

test('an attempt with no usable timestamp contributes no timing', () => {
    const m = {
        sessions: [{ startedAt: NOW, lastSeenAt: NOW + 10 * MIN }],
        attempts: { 0: [{ timestamp: null }], 1: [{ timestamp: NOW + 2 * MIN }] },
    };
    const t = perStepTiming(m);
    assert.equal(t[0], undefined);
    assert.equal(t[1], 2 * MIN);
});

/* ═════════════════════════════════════════════════════════════════════════════
   PER-STUDENT EXTRAS — additive on top of the class set, never a replacement
   ═════════════════════════════════════════════════════════════════════════════ */

test('with no extras, a student\'s assignment is exactly the class set', () => {
    const e = effectiveAssignment({ classModules: ['a', 'b'], classGames: ['g1'], extras: null });
    assert.deepEqual(e.modules, ['a', 'b']);
    assert.deepEqual(e.games, ['g1']);
    assert.deepEqual(e.extraModules, []);
    assert.deepEqual(e.extraGames, []);
});

test('extras append after the class set, so roster columns still line up', () => {
    const e = effectiveAssignment({
        classModules: ['a', 'b'], classGames: ['g1'],
        extras: { modules: ['z'], games: ['g2'] },
    });
    assert.deepEqual(e.modules, ['a', 'b', 'z'], 'class set leads, extra follows');
    assert.deepEqual(e.games, ['g1', 'g2']);
    assert.deepEqual(e.extraModules, ['z']);
    assert.deepEqual(e.extraGames, ['g2']);
});

test('an extra that is ALSO class-wide collapses to one entry, not two', () => {
    // A teacher gives one student a module early; it later becomes class-wide. Counting it
    // twice would make "3 of 4 complete" read wrong for exactly that student.
    const e = effectiveAssignment({
        classModules: ['a', 'b'], classGames: [],
        extras: { modules: ['b', 'c'], games: [] },
    });
    assert.deepEqual(e.modules, ['a', 'b', 'c']);
    assert.deepEqual(e.extraModules, ['c'], 'b is class work, not an extra, so it is not marked as one');
});

test('unionAssigned collects every module anyone is working on, class set first', () => {
    const union = unionAssigned(['a', 'b'], {
        s1: { modules: ['z'], games: [] },
        s2: { modules: ['y', 'a'], games: [] },
        s3: null,
    });
    assert.deepEqual(union, ['a', 'b', 'z', 'y']);
});

test('unionAssigned with no extras anywhere is just the class set', () => {
    assert.deepEqual(unionAssigned(['a', 'b'], {}), ['a', 'b']);
    assert.deepEqual(unionAssigned(['a', 'b'], { s1: null }), ['a', 'b']);
});

// This is the property that lets the roster-wide functions take the union safely.
test('the union is SELF-FILTERING: a student is never judged on work that was never theirs', () => {
    const NOWX = NOW;
    const classSet = ['privacy-security'];
    const extras = { jamal: { modules: ['social-intelligence'], games: [] } };
    const union = unionAssigned(classSet, extras);

    // `completed` comes from a game_scores document, not from module_progress — a lab writes
    // that flag only on completion, which is the whole reason buildStudent reads both.
    const done = (name) => [{ gameName: name, completed: true, lastUpdated: NOWX }];

    // Jamal has the class module plus his extra; Devon has only the class module.
    const jamal = buildStudent({
        row: { uid: 'jamal', displayName: 'Jamal W' },
        assigned: effectiveAssignment({ classModules: classSet, extras: extras.jamal }).modules,
        moduleData: MODULE_DATA,
        scores: done('Privacy & Security'),
        progress: {
            'privacy-security': { highestUnlocked: 5, lastUpdated: NOWX },
            'social-intelligence': { highestUnlocked: 1, lastUpdated: NOWX },
        },
    }, NOWX);
    const devon = buildStudent({
        row: { uid: 'devon', displayName: 'Devon A' },
        assigned: effectiveAssignment({ classModules: classSet, extras: null }).modules,
        moduleData: MODULE_DATA,
        scores: done('Privacy & Security'),
        progress: { 'privacy-security': { highestUnlocked: 5, lastUpdated: NOWX } },
    }, NOWX);

    assert.ok(jamal.modules['social-intelligence'], 'Jamal has his extra');
    assert.equal(devon.modules['social-intelligence'], undefined, 'Devon was never given it');

    // Passing the UNION to the roster-wide functions must not invent a stall for Devon on a
    // module he was never assigned.
    const stalls = stallPoints([jamal, devon], union);
    const siStalls = Object.values(stalls['social-intelligence'] || {}).flat();
    assert.deepEqual(siStalls, ['jamal'], 'only the student who actually has it can be stalled in it');

    // ...and Devon's "all done" is about HIS work, not Jamal's.
    assert.equal(devon.allDone, true, 'Devon finished everything he was assigned');
    assert.equal(jamal.allDone, false, 'Jamal has not finished his extra');
});

test('an extra changes that student\'s completion denominator, and nobody else\'s', () => {
    const classSet = ['privacy-security'];
    const withExtra = buildStudent({
        row: { uid: 'a', displayName: 'A' },
        assigned: effectiveAssignment({ classModules: classSet, extras: { modules: ['social-intelligence'] } }).modules,
        moduleData: MODULE_DATA,
        progress: { 'privacy-security': { highestUnlocked: 5, lastUpdated: NOW } },
    }, NOW);
    const without = buildStudent({
        row: { uid: 'b', displayName: 'B' },
        assigned: classSet,
        moduleData: MODULE_DATA,
        progress: { 'privacy-security': { highestUnlocked: 5, lastUpdated: NOW } },
    }, NOW);
    assert.equal(without.pct, 100, 'the class set alone is complete');
    assert.ok(withExtra.pct < 100, 'the extra is real work and counts against their own total');
});

test('hasAnyExtras is false until somebody actually has one', () => {
    assert.equal(hasAnyExtras({}), false);
    assert.equal(hasAnyExtras({ s1: null }), false);
    assert.equal(hasAnyExtras({ s1: { modules: [], games: [] } }), false);
    assert.equal(hasAnyExtras({ s1: { modules: ['z'], games: [] } }), true);
    assert.equal(hasAnyExtras({ s1: { modules: [], games: ['g'] } }), true);
});

test('extrasFromDoc collapses "no extras" and "malformed" to the same null', () => {
    // A student with no extras and a student whose extras failed to parse must not be
    // distinguishable by accident downstream.
    assert.equal(extrasFromDoc(null), null);
    assert.equal(extrasFromDoc(undefined), null);
    assert.equal(extrasFromDoc({}), null);
    assert.equal(extrasFromDoc({ modules: [], games: [] }), null);
    assert.equal(extrasFromDoc({ modules: 'not-a-list' }), null);
    assert.deepEqual(extrasFromDoc({ modules: ['a'], games: [] }), { modules: ['a'], games: [], sims: [] });
    // Non-string entries are dropped rather than carried into a document path.
    assert.deepEqual(extrasFromDoc({ modules: ['a', 7, null], games: ['g'] }), { modules: ['a'], games: ['g'], sims: [] });
    // Simulations (2026-11-25): optional, and enough on their own to count as extras.
    assert.deepEqual(extrasFromDoc({ modules: [], games: [], sims: ['snowball'] }), { modules: [], games: [], sims: ['snowball'] });
    assert.equal(extrasFromDoc({ modules: [], games: [], sims: [] }), null);
});

test('simulations are assignable: buildCatalog lists every registry sim with its stream and steps', () => {
    const cat = buildCatalog(REGISTRY.modules);
    // The Español stories ride in simPacks too, in their own group (tested below).
    const sims = cat.simPacks.flatMap((p) => p.items).filter((x) => x.kind !== 'story');
    assert.deepEqual(sims.map((x) => x.id).sort(), ['reasons-for-the-seasons', 'snowball', 'water-cycle', 'wolves-and-deer']);
    for (const x of sims) {
        assert.equal(x.type, 'sim');
        assert.ok(x.stream && x.eventPrefix && x.stepsTotal > 0, `${x.id} carries stream/prefix/steps`);
    }
    // ...and never leak into the module or game lists, whose consumers assume steps or a bank.
    const others = [...cat.packs, ...cat.gamePacks].flatMap((p) => p.items.map((i) => i.id));
    for (const x of sims) assert.ok(!others.includes(x.id));
});

test('effectiveAssignment merges class-wide and per-student simulations like games', () => {
    const e = effectiveAssignment({ classModules: [], classGames: [], classSims: ['water-cycle'], extras: { modules: [], games: [], sims: ['snowball', 'water-cycle'] } });
    assert.deepEqual(e.sims, ['water-cycle', 'snowball']);
    assert.deepEqual(e.extraSims, ['snowball']);
});

test('assignmentSummary counts simulations separately', () => {
    const cat = buildCatalog(REGISTRY.modules);
    const s = assignmentSummary({ modules: [], games: [], sims: ['snowball', 'water-cycle'], catalog: cat });
    assert.equal(s.simCount, 2);
    assert.match(s.label, /2 simulations/);
});

/* ═══ THE DRILL-DOWN (Mission Control Pro) ═══════════════════════════════════════════ */

// A student as the page holds one: buildStudent's shape plus events / sessions / games.
function drillStudent(uid, name, { moduleId, maxStep = 0, completed = false, events = null, attempts = {}, sessions = [], games = [] } = {}) {
    const modules = moduleId ? { [moduleId]: { id: moduleId, maxStep, completed, attempts } } : {};
    return { uid, name, modules, events, raw: { sessions }, games };
}
const choiceEv = (slug, scenarioIndex, choiceIndex, score, t, extra = {}) => ({
    event: 'choice', module: slug, clientTs: t, meta: { scenarioIndex, choiceIndex, score, ...extra },
});

test('choiceTag: 3 is BEST, 1-2 OK, 0 RISKY — never "wrong"', () => {
    assert.equal(choiceTag(3), 'BEST');
    assert.equal(choiceTag(2), 'OK');
    assert.equal(choiceTag(1), 'OK');
    assert.equal(choiceTag(0), 'RISKY');
    assert.equal(choiceTag(null), null);
});

test('drillLesson: real step titles, who stopped where, and first-try rate from events', () => {
    const meta = MODULE_DATA['privacy-security'];
    const ps = meta.slug;
    const students = [
        // Scam Sort (Case 2, scenarioIndex 1): two items, both right first time.
        drillStudent('a', 'Ana', { moduleId: meta.id, maxStep: 6, completed: true, events: [
            choiceEv(ps, 1, 0, 3, 1, { attemptKey: 'x1' }), choiceEv(ps, 1, 0, 3, 2, { attemptKey: 'x2' })] }),
        // One item let past, then fixed on a replay: NOT a first-try success.
        drillStudent('b', 'Ben', { moduleId: meta.id, maxStep: 2, events: [
            choiceEv(ps, 1, 1, 0, 1), choiceEv(ps, 1, 0, 3, 2, { replay: true })] }),
        drillStudent('c', 'Cy', { moduleId: meta.id, maxStep: 0, events: [] }),
    ];
    const d = drillLesson(meta, students);
    assert.deepEqual(d.steps.map((x) => x.title), meta.steps.map((x) => x.title));
    assert.equal(d.steps[1].title, 'The Scam Sort');
    assert.equal(d.steps[0].reached, 2);
    assert.deepEqual(d.steps[1].stopped.map((x) => x.name), ['Ben']);
    assert.deepEqual(d.notStarted.map((x) => x.name), ['Cy']);
    assert.equal(d.finished, 1);
    const scam = d.checks.find((c) => c.index === 1);
    assert.equal(scam.label, 'Called it correctly');
    assert.equal(scam.attempted, 2);
    assert.equal(scam.rate, 50);
});

test('drillLesson falls back to scenario_attempts when events could not be read', () => {
    const meta = MODULE_DATA['privacy-security'];
    const s = drillStudent('a', 'Ana', { moduleId: meta.id, maxStep: 3, events: null,
        attempts: { 1: [{ scenarioIndex: 1, choiceIndex: 0, score: 3, timestamp: 1 }] } });
    const d = drillLesson(meta, [s]);
    assert.equal(d.checks.find((c) => c.index === 1).rate, 100);
});

test('drillChallenge: groups of seven, and the riskiest scenarios with their real text, hardest first', () => {
    const meta = MODULE_DATA.ddc;
    const slug = meta.slug;
    // Scenario 1 (index 1, 1-based): option scores are 3/1/0 in module-data order.
    const riskyIdx = meta.steps[0].choices.findIndex((c) => c.score === 0);
    const bestIdx = meta.steps[0].choices.findIndex((c) => c.score === 3);
    const students = ['Ava', 'Noah', 'Zoe', 'Finn'].map((n, i) => drillStudent(`u${i}`, n, {
        moduleId: meta.id, maxStep: i < 2 ? 14 : 7,
        events: [choiceEv(slug, 1, i < 3 ? riskyIdx : bestIdx, i < 3 ? 0 : 3, 1),
                 choiceEv(slug, 2, meta.steps[1].choices.findIndex((c) => c.score === 3), 3, 2)],
    }));
    const d = drillChallenge(meta, students);
    assert.equal(d.groups.length, Math.ceil(meta.stepsTotal / 7));
    assert.deepEqual(d.groups[0], { start: 1, end: 7, through: 4 });
    assert.equal(d.groups[1].through, 2);
    assert.equal(d.hardest.length, 1, 'scenario 2 had no risky picks, so only scenario 1 splits');
    const h = d.hardest[0];
    assert.equal(h.number, 1);
    assert.equal(h.title, meta.steps[0].title);
    assert.equal(h.riskyShare, 75);
    assert.deepEqual(h.riskyNames.map((x) => x.name), ['Ava', 'Noah', 'Zoe']);
    assert.deepEqual(h.options.map((o) => o.tag), ['BEST', 'OK', 'RISKY']);
    assert.deepEqual(h.options.map((o) => o.text).sort(), meta.steps[0].choices.map((c) => c.text).sort());
    assert.match(worthFiveMinutes(d), /^75% picked the risky answer in Scenario 1\./);
});

test('drillGame: score spread and the low scorers', () => {
    const g = (pct) => [{ id: 'read-the-signal', bestPct: pct, plays: 1 }];
    const students = [
        drillStudent('a', 'Ana', { games: g(90) }), drillStudent('b', 'Ben', { games: g(40) }),
        drillStudent('c', 'Cy', { games: g(60) }), drillStudent('d', 'Di', { games: [] }),
    ];
    const d = drillGame('read-the-signal', students);
    assert.equal(d.played, 3);
    assert.deepEqual(d.buckets.map((b) => b.n), [1, 1, 1]);
    assert.deepEqual(d.low.map((x) => x.name), ['Ben']);
    assert.equal(d.avg, 63);
    assert.match(worthFiveMinutes(d, { name: 'Read the Signal', lessonName: 'Privacy & Security' }), /1 student scored under 50% in Read the Signal\. Privacy & Security/);
});

test('drillSim: steps from the sim\'s own sessions, predictions and Present mode from its own events', () => {
    const sim = { id: 'water-cycle', stream: 'water-cycle', eventPrefix: 'wc', stepsTotal: 6 };
    const sess = (maxStep, completed = false) => [{ module: 'water-cycle', stream: 'water-cycle', maxStep, completed, activeMs: 60000, lastSeenAt: 5 },
        { module: 'privacy-security', maxStep: 6 }];
    const ev = (event, meta, sessionId = 's1', t = 1) => ({ event, module: 'water-cycle', stream: 'water-cycle', sessionId, clientTs: t, meta });
    const students = [
        drillStudent('a', 'Ana', { sessions: sess(6, true), events: [ev('wc_reveal', { step: 2, matched: false }), ev('wc_reveal', { step: 2, matched: true }, 's1', 2), ev('wc_mode', { mode: 'class' })] }),
        drillStudent('b', 'Ben', { sessions: sess(3), events: [ev('wc_reveal', { step: 2, matched: true })] }),
    ];
    assert.equal(simProgress(students[1], sim).maxStep, 3);
    const d = drillSim(sim, students);
    assert.deepEqual(d.steps.map((x) => x.reached), [2, 2, 2, 1, 1, 1]);
    assert.equal(d.finished, 1);
    assert.deepEqual(d.predictions, [{ step: 2, revealed: 2, matched: 1, rate: 50 }], "each student's FIRST reveal counts");
    assert.equal(d.presentSessions, 1);
    assert.match(worthFiveMinutes(d), /Only 50% predicted Step 2/);
});

test('worthFiveMinutes says nothing when nothing has been recorded', () => {
    const meta = MODULE_DATA['privacy-security'];
    assert.equal(worthFiveMinutes(drillLesson(meta, [])), null);
    assert.equal(worthFiveMinutes(drillChallenge(MODULE_DATA.ddc, [])), null);
});

test('checkInReason is plain language, never "at risk"', () => {
    const rows = [
        { fact: { kind: 'never-started' } },
        { fact: { kind: 'silent', days: 9, moduleName: 'Privacy & Security' } },
        { fact: { kind: 'stalled', step: 2, stepsTotal: 6, moduleName: 'Privacy & Security', opens: 2 } },
    ];
    const text = rows.map(checkInReason);
    assert.equal(text[0], "Joined, but hasn't opened anything yet");
    assert.equal(text[1], 'No activity in 9 days, part-way through Privacy & Security');
    assert.equal(text[2], 'Stopped at step 2 of 6 in Privacy & Security, 2 sessions in a row');
    for (const t of text) assert.doesNotMatch(t, /risk/i);
});

test('capRoster: the free plan shows the first N by join time; Pro shows everyone; nobody is dropped', () => {
    const kids = Array.from({ length: 33 }, (_, i) => ({ uid: `k${i}`, joinedAt: 1000 - i }));
    const free = capRoster(kids, { limit: 30, pro: false });
    assert.equal(free.shown.length, 30);
    assert.equal(free.hidden.length, 3);
    assert.deepEqual(free.hidden.map((k) => k.uid), ['k2', 'k1', 'k0'], 'the latest joiners are the ones not shown');
    assert.equal(capRoster(kids, { limit: 30, pro: true }).shown.length, 33);
    // A legacy student with no join time counts as earliest.
    assert.equal(capRoster([{ uid: 'new', joinedAt: 5 }, { uid: 'old' }], { limit: 1, pro: false }).shown[0].uid, 'old');
});

test('activeMsThisWeek counts only sessions seen in the last 7 days', () => {
    const now = NOW;
    assert.equal(activeMsThisWeek([{ activeMs: 1000, lastSeenAt: now - DAY }, { activeMs: 5000, lastSeenAt: now - 9 * DAY }], now), 1000);
});

test('choiceLevelRows: one row per student per scored step, with the real choice text and tag', () => {
    const meta = MODULE_DATA.ddc;
    const riskyIdx = meta.steps[0].choices.findIndex((c) => c.score === 0);
    const s = drillStudent('a', 'Ana', { moduleId: meta.id, maxStep: 1, events: [choiceEv(meta.slug, 1, riskyIdx, 0, 1)] });
    const rows = choiceLevelRows([s], [meta]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].step, 1);
    assert.equal(rows[0].stepTitle, meta.steps[0].title);
    assert.equal(rows[0].choice, meta.steps[0].choices[riskyIdx].text);
    assert.equal(rows[0].tag, 'RISKY');
    assert.equal(choicesFor(s, MODULE_DATA['privacy-security']).length, 0, 'another module\'s events are not mixed in');
});

/* ── Español stories (2026-11-27) ─────────────────────────────────────────── */
test('buildCatalog puts both Español stories in their own group beside the simulations, as sims matched by module', () => {
    const cat = buildCatalog(REGISTRY.modules);
    const grp = cat.simPacks.find((p) => p.slug === 'espanol');
    assert.ok(grp, 'an espanol group exists');
    assert.deepEqual(grp.items.map((x) => x.id).sort(), ['el-mundial', 'el-viaje']);
    for (const it of grp.items) {
        assert.equal(it.type, 'sim');
        assert.equal(it.kind, 'story');
        assert.equal(it.stream, null, 'both stories share a stream, so a story must not match by it');
        assert.ok(it.stepsTotal > 0);
        assert.ok(cat.simIds.includes(it.id), 'assignable');
    }
    // Stories never land in a Lab Pack or the games.
    assert.ok(!cat.packs.some((p) => p.items.some((x) => x.id === 'el-viaje')));
    assert.ok(!cat.gamePacks.some((p) => p.items.some((x) => x.id === 'el-viaje')));
});

test('a story counts only its own sessions: El Viaje sessions never finish El Mundial', () => {
    const cat = buildCatalog(REGISTRY.modules);
    const [mundial, viaje] = ['el-mundial', 'el-viaje'].map((id) => cat.simPacks.flatMap((p) => p.items).find((x) => x.id === id));
    const student = { raw: { sessions: [
        { module: 'el-viaje', stream: 'espanol', maxStep: 12, completed: true, activeMs: 1000, startedAt: daysAgo(1) },
    ] } };
    assert.equal(simProgress(student, viaje).completed, true);
    const m = simProgress(student, mundial);
    assert.equal(m.completed, false);
    assert.equal(m.sessions, 0);
    student.raw.sessions.push({ module: 'el-mundial', stream: 'espanol', maxStep: 10, completed: true, summary: { gates: { 1: 1, 2: 0 }, path: { f1: 'metro' } } });
    assert.equal(simProgress(student, mundial).completed, true);
    assert.equal(drillSim(mundial, [student]).finished, 1);
});

test('assignmentSummary names Español stories separately from simulations', () => {
    const cat = buildCatalog(REGISTRY.modules);
    const sim = cat.simPacks.find((p) => p.slug === 'simulations').items[0].id;
    const s = assignmentSummary({ modules: [], games: [], sims: [sim, 'el-viaje', 'el-mundial'], catalog: cat });
    assert.equal(s.simCount, 1);
    assert.equal(s.storyCount, 2);
    assert.match(s.label, /1 simulation \+ 2 Español stories assigned/);
});

/* ── The Español report (Reports > Español, 2026-11-27) ─────────────────────── */
const { storyReport, studentStory, worthFiveStory, playedStoryIds, MIN_FOR_PERCENT } = await import('../public/mission-control/espanol-report.js');
const MUNDIAL = { id: 'el-mundial', name: 'El Mundial', gameNames: ['El Mundial'], stepsTotal: 10 };
const MUNDIAL_CFG = JSON.parse(readFileSync(new URL('../public/espanol/el-mundial/report.json', import.meta.url), 'utf8'));
const VIAJE_CFG = JSON.parse(readFileSync(new URL('../public/espanol/el-viaje/report.json', import.meta.url), 'utf8'));
const gateEv = (n, score, extra, at = 1000 + n) => ({ module: 'el-mundial', event: 'choice', clientTs: at, meta: { scenarioIndex: n, score, category: 'gate', ...extra } });
const esStudent = (uid, events, { completed = false, state = null } = {}) => ({
    uid, name: uid, events,
    raw: {
        sessions: [{ module: 'el-mundial', startedAt: 500, lastSeenAt: 5000, completed }],
        scores: completed ? [{ gameName: 'El Mundial', completed: true }] : [],
        progress: state ? { 'el-mundial': { state: JSON.stringify(state) } } : {},
    },
});

test('Español report: first tries per Puerta, per blank, lowest first-try rate first', () => {
    const students = [];
    for (let i = 0; i < 6; i++) {
        const knewIt = i < 2;   // 2 of 6 put conocía / conocí the right way round
        students.push(esStudent(`s${i}`, [
            gateEv(1, 1, { choiceIndex: 0 }),
            gateEv(2, i < 5 ? 1 : 0, { choiceIndex: i < 5 ? 0 : 1 }),
            gateEv(4, knewIt ? 1 : 0, { choiceIndex: knewIt ? 2 : 1, picks: knewIt ? { a: 'conocía', b: 'conocí' } : { a: 'conocía', b: 'conocía' } }),
            { module: 'el-mundial', event: 'choice', clientTs: 900, meta: { scenarioIndex: 'f1', choiceIndex: i % 3, category: 'fork' } },
        ], { completed: i < 4 }));
    }
    students.push({ uid: 'never', name: 'never', events: [], raw: { sessions: [], scores: [], progress: {} } });
    const d = storyReport(MUNDIAL, MUNDIAL_CFG, students);
    assert.equal(d.n, 7);
    assert.equal(d.played, 6);
    assert.equal(d.finished, 4);
    assert.equal(d.puertas[0].n, 4, 'the Puerta with the lowest first-try rate comes first');
    assert.equal(d.puertas[0].rate, 33);
    assert.equal(d.puertas[0].showPercent, true);
    const blankB = d.puertas[0].blanks.find((b) => b.key === 'b');
    assert.deepEqual(blankB.options.map((o) => [o.k, o.count, o.right]), [['conocí', 2, true], ['conocía', 4, false]]);
    assert.equal(d.worth.text, 'conocía vs. conocí: 4 of 6 picked conocía.');
    assert.deepEqual(d.forks[0].options.map((o) => o.count), [2, 2, 2]);
    // Puertas nobody reached go last, whatever their number.
    assert.deepEqual(d.puertas.slice(-2).map((p) => p.answered), [0, 0]);
    // The one-pick Puerta reads its option from choiceIndex.
    const p2 = d.puertas.find((p) => p.n === 2);
    assert.deepEqual(p2.blanks[0].options.map((o) => o.count), [5, 1]);
});

test('Español report: a replay never overwrites the first try', () => {
    const s = esStudent('replayer', [
        gateEv(4, 0, { picks: { a: 'conocí', b: 'conocía' } }, 1000),
        gateEv(4, 1, { picks: { a: 'conocía', b: 'conocí' } }, 9000),
    ], { state: { done: { 4: 1 }, choice: { 4: { a: 'conocía', b: 'conocí' } }, conf: { 4: 1 } } });
    const mine = studentStory(MUNDIAL, MUNDIAL_CFG, s).puertas.find((p) => p.n === 4);
    assert.equal(mine.right, false);
    assert.deepEqual(mine.picks, { a: 'conocí', b: 'conocía' });
});

test('Español report: fewer than five students shows counts, not percentages', () => {
    const three = [0, 1, 2].map((i) => esStudent(`t${i}`, [gateEv(1, i ? 1 : 0, { choiceIndex: i ? 0 : 1 })]));
    const d = storyReport(MUNDIAL, MUNDIAL_CFG, three);
    assert.equal(MIN_FOR_PERCENT, 5);
    assert.equal(d.puertas.find((p) => p.n === 1).showPercent, false);
});

test('Español report: without readable events it falls back to the session summary and saved picks', () => {
    const s = {
        uid: 'x', name: 'x', events: null,
        raw: {
            sessions: [{ module: 'el-viaje', startedAt: 1, completed: true, summary: { gates: { 1: 1, 4: 0 }, path: { f1: 'recepcion', f2: 'ciudad' } } }],
            scores: [],
            progress: { 'el-viaje': { state: JSON.stringify({ done: { 1: 1, 4: 1 }, choice: { 1: 'facturaba', '4a': 'u', 4: 'u' }, conf: { 1: 1, 4: 0 } }) } },
        },
    };
    const mine = studentStory({ id: 'el-viaje', gameNames: ['El Viaje'] }, VIAJE_CFG, s);
    assert.equal(mine.finished, true);
    assert.equal(mine.puertas[0].right, true);
    assert.deepEqual(mine.puertas[3].picks, { a: 'u', b: 'u' });
    assert.equal(mine.puertas[3].right, false);
    assert.equal(mine.puertas[1].answered, false);
    assert.deepEqual(mine.forks.map((f) => f.text), ['Recepción', 'Qué conocer en Monterrey']);
});

test('Español report: nothing to say when every first try was right, and played stories are found', () => {
    assert.equal(worthFiveStory([{ n: 1, label: 'x', answered: 4, right: 4, blanks: [] }]), null);
    const s = esStudent('p', []);
    assert.deepEqual(playedStoryIds([MUNDIAL, { id: 'el-viaje', gameNames: ['El Viaje'] }], [s]), ['el-mundial']);
});

test('Español report: every word a teacher reads avoids score, grade, wrong and at risk', () => {
    const src = readFileSync(new URL('../public/mission-control/teacher.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('/* ESPAÑOL STORIES (2026-11-27)'), src.indexOf("/* One tap from a game's drill-down"));
    const shown = block.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\$\{[^}]*\}/g, '');
    for (const word of [/\bscore/i, /\bgrade/i, /\bwrong\b/i, /at risk/i]) assert.equal(word.test(shown), false, `the Español report says ${word}`);
});

/* ── Embarque → Aduana: the growth view and the flag (2026-11-27) ───────────── */
const { growthReport, presentedGrowth } = await import('../public/mission-control/espanol-report.js');
const CHECKS_CFG = JSON.parse(readFileSync(new URL('../public/espanol/el-mundial/checks.json', import.meta.url), 'utf8'));
const withChecks = (uid, checks) => ({ uid, name: uid, events: [], raw: { sessions: [], scores: [], progress: { 'el-mundial': { checks } } } });

test('growth view: only students who did both checks count, skill by skill', () => {
    const students = [
        withChecks('a', { form: 'A', emb: [1, 0, 0, 0, 0], adu: [1, 1, 1, 1, 0], embDone: true, aduDone: true }),
        withChecks('b', { form: 'B', emb: [0, 0, 0, 0, 0], adu: [1, 1, 0, 1, 0], embDone: true, aduDone: true }),
        withChecks('c', { form: 'A', emb: [1, 1, 1, 1, 1], adu: [], embDone: true, aduDone: false }),   // boarded, never reached the Aduana
        withChecks('d', { form: 'B', emb: [1, 0], adu: [], embDone: false, aduDone: false }),           // left mid-Embarque
        { uid: 'e', name: 'e', events: [], raw: { sessions: [], scores: [], progress: {} } },
    ];
    const g = growthReport(CHECKS_CFG, 'el-mundial', students);
    assert.equal(g.n, 2);
    assert.equal(g.boarded, 3);
    assert.equal(g.showPercent, false, 'under five students: counts, not percentages');
    assert.deepEqual(g.slots.map((s) => [s.emb, s.adu]), [[1, 2], [0, 2], [0, 1], [0, 2], [0, 0]]);
    assert.equal(g.slots.length, 5);
    assert.match(g.worth, /^Tell a short past story with both tenses: 0 of 2 got it at the Aduana/);
});

test('growth view: five or more students shows percentages; nothing to flag when all got it', () => {
    const five = [0, 1, 2, 3, 4].map((i) => withChecks(`s${i}`, { form: 'A', emb: [0, 0, 0, 0, 0], adu: [1, 1, 1, 1, 1], embDone: true, aduDone: true }));
    const g = growthReport(CHECKS_CFG, 'el-mundial', five);
    assert.equal(g.showPercent, true);
    assert.equal(g.slots[0].aduPct, 100);
    assert.equal(g.worth, null);
    assert.equal(presentedGrowth(CHECKS_CFG, null), null);
    assert.deepEqual(presentedGrowth(CHECKS_CFG, { emb: [{ right: 10 }], adu: [{ right: 90 }] })[0], { skill: CHECKS_CFG.slots[0].skill, emb: 10, adu: 90 });
});

test('item banks: five slots, five items per form, the right option first, a rule for each', () => {
    for (const story of ['el-mundial', 'el-viaje']) {
        const bank = JSON.parse(readFileSync(new URL(`../public/espanol/${story}/checks.json`, import.meta.url), 'utf8'));
        assert.equal(bank.story, story);
        assert.equal(bank.slots.length, 5);
        assert.equal(bank.rubric.length, 4);
        assert.ok(bank.postcard.length > 20);
        for (const form of ['A', 'B']) {
            assert.equal(bank[form].length, 5);
            for (const it of bank[form]) { assert.equal(it.a, 0); assert.ok(it.o.length >= 2 && it.q && it.why); }
        }
        assert.equal(/\bvos\b/i.test(JSON.stringify([bank.A, bank.B])), false, 'vos is in the story, not measured by the checks');
    }
});

test('ESPANOL_CHECKS_ON: on for staging, previews and local; OFF on production and anywhere unexpected', async () => {
    const vm = await import('node:vm');
    const src = readFileSync(new URL('../public/js/site-config.js', import.meta.url), 'utf8');
    const flag = (hostname) => { const window = { location: { hostname } }; vm.runInNewContext(src, { window }); return window.AG_CONFIG.ESPANOL_CHECKS_ON; };
    for (const h of ['allgoodacademy.com', 'www.allgoodacademy.com', 'allgood-academy.web.app', 'allgood-academy.firebaseapp.com', 'example.com', '', 'allgood-academy--staging.evil.com']) {
        assert.equal(flag(h), false, `the checks must be off on "${h}"`);
    }
    for (const h of ['allgood-academy--staging-ba3i7t07.web.app', 'allgood-academy--pr97-claude-x-abc123.web.app', 'localhost', '127.0.0.1']) {
        assert.equal(flag(h), true, `the checks should be on at "${h}"`);
    }
    // Nothing in a story or in Mission Control shows the checks without reading the flag.
    assert.match(readFileSync(new URL('../public/js/espanol-checks.js', import.meta.url), 'utf8'), /if \(!CFG\.ESPANOL_CHECKS_ON\) return;/);
    assert.match(src, /var PRODUCTION_ESPANOL_CHECKS = false;/, 'the production switch stays off until the founder flips it');
});
