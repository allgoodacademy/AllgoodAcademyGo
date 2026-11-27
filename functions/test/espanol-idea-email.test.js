// Tests for the Español hub idea email (functions/espanol-idea-email.js), against the
// Firestore emulator. sendMail is a fake that records what would have gone out.
//
// Run: npm run test:functions   (scripts/run-functions-tests.sh starts the emulators)
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { createEspanolIdeaHandler, buildEmail, validEmail } = require('../espanol-idea-email');

if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('Run through scripts/run-functions-tests.sh (needs the Firestore emulator).');
    process.exit(1);
}

const APP = 'allgood-espanol-test';
if (!getApps().length) initializeApp({ projectId: 'allgood-functions-test' });
const db = getFirestore();
const quiet = { info() {}, warn() {}, error() {} };
const NOW = Date.parse('2026-12-02T15:00:00Z');
const TO = 'learning@allgoodacademy.com';
const FROM = 'Allgood Academy Español <learning@allgoodacademy.com>';

const msgs = () => db.collection('artifacts').doc(APP).collection('messages');
let seq = 0;
async function post(data) {
    const ref = msgs().doc(`m${++seq}`);
    await ref.set(data);
    return ref;
}
function setup({ cap, fail } = {}) {
    const sent = [];
    const handler = createEspanolIdeaHandler({
        db, appId: APP, to: TO, from: FROM, now: () => NOW, log: quiet, cap,
        sendMail: async (o) => { if (fail) throw new Error('smtp down'); sent.push(o); },
    });
    return { sent, run: async (ref) => handler(ref.id, (await ref.get()).data()) };
}
const idea = (extra) => ({
    source: 'Español hub', senderUid: 'anon1', message: "What's hard to teach: por vs. para\nLevel I teach: Spanish 3", ...extra,
});

test('emails an Español hub idea to learning@ with the visitor as Reply-To', async () => {
    const { sent, run } = setup();
    const ref = await post(idea({ replyTo: 'maestra@school.org' }));
    assert.equal(await run(ref), 'sent');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, TO);
    assert.equal(sent[0].from, FROM);
    assert.equal(sent[0].subject, 'Español: next story idea');
    assert.equal(sent[0].replyTo, 'maestra@school.org');
    assert.match(sent[0].text, /por vs\. para/);
    assert.ok((await ref.get()).data().emailedAt);
});

test('ignores messages from every other portal', async () => {
    const { sent, run } = setup();
    const ref = await post({ source: 'Dashboard', senderUid: 'x', message: 'hi' });
    assert.equal(await run(ref), 'ignored');
    assert.equal(sent.length, 0);
});

test('a redelivered event does not send twice', async () => {
    const { sent, run } = setup();
    const ref = await post(idea());
    assert.equal(await run(ref), 'sent');
    assert.equal(await run(ref), 'done-already');
    assert.equal(sent.length, 1);
});

test('a bad or header-injecting reply address is dropped, not used', async () => {
    assert.equal(validEmail('a@b.co\r\nBcc: x@y.com'), null);
    assert.equal(validEmail('not an email'), null);
    assert.equal(validEmail(' ok@school.org '), 'ok@school.org');
    const mail = buildEmail({ message: 'x', replyTo: 'a@b.co\nBcc: evil@x.com' }, { to: TO, from: FROM });
    assert.equal(mail.replyTo, undefined);
    assert.match(mail.text, /No reply address given/);
});

test('long messages are capped', async () => {
    const mail = buildEmail({ message: 'x'.repeat(20000) }, { to: TO, from: FROM });
    assert.ok(mail.text.length < 4500);
});

test('past the daily cap the idea stays in Insider and is not emailed', async () => {
    const { sent, run } = setup({ cap: 2 });
    await db.collection('artifacts').doc(APP).collection('email_counters').doc('espanol_2026-12-02').set({ count: 2 });
    const ref = await post(idea());
    assert.equal(await run(ref), 'capped');
    assert.equal(sent.length, 0);
    assert.equal((await ref.get()).data().emailSkipped, 'daily-cap');
});

test('an SMTP failure releases the claim so a retry can send', async () => {
    await db.collection('artifacts').doc(APP).collection('email_counters').doc('espanol_2026-12-02').delete();
    const ref = await post(idea());
    await assert.rejects(setup({ fail: true }).run(ref), /smtp down/);
    const after = (await ref.get()).data();
    assert.equal(after.emailClaimedAt, null);
    assert.match(after.emailError, /smtp down/);
    const ok = setup();
    assert.equal(await ok.run(ref), 'sent');
    assert.equal(ok.sent.length, 1);
});
