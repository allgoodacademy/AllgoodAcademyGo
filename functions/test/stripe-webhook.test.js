// Tests for the Stripe webhook (functions/stripe-webhook.js), against the Firestore and Auth
// emulators. Every request is signed the way Stripe signs it
// (Stripe.webhooks.generateTestHeaderString), so the real signature check runs each time.
//
// Run: npm run test:functions   (scripts/run-functions-tests.sh starts the emulators)
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Stripe = require('stripe');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createStripeWebhookHandler, YEAR_MS } = require('../stripe-webhook');

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    console.error('Run through scripts/run-functions-tests.sh (needs the Firestore and Auth emulators).');
    process.exit(1);
}

const APP = 'allgood-academy';
const SECRET = 'whsec_test_secret_for_unit_tests';
const NOW = Date.parse('2026-12-01T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

initializeApp({ projectId: 'allgood-functions-test' });
const db = getFirestore();
const auth = getAuth();
const quiet = { info() {}, warn() {}, error() {} };
const handler = createStripeWebhookHandler({ db, auth, appId: APP, getSecret: () => SECRET, now: () => NOW, log: quiet });

const col = (n) => db.collection('artifacts').doc(APP).collection(n);
const plan = async (uid) => { const s = await col('teacher_plans').doc(uid).get(); return s.exists ? s.data() : null; };
const ms = (t) => (t ? t.toMillis() : 0);

let seq = 0;
function evt(type, object, id) {
    return { id: id || `evt_test_${++seq}`, object: 'event', type, created: Math.floor(NOW / 1000), data: { object } };
}
async function send(event, { secret = SECRET, tamper = false, signature } = {}) {
    const payload = JSON.stringify(event);
    const header = signature !== undefined ? signature : Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const raw = Buffer.from(tamper ? payload.replace('"paid"', '"PAID"') : payload);
    const res = { statusCode: 0, body: '', status(c) { this.statusCode = c; return this; }, send(b) { this.body = b; return this; } };
    await handler({ method: 'POST', headers: header ? { 'stripe-signature': header } : {}, rawBody: raw }, res);
    return res;
}
const checkout = (o) => ({ id: `cs_test_${++seq}`, object: 'checkout.session', mode: 'payment', payment_status: 'paid',
    amount_total: 4900, currency: 'usd', customer: null, payment_intent: `pi_test_${seq}`, ...o });

test.before(async () => {
    await auth.createUser({ uid: 'teacher_pay', email: 'pay@school.org' });
    await auth.createUser({ uid: 'teacher_mail', email: 'mail@school.org' });
    await auth.createUser({ uid: 'teacher_founding', email: 'founding@school.org' });
    await auth.createUser({ uid: 'teacher_sub', email: 'sub@school.org' });
    await auth.createUser({ uid: 'teacher_refund', email: 'refund@school.org' });
    await auth.createUser({ uid: 'teacher_partial', email: 'partial@school.org' });
});

test('a valid payment turns Pro on for one year (client_reference_id)', async () => {
    const res = await send(evt('checkout.session.completed', checkout({ client_reference_id: 'teacher_pay', customer_details: { email: 'pay@school.org' } })));
    assert.equal(res.statusCode, 200);
    const p = await plan('teacher_pay');
    assert.equal(p.plan, 'pro');
    assert.equal(ms(p.proUntil), NOW + YEAR_MS);
    assert.equal(p.grantedBy, 'stripe');
    assert.match(p.note, /^Stripe cs_test_/);
    assert.deepEqual(Object.keys(p).sort(), ['grantedBy', 'note', 'plan', 'proUntil', 'updatedAt']);
});

test('a duplicate event (Stripe retry) is skipped: Pro is not extended twice', async () => {
    const e = evt('checkout.session.completed', checkout({ client_reference_id: 'teacher_mail' }));
    assert.equal((await send(e)).body, 'pro_extended');
    const first = ms((await plan('teacher_mail')).proUntil);
    const again = await send(e);
    assert.equal(again.statusCode, 200);
    assert.equal(again.body, 'duplicate');
    assert.equal(ms((await plan('teacher_mail')).proUntil), first);
});

test('a bad signature is rejected with 400 and writes nothing', async () => {
    const e = evt('checkout.session.completed', checkout({ client_reference_id: 'teacher_partial' }), 'evt_bad_sig');
    for (const opts of [{ secret: 'whsec_wrong' }, { tamper: true }, { signature: '' }, { signature: 't=1,v1=deadbeef' }]) {
        const res = await send(e, opts);
        assert.equal(res.statusCode, 400);
    }
    assert.equal(await plan('teacher_partial'), null);
    assert.equal((await col('stripe_events').doc('evt_bad_sig').get()).exists, false);
});

test('a missing or unknown uid falls back to the Auth user with that email', async () => {
    await send(evt('checkout.session.completed', checkout({ client_reference_id: null, customer_details: { email: 'Sub@School.org' } })));
    assert.equal((await plan('teacher_sub')).plan, 'pro');
    // A client_reference_id that isn't a real account: the email wins, not the bogus uid.
    await send(evt('checkout.session.completed', checkout({ client_reference_id: 'no_such_uid', customer_details: { email: 'refund@school.org' } })));
    assert.equal(await plan('no_such_uid'), null);
    assert.equal((await plan('teacher_refund')).plan, 'pro');
});

test('no match goes to stripe_unmatched, and no plan is written', async () => {
    const e = evt('checkout.session.completed', checkout({ client_reference_id: null, customer_details: { email: 'stranger@nowhere.org' } }), 'evt_unmatched');
    const res = await send(e);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'unmatched');
    const u = (await col('stripe_unmatched').doc('evt_unmatched').get()).data();
    assert.equal(u.email, 'stranger@nowhere.org');
    assert.equal(u.amount, 4900);
    assert.equal(u.reason, 'no_account');
    assert.equal(ms(u.date), NOW);
});

