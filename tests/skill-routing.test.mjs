// Regression tests for the shared skill -> GoodBlock resolver (public/js/skill-routing.js)
// against the real registry (public/data/modules-registry.json).
//
// The point of these is narrow and specific: Read the Signal and Money Moves already routed
// CORRECTLY before the resolver existed, from their own hardcoded destination maps. Moving
// the lookup into a shared function is the change most likely to break them quietly — the
// end screen still renders, the button still works, it just points somewhere else. So every
// destination those two games could produce is pinned here, by hand, to the URL each one
// sent a student to before this change.
//
// Run with `npm run test:skill-routing`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registryPath = new URL('../public/data/modules-registry.json', import.meta.url);
const REGISTRY = JSON.parse(readFileSync(registryPath, 'utf8'));

// skill-routing.js fetches its registry. Serve the real file from disk instead of a network.
globalThis.fetch = async (url) => {
    if (String(url) !== '/data/modules-registry.json') throw new Error(`unexpected fetch: ${url}`);
    return { ok: true, status: 200, json: async () => REGISTRY };
};

const { resolve, normalize } = await import('../public/js/skill-routing.js');

const RTS = { defaultUrl: '/jsh/digital-decisions-lab/privacy-security/', defaultName: 'Privacy & Security' };
const MM = { defaultUrl: '/jsh/real-world-ready-lab/money-as-a-skill/', defaultName: 'Money as a Skill' };

// --- Read the Signal: the five categories and the two spellings of the fifth, each pinned
// to the destination DEEPER_ROUTES used to hold.
const RTS_EXPECTED = {
    phishing: '/jsh/digital-decisions-lab/privacy-security/',
    privacy: '/jsh/digital-decisions-lab/privacy-security/',
    permissions: '/jsh/digital-decisions-lab/privacy-security/',
    social: '/jsh/digital-decisions-lab/social-intelligence/',
    'safe-recognition': '/jsh/digital-decisions-lab/digital-citizenship/',
    safe: '/jsh/digital-decisions-lab/digital-citizenship/',
};
for (const [category, url] of Object.entries(RTS_EXPECTED)) {
    test(`Read the Signal: "${category}" still routes to ${url}`, async () => {
        const dest = await resolve(category, RTS);
        assert.equal(dest.url, url);
        assert.equal(dest.matched, true);
    });
}

// --- Money Moves: all nine categories went to the one lab in its pack. Written as the
// game's own display strings, because that is literally what categoryStats is keyed by.
const MM_CATEGORIES = [
    'First Paycheck', 'Predatory Offer', 'Investment Curiosity', 'Peer Pressure',
    'Long-Term Thinking', 'Credit Basics', 'Financial Conversations',
    'Income vs. Expenses', 'Taking Ownership',
];
for (const category of MM_CATEGORIES) {
    test(`Money Moves: "${category}" still routes to Money as a Skill`, async () => {
        const dest = await resolve(category, MM);
        assert.equal(dest.url, '/jsh/real-world-ready-lab/money-as-a-skill/');
        assert.equal(dest.matched, true);
    });
}

// --- The two games that could not route by category before.
test('The Rumor Mill: "misinformation" keeps its original Digital Citizenship destination', async () => {
    const dest = await resolve('misinformation', { defaultUrl: '/jsh/digital-decisions-lab/digital-citizenship/' });
    assert.equal(dest.url, '/jsh/digital-decisions-lab/digital-citizenship/');
});
test('The Rumor Mill: "accuracy" reaches a lab in another pack entirely', async () => {
    const dest = await resolve('accuracy', { defaultUrl: '/jsh/digital-decisions-lab/digital-citizenship/' });
    assert.equal(dest.url, '/jsh/room-to-think-lab/ten-voices-one-source/');
    assert.equal(dest.matched, true);
});
test('Before You Send: "escalation-language" reaches Real World Ready', async () => {
    const dest = await resolve('escalation-language', { defaultUrl: '/jsh/digital-decisions-lab/social-intelligence/' });
    assert.equal(dest.url, '/jsh/real-world-ready-lab/conflict-has-a-winner/');
});
test('Before You Send: "audience-choice" reaches Room to Think', async () => {
    const dest = await resolve('audience-choice', { defaultUrl: '/jsh/digital-decisions-lab/social-intelligence/' });
    assert.equal(dest.url, '/jsh/room-to-think-lab/where-you-say-it/');
});

