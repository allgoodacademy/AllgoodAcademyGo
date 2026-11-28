// Step progress in public/js/story-tracking.js (AA-23): the student's own
// module_progress/{slug} gains `step` (furthest reached) and `stepsTotal`, for the dashboard's
// "N of M scenes" bar. The rule this file holds: those writes NEVER overwrite or drop the
// story's resume `state`.
//
// The script runs in a vm with a stand-in window: Telemetry and AuthCore are fakes, and
// saveModuleProgress merges into an in-memory doc exactly like setDoc(..., { merge: true }).
// Timers and Date.now are a fake clock, so the 10-second throttle is tested without waiting.
// Run: node --test tests/story-tracking.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const SRC = fs.readFileSync(new URL('../public/js/story-tracking.js', import.meta.url), 'utf8');

function load({ presentar = false } = {}) {
    let now = 1_000_000;
    let timers = [];
    const docs = {};          // slug -> merged doc
    const writes = [];        // every write, as sent
    const listeners = {};
    const flush = () => new Promise((r) => setImmediate(r));
    const window = {
        Telemetry: { init() {}, plan() {}, step() {}, choice() {}, complete() {}, summary() {}, track() {}, restart() {} },
        AuthCore: {
            auth: { currentUser: { uid: 'u1', isAnonymous: !presentar } },
            startSession: async () => ({ uid: 'u1' }),
            getAccount: async () => ({ role: 'teacher' }),
            saveModuleProgress: async (slug, data) => { writes.push({ slug, data }); docs[slug] = { ...(docs[slug] || {}), ...data }; },
            loadModuleProgress: async (slug) => docs[slug] || null,
        },
        addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
    };
    const ctx = {
        window,
        document: { createElement: () => ({}), head: { appendChild() {} }, querySelector: () => null, referrer: '' },
        location: { search: presentar ? '?mode=presentar' : '', origin: 'http://x' },
        setTimeout: (fn, ms) => { const t = { fn, at: now + (ms || 0) }; timers.push(t); return t; },
        clearTimeout: (t) => { timers = timers.filter((x) => x !== t); },
        Date: { now: () => now },
        Promise, JSON, Object, Array, Math, String, Number, isFinite, URL, console,
    };
    ctx.window.window = ctx.window;
    vm.createContext(ctx);
    vm.runInContext(SRC, ctx);
    const advance = async (ms) => {
        now += ms;
        for (;;) {
            const due = timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at)[0];
            if (!due) break;
            timers = timers.filter((t) => t !== due);
            due.fn();
            await flush();
        }
        await flush(); await flush();
    };
    return { ST: window.StoryTrack, docs, writes, advance, flush, fire: (t) => (listeners[t] || []).forEach((f) => f()) };
}

test('step writes never overwrite the resume state', async () => {
    const { ST, docs, writes, advance } = load();
    const TM = ST.TM;
    TM.init({ module: 'la-habana', gameName: 'La Habana', stream: 'espanol', stepsTotal: 14 });
    await advance(0);
    await ST.saveProgress('la-habana', { v: '1', finished: false, state: '{"done":{"1":1}}' });
    await advance(0);
    assert.equal(docs['la-habana'].state, '{"done":{"1":1}}');

    TM.step(1); TM.step(2); TM.step(3);
    await advance(10_000);
    TM.step(5);
    await advance(10_000);

    const stepOnly = writes.filter((w) => !('state' in w.data));
    assert.ok(stepOnly.length >= 1, 'a step advance is written on its own');
    for (const w of stepOnly) assert.deepEqual(Object.keys(w.data).sort(), ['step', 'stepsTotal'], 'a step-only write carries nothing but step and stepsTotal');
    assert.equal(docs['la-habana'].state, '{"done":{"1":1}}', 'state survives the step writes');
    assert.equal(docs['la-habana'].step, 5);
    assert.equal(docs['la-habana'].stepsTotal, 14);
});

test('saveProgress merges step/stepsTotal, but the story\'s own fields win', async () => {
    const { ST, writes, advance } = load();
    ST.TM.init({ module: 'el-viaje', stepsTotal: 12 });
    ST.TM.step(4);
    await advance(0);
    writes.length = 0;
    await ST.saveProgress('el-viaje', { state: 'S', finished: false });
    await advance(0);
    assert.deepEqual(writes.at(-1).data, { state: 'S', finished: false, step: 4, stepsTotal: 12 });
    await ST.saveProgress('el-viaje', { state: 'S2', step: 2 });
    await advance(0);
    assert.equal(writes.at(-1).data.step, 2, 'a story that sends its own step keeps it');
    assert.equal(writes.at(-1).data.state, 'S2');
});

test('step-only writes: furthest step only, at most once per 10 s, none for step 1', async () => {
    const { ST, writes, advance } = load();
    ST.TM.init({ module: 'la-selva', stepsTotal: 11 });
    ST.TM.step(1);
    await advance(20_000);
    assert.equal(writes.length, 0, 'step 1 (the page opened) is not written');
    ST.TM.step(2);
    await advance(0);
    assert.equal(writes.length, 1);
    ST.TM.step(3); ST.TM.step(4);
    await advance(5_000);
    assert.equal(writes.length, 1, 'throttled');
    await advance(5_000);
    assert.equal(writes.length, 2);
    assert.equal(writes[1].data.step, 4);
    ST.TM.step(3);
    await advance(20_000);
    assert.equal(writes.length, 2, 'a lower step is not written');
    ST.TM.plan(9);
    ST.TM.complete({});
    await ST.saveProgress('la-selva', { finished: true, state: 'END' });
    await advance(0);
    assert.deepEqual(writes.at(-1).data, { finished: true, state: 'END', step: 9, stepsTotal: 9 }, 'complete() fills the bar, like Telemetry');
});

test('a pending step is written when the page is hidden', async () => {
    const { ST, writes, advance, fire, flush } = load();
    ST.TM.init({ module: 'el-mundial', stepsTotal: 10 });
    ST.TM.step(2); await advance(0);
    ST.TM.step(6); await advance(1_000);
    assert.equal(writes.length, 1);
    fire('pagehide');
    await flush(); await flush(); await flush();
    assert.equal(writes.at(-1).data.step, 6);
});

test('presentar (a teacher on the projector): nothing is written', async () => {
    const { ST, writes, advance } = load({ presentar: true });
    ST.TM.init({ module: 'la-selva', stepsTotal: 11 });
    ST.TM.step(5);
    await advance(20_000);
    await ST.saveProgress('la-selva', { state: 'S' });
    await advance(0);
    assert.equal(writes.length, 0);
});