test('a Founding Teacher who pays early loses nothing: the year adds on to their proUntil', async () => {
    const june2027 = Date.parse('2027-06-30T23:59:59Z');
    await col('teacher_plans').doc('teacher_founding').set({ plan: 'pro', proUntil: Timestamp.fromMillis(june2027), grantedBy: 'admin', note: 'Founding Teacher', updatedAt: Timestamp.now() });
    await send(evt('checkout.session.completed', checkout({ client_reference_id: 'teacher_founding' })));
    assert.equal(ms((await plan('teacher_founding')).proUntil), june2027 + YEAR_MS);
});

test('subscription: checkout saves the customer; the first invoice adds nothing; a renewal extends a year', async () => {
    await auth.createUser({ uid: 'teacher_renew', email: 'renew@school.org' });
    await send(evt('checkout.session.completed', checkout({ mode: 'subscription', client_reference_id: 'teacher_renew', customer: 'cus_renew', payment_intent: null, subscription: 'sub_1' })));
    assert.equal((await col('stripe_customers').doc('cus_renew').get()).data().uid, 'teacher_renew');
    const afterCheckout = ms((await plan('teacher_renew')).proUntil);
    assert.equal(afterCheckout, NOW + YEAR_MS);

    const first = await send(evt('invoice.paid', { id: 'in_first', object: 'invoice', billing_reason: 'subscription_create', customer: 'cus_renew', amount_paid: 4900, currency: 'usd' }));
    assert.equal(first.statusCode, 200);
    assert.equal(ms((await plan('teacher_renew')).proUntil), afterCheckout);

    const renewal = await send(evt('invoice.paid', { id: 'in_renew', object: 'invoice', billing_reason: 'subscription_cycle', customer: 'cus_renew', customer_email: 'other@x.org', amount_paid: 4900, currency: 'usd' }));
    assert.equal(renewal.body, 'pro_extended');
    const p = await plan('teacher_renew');
    assert.equal(ms(p.proUntil), afterCheckout + YEAR_MS);
    assert.match(p.note, /renewal in_renew/);
});

test('a renewal for an unknown customer goes to stripe_unmatched', async () => {
    const res = await send(evt('invoice.paid', { id: 'in_x', object: 'invoice', billing_reason: 'subscription_cycle', customer: 'cus_ghost', customer_email: 'ghost@x.org', amount_paid: 4900, currency: 'usd' }, 'evt_ghost_renewal'));
    assert.equal(res.body, 'unmatched');
    assert.equal((await col('stripe_unmatched').doc('evt_ghost_renewal').get()).data().reason, 'renewal_no_account');
});

test('subscription cancelled: nothing changes (Pro runs to proUntil)', async () => {
    const before = await plan('teacher_renew');
    const res = await send(evt('customer.subscription.deleted', { id: 'sub_1', object: 'subscription', customer: 'cus_renew' }));
    assert.equal(res.statusCode, 200);
    assert.equal(ms((await plan('teacher_renew')).proUntil), ms(before.proUntil));
});

test('a full refund ends Pro now (found via the payment intent); a partial refund only adds a note', async () => {
    // teacher_refund paid in the fallback test above; find its payment intent.
    const q = await col('stripe_events').where('uid', '==', 'teacher_refund').limit(1).get();
    const pi = q.docs[0].data().paymentIntent;
    assert.ok(pi);
    const full = await send(evt('charge.refunded', { id: 'ch_full', object: 'charge', amount: 4900, amount_refunded: 4900, refunded: true, currency: 'usd', customer: null, payment_intent: pi }));
    assert.equal(full.body, 'pro_ended_refund');
    const p = await plan('teacher_refund');
    assert.equal(ms(p.proUntil), NOW);
    assert.match(p.note, /Refunded ch_full/);

    await send(evt('checkout.session.completed', checkout({ client_reference_id: 'teacher_partial', payment_intent: 'pi_partial' })));
    const before = await plan('teacher_partial');
    const part = await send(evt('charge.refunded', { id: 'ch_part', object: 'charge', amount: 4900, amount_refunded: 1000, refunded: false, currency: 'usd', payment_intent: 'pi_partial' }));
    assert.equal(part.body, 'partial_refund_noted');
    const after = await plan('teacher_partial');
    assert.equal(ms(after.proUntil), ms(before.proUntil));
    assert.match(after.note, /Partial refund ch_part \(10\.00 USD\)/);
});

test('a checkout that has not been paid yet grants nothing and is listed for the founder', async () => {
    await auth.createUser({ uid: 'teacher_unpaid', email: 'unpaid@school.org' });
    const res = await send(evt('checkout.session.completed', checkout({ client_reference_id: 'teacher_unpaid', payment_status: 'unpaid' }), 'evt_unpaid'));
    assert.equal(res.body, 'unmatched');
    assert.equal(await plan('teacher_unpaid'), null);
    assert.equal((await col('stripe_unmatched').doc('evt_unpaid').get()).data().reason, 'not_paid_yet');
});

test('other event types get 200 and are ignored; GET is refused', async () => {
    const res = await send(evt('payment_intent.created', { id: 'pi_x' }, 'evt_other'));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, 'ignored');
    assert.equal((await col('stripe_events').doc('evt_other').get()).exists, false);
    const r = { status(c) { this.statusCode = c; return this; }, send() { return this; } };
    await handler({ method: 'GET', headers: {} }, r);
    assert.equal(r.statusCode, 405);
});