// --- Never a broken link, never a blank card.
test('an unknown category falls back to the caller\'s own default', async () => {
    const dest = await resolve('no-such-skill', RTS);
    assert.equal(dest.url, RTS.defaultUrl);
    assert.equal(dest.name, RTS.defaultName);
    assert.equal(dest.matched, false);
});
test('a null category (no clear weakness this round) falls back too', async () => {
    const dest = await resolve(null, MM);
    assert.equal(dest.url, MM.defaultUrl);
    assert.equal(dest.matched, false);
});
test('every resolved destination is a real, live lab url in the registry', async () => {
    const live = new Set(REGISTRY.modules.filter((m) => m.type === 'lab' && !m.retired).map((m) => m.url));
    for (const category of [...Object.keys(RTS_EXPECTED), ...MM_CATEGORIES, 'misinformation', 'accuracy', 'reputation', 'escalation-language', 'audience-choice', 'self-advocacy', 'vulnerability', 'tone-under-emotion']) {
        const dest = await resolve(category, RTS);
        assert.ok(live.has(dest.url), `${category} resolved to ${dest.url}, which is not a live lab`);
    }
});

test('normalize() maps a game\'s display string onto the registry vocabulary', () => {
    assert.equal(normalize('Income vs. Expenses'), 'income-vs-expenses');
    assert.equal(normalize('  Long-Term Thinking '), 'long-term-thinking');
    assert.equal(normalize('safe-recognition'), 'safe-recognition');
    assert.equal(normalize(null), '');
});


// --- THE STAGING BUG (2026-09-13), pinned so it cannot come back.
//
// The Rumor Mill routed a student to Social Intelligence. `reputation` had been placed on
// Social Intelligence's skillTags by content-similarity judgment — reputational harm reads
// adjacent to allyship — with nothing in the repo recording why and nothing able to check it.
// The resolver did exactly what the data told it. Social Intelligence does not teach
// reputational harm; Digital Citizenship does (Cases 5 and 6).
const TRM_CATEGORIES = ['misinformation', 'accuracy', 'reputation'];
const SOCIAL_INTELLIGENCE = '/jsh/digital-decisions-lab/social-intelligence/';

test('The Rumor Mill can never route to Social Intelligence', () => {
    // Asserted against the registry rather than the resolver: this was a DATA error, and the
    // data is where it has to stay fixed. Social Intelligence's territory is phishing /
    // privacy / permissions / social — none of The Rumor Mill's three categories belong to it.
    const si = REGISTRY.modules.find((m) => m.id === 'social-intelligence');
    const codes = si.skillTags.filter((t) => t.framework === 'internal').map((t) => t.code);
    for (const c of TRM_CATEGORIES) {
        assert.ok(!codes.includes(c), `Social Intelligence must not carry "${c}" — it does not teach it`);
    }
});

test('reputation routes to Digital Citizenship, where the evidence is', async () => {
    const dest = await resolve('reputation', { defaultUrl: '/jsh/digital-decisions-lab/digital-citizenship/' });
    assert.equal(dest.url, '/jsh/digital-decisions-lab/digital-citizenship/');
    assert.equal(dest.matchedId, 'digital-citizenship');
});

test('no Rumor Mill category resolves to Social Intelligence', async () => {
    for (const c of TRM_CATEGORIES) {
        const dest = await resolve(c, { defaultUrl: '/jsh/digital-decisions-lab/digital-citizenship/' });
        assert.notEqual(dest.url, SOCIAL_INTELLIGENCE, `"${c}" resolved to Social Intelligence`);
    }
});

// The bug CLASS, not the one symptom: an internal tag placed by inference with nothing
// recording why. Every one must cite the shipped routing or the coverage-map Case it rests on.
test('every internal skill tag cites the evidence its placement rests on', () => {
    for (const m of REGISTRY.modules) {
        for (const t of m.skillTags || []) {
            if (t.framework !== 'internal') continue;
            assert.ok(t.evidence && t.evidence.length > 30,
                `${m.id} / ${t.code} has no evidence — an uncitable placement cannot be reviewed`);
        }
    }
});

