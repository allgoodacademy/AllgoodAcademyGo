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
    assert.deepEqual(gameIds, live.filter((m) => m.type === 'game').map((m) => m.id).sort());
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
    assert.deepEqual(extrasFromDoc({ modules: ['a'], games: [] }), { modules: ['a'], games: [] });
    // Non-string entries are dropped rather than carried into a document path.
    assert.deepEqual(extrasFromDoc({ modules: ['a', 7, null], games: ['g'] }), { modules: ['a'], games: ['g'] });
});
