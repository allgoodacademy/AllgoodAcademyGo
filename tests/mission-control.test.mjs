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
} from '../public/mission-control/derive.js';
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

    // Challenge scenario 1 is step index 0.
    const a = attemptsByStep(ddc, [{ scenarioIndex: 1, choiceIndex: 2 }, { scenarioIndex: 30, choiceIndex: 0 }]);
    assert.equal(a[0].length, 1);
    assert.equal(a[29].length, 1);
    assert.equal(a[1], undefined);

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