// --- the resolver itself was NOT at fault; this pins that it stays that way.
test('resolving for one game does not affect the next game\'s result', async () => {
    const RTS_ = { defaultUrl: '/jsh/digital-decisions-lab/privacy-security/' };
    const TRM_ = { defaultUrl: '/jsh/digital-decisions-lab/digital-citizenship/' };
    const interleaved = [];
    for (const [c, o] of [['social', RTS_], ['reputation', TRM_], ['social', RTS_], ['reputation', TRM_]]) {
        interleaved.push((await resolve(c, o)).url);
    }
    assert.equal(interleaved[0], interleaved[2], 'Read the Signal drifted after a Rumor Mill resolve');
    assert.equal(interleaved[1], interleaved[3], 'The Rumor Mill drifted after a Read the Signal resolve');
});

test('concurrent resolves from different games stay independent', async () => {
    const [a, b, c] = await Promise.all([
        resolve('phishing', { defaultUrl: '/jsh/digital-decisions-lab/privacy-security/' }),
        resolve('reputation', { defaultUrl: '/jsh/digital-decisions-lab/digital-citizenship/' }),
        resolve('accuracy', { defaultUrl: '/jsh/digital-decisions-lab/digital-citizenship/' }),
    ]);
    assert.equal(a.matchedId, 'privacy-security');
    assert.equal(b.matchedId, 'digital-citizenship');
    assert.equal(c.matchedId, 'ten-voices-one-source');
});

test('resolve() does not mutate the registry it read', async () => {
    const before = JSON.stringify(REGISTRY);
    await resolve('social', { defaultUrl: SOCIAL_INTELLIGENCE });
    await resolve('reputation', { defaultUrl: '/jsh/digital-decisions-lab/digital-citizenship/' });
    assert.equal(JSON.stringify(REGISTRY), before);
});

// --- routing decisions have to be checkable after the fact.
test('a match reports which category and which registry entry decided it', async () => {
    const dest = await resolve('self-advocacy', { defaultUrl: SOCIAL_INTELLIGENCE });
    assert.equal(dest.reason, 'category-match');
    assert.equal(dest.category, 'self-advocacy');
    assert.equal(dest.matchedModuleId ?? dest.matchedId, 'professional-brand');
    assert.equal(dest.matchedPack, 'digital-decisions');
    assert.equal(dest.tagStatus, 'draft', 'an unreviewed placement must say so in telemetry');
});

test('a fallback says WHY it fell back', async () => {
    const noCategory = await resolve(null, { defaultUrl: SOCIAL_INTELLIGENCE });
    assert.equal(noCategory.reason, 'no-category');
    const noMatch = await resolve('not-a-real-skill', { defaultUrl: SOCIAL_INTELLIGENCE });
    assert.equal(noMatch.reason, 'no-match');
});

test('a reviewed placement reports tagStatus reviewed', async () => {
    const dest = await resolve('phishing', { defaultUrl: '/jsh/digital-decisions-lab/privacy-security/' });
    assert.equal(dest.tagStatus, 'reviewed');
});

// --- THE HIJACK BUG (2026-09-14), pinned so it cannot come back.
//
// The tie-break used to be "when several labs carry a category, prefer the one that is the
// calling game's own default destination." That was harmless only while overlaps were rare.
// Social Intelligence genuinely does teach `audience-choice`, `escalation-language` and
// `self-advocacy` — Cases 2/3/4/5 — and it is also Before You Send's default. So tagging it
// CORRECTLY made it win all three ties and swallow the more specific homes for those skills.
// Adding a second right answer for a skill has to broaden routing, not collapse it.
//
// The rule now prefers SPECIALIZATION: fewest skillTags overall wins, caller identity only
// breaks a genuine tie.
const BYS = { defaultUrl: SOCIAL_INTELLIGENCE, defaultName: 'Social Intelligence' };

test('the narrower GoodBlock wins a tie-break, even against the caller\'s own default', async () => {
    // Synthetic, so this pins the MECHANISM and keeps holding if the real tagging is
    // rearranged later. `broad-lab` is the caller's own default AND carries the category;
    // under the old rule it won on both counts.
    const synthetic = [
        {
            id: 'synthetic-broad', name: 'Synthetic Broad', type: 'lab', pack: 'digital-decisions',
            url: '/jsh/digital-decisions-lab/synthetic-broad/',
            skillTags: [
                { framework: 'internal', code: 'synthetic-skill' },
                { framework: 'internal', code: 'synthetic-other-a' },
                { framework: 'internal', code: 'synthetic-other-b' },
                { framework: 'CASEL', code: 'Social Awareness' },
            ],
        },
        {
            id: 'synthetic-narrow', name: 'Synthetic Narrow', type: 'lab', pack: 'room-to-think',
            url: '/jsh/room-to-think-lab/synthetic-narrow/',
            skillTags: [{ framework: 'internal', code: 'synthetic-skill' }],
        },
    ];
    REGISTRY.modules.push(...synthetic);
    try {
        const dest = await resolve('synthetic-skill', {
            defaultUrl: '/jsh/digital-decisions-lab/synthetic-broad/',
            defaultName: 'Synthetic Broad',
        });
        assert.equal(dest.matchedId, 'synthetic-narrow',
            'the broad lab won because it was the caller\'s default — the hijack bug is back');
        assert.equal(dest.matchedPack, 'room-to-think', 'specialization must beat pack affinity too');
    } finally {
        for (const m of synthetic) REGISTRY.modules.splice(REGISTRY.modules.indexOf(m), 1);
    }
});

test('a genuine tie still falls back to the caller\'s own default', async () => {
    // Equal breadth: the old rule is still the right answer, and must still apply.
    const synthetic = [
        {
            id: 'synthetic-tie-a', name: 'Synthetic Tie A', type: 'lab', pack: 'room-to-think',
            url: '/jsh/room-to-think-lab/synthetic-tie-a/',
            skillTags: [{ framework: 'internal', code: 'synthetic-tied-skill' }],
        },
        {
            id: 'synthetic-tie-b', name: 'Synthetic Tie B', type: 'lab', pack: 'digital-decisions',
            url: '/jsh/digital-decisions-lab/synthetic-tie-b/',
            skillTags: [{ framework: 'internal', code: 'synthetic-tied-skill' }],
        },
    ];
    REGISTRY.modules.push(...synthetic);
    try {
        const dest = await resolve('synthetic-tied-skill', {
            defaultUrl: '/jsh/digital-decisions-lab/synthetic-tie-b/',
        });
        assert.equal(dest.matchedId, 'synthetic-tie-b');
    } finally {
        for (const m of synthetic) REGISTRY.modules.splice(REGISTRY.modules.indexOf(m), 1);
    }
});

// The real thing, against the shipped registry: each of Before You Send's three overlapping
// categories must reach the GoodBlock built around it, not the one it shares a default with.
const BYS_SPECIALIZED = {
    'self-advocacy': 'professional-brand',
    'escalation-language': 'conflict-has-a-winner',
    'audience-choice': 'where-you-say-it',
};
for (const [category, expectedId] of Object.entries(BYS_SPECIALIZED)) {
    test(`Before You Send: "${category}" reaches ${expectedId}, not its own default`, async () => {
        const labs = REGISTRY.modules.filter((m) => m.type === 'lab' && !m.retired
            && (m.skillTags || []).some((t) => t.framework === 'internal' && normalize(t.code) === category));
        // If this stops being a contested category the test is no longer testing anything,
        // so say that rather than passing vacuously.
        assert.ok(labs.length > 1,
            `"${category}" is carried by only ${labs.map((m) => m.id).join(', ')} — this test needs the overlap to be meaningful`);
        assert.ok(labs.some((m) => m.id === 'social-intelligence'),
            `"${category}" is no longer on Social Intelligence — the hijack this pins is gone, re-point or retire this test`);
        const dest = await resolve(category, BYS);
        assert.equal(dest.matchedId, expectedId);
        assert.notEqual(dest.url, SOCIAL_INTELLIGENCE);
    });
}

test('Social Intelligence is still a REACHABLE match for the skills it teaches', async () => {
    // The other half of the fix: specialization must not make a correct second home dead.
    // Read the Signal has no Social Intelligence-shadowing alternative for `social`, and a
    // caller whose default is elsewhere must still be able to land there.
    const dest = await resolve('social', RTS);
    assert.equal(dest.matchedId, 'social-intelligence');
    assert.equal(dest.matched, true);
});
