// THE STRIPE WEBHOOK: turns Mission Control Pro on after a payment (2026-11-25).
//
// Stripe POSTs an event here; we verify its signature, then write teacher_plans/{uid} with
// the Admin SDK (which bypasses firestore.rules, but keeps rule #13's exact shape: plan,
// proUntil, grantedBy, note, updatedAt). Insider's Plan control stays the manual override.
//
// This file is the whole behaviour, kept free of firebase-functions so the tests can drive it
// directly against the Firestore and Auth emulators (functions/test/). index.js wires it up.
//
// WHAT IS NEVER DONE HERE
//   - No call to the Stripe API. Everything needed is in the signed event itself, and
//     signature checking (Stripe.webhooks.constructEvent) is local HMAC work, no API key.
//   - No full payload, email address or secret in any log line. Logs carry event id and type.
//   - No guessing. A payment we can't tie to an account goes to stripe_unmatched for the
//     founder, never to "the closest" teacher.

'use strict';

const Stripe = require('stripe');
const { Timestamp, FieldValue } = require('firebase-admin/firestore');

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const NOTE_MAX = 500;                       // firestore.rules #13 caps note at 500 characters
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;    // what a Firebase Auth uid looks like

const HANDLED = new Set([
    'checkout.session.completed',
    'invoice.paid',
    'customer.subscription.deleted',
    'charge.refunded',
]);

function toMs(t) {
    if (!t) return 0;
    if (typeof t.toMillis === 'function') return t.toMillis();
    if (typeof t === 'number') return t;
    return 0;
}

/**
 * Build the request handler.
 *   db, auth     firebase-admin Firestore and Auth instances
 *   appId        'allgood-academy' (artifacts/{appId}/...)
 *   getSecret()  returns the webhook signing secret (defineSecret's .value() in production)
 *   now()        clock, overridable in tests
 *   log          { info, warn, error } — never handed a payload or an email
 */
function createStripeWebhookHandler({ db, auth, appId, getSecret, now = () => Date.now(), log = console }) {
    const col = (name) => db.collection('artifacts').doc(appId).collection(name);
    const planRef = (uid) => col('teacher_plans').doc(uid);

    // ── who paid ────────────────────────────────────────────────────────────────
    async function authUidExists(uid) {
        if (!uid || !UID_RE.test(uid)) return false;
        try { await auth.getUser(uid); return true; } catch (e) { return false; }
    }
    async function uidByEmail(email) {
        if (!email || typeof email !== 'string') return null;
        try { return (await auth.getUserByEmail(email.trim().toLowerCase())).uid; } catch (e) { return null; }
    }
    async function uidByCustomer(customerId) {
        if (!customerId) return null;
        const snap = await col('stripe_customers').doc(customerId).get();
        return snap.exists ? (snap.data().uid || null) : null;
    }
    // A one-time Payment Link usually creates no Stripe customer, so a refund's charge may
    // carry only its payment_intent. The checkout event we recorded remembers it.
    async function uidByPaymentIntent(paymentIntent) {
        if (!paymentIntent) return null;
        const q = await col('stripe_events').where('paymentIntent', '==', paymentIntent).limit(1).get();
        return q.empty ? null : (q.docs[0].data().uid || null);
    }

    // ── writes ──────────────────────────────────────────────────────────────────
    // One transaction per event: the "seen" marker and the plan change land together, so a
    // crash between them can't leave an event marked done with no plan, and a retry of an
    // event already applied changes nothing.
    async function applyOnce(event, record, mutate) {
        const evRef = col('stripe_events').doc(event.id);
        return db.runTransaction(async (tx) => {
            const seen = await tx.get(evRef);
            if (seen.exists) return 'duplicate';
            const result = mutate ? await mutate(tx) : 'ok';
            tx.set(evRef, {
                type: event.type,
                receivedAt: FieldValue.serverTimestamp(),
                result,
                ...record,
            });
            return result;
        });
    }

    // Extend Pro by a year from max(now, current proUntil): a Founding Teacher whose free
    // Pro runs to June 2027 and pays today gets June 2028, losing nothing.
    function extendYear(tx, uid, note) {
        return tx.get(planRef(uid)).then((snap) => {
            const cur = snap.exists ? snap.data() : {};
            const curUntil = cur.plan === 'pro' ? toMs(cur.proUntil) : 0;
            const until = Math.max(now(), curUntil) + YEAR_MS;
            tx.set(planRef(uid), {
                plan: 'pro',
                proUntil: Timestamp.fromMillis(until),
                grantedBy: 'stripe',
                note: String(note).slice(0, NOTE_MAX),
                updatedAt: FieldValue.serverTimestamp(),
            });
            return 'pro_extended';
        });
    }

    async function unmatched(event, fields) {
        return applyOnce(event, { uid: null }, async (tx) => {
            tx.set(col('stripe_unmatched').doc(event.id), {
                type: event.type,
                email: fields.email || null,
                amount: typeof fields.amount === 'number' ? fields.amount : null,   // minor units (cents)
                currency: fields.currency || null,
                date: Timestamp.fromMillis((event.created || Math.floor(now() / 1000)) * 1000),
                stripeId: fields.stripeId || null,
                reason: fields.reason,
            });
            return 'unmatched';
        });
    }

    // ── events ──────────────────────────────────────────────────────────────────
    async function onCheckoutCompleted(event) {
        const s = event.data.object;
        const email = (s.customer_details && s.customer_details.email) || s.customer_email || null;
        const base = { email, amount: s.amount_total, currency: s.currency, stripeId: s.id };
        // 'unpaid' means a delayed payment method that hasn't cleared. Nothing is granted
        // for money not received; the founder sees it in Insider instead.
        if (s.payment_status && !['paid', 'no_payment_required'].includes(s.payment_status)) {
            return unmatched(event, { ...base, reason: 'not_paid_yet' });
        }
        let uid = (await authUidExists(s.client_reference_id)) ? s.client_reference_id : null;
        let matchedBy = 'client_reference_id';
        if (!uid) { uid = await uidByEmail(email); matchedBy = 'email'; }
        if (!uid) return unmatched(event, { ...base, reason: 'no_account' });

        const customer = typeof s.customer === 'string' ? s.customer : (s.customer && s.customer.id) || null;
        const paymentIntent = typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent && s.payment_intent.id) || null;
        return applyOnce(event, { uid, matchedBy, customer, paymentIntent, mode: s.mode || null }, async (tx) => {
            const result = await extendYear(tx, uid, `Stripe ${s.id}`);
            if (customer) {
                tx.set(col('stripe_customers').doc(customer), { uid, updatedAt: FieldValue.serverTimestamp() });
            }
            return result;
        });
    }

    async function onInvoicePaid(event) {
        const inv = event.data.object;
        // Only renewals. The first invoice of a subscription ('subscription_create') arrives
        // alongside checkout.session.completed, which already granted the year; counting it
        // too would give two years for one payment.
        if (inv.billing_reason !== 'subscription_cycle') return applyOnce(event, { uid: null }, null).then(() => 'ignored');
        const customer = typeof inv.customer === 'string' ? inv.customer : (inv.customer && inv.customer.id) || null;
        let uid = await uidByCustomer(customer);
        let matchedBy = 'customer';
        if (!uid) { uid = await uidByEmail(inv.customer_email); matchedBy = 'email'; }
        if (!uid) {
            return unmatched(event, { email: inv.customer_email, amount: inv.amount_paid, currency: inv.currency, stripeId: inv.id, reason: 'renewal_no_account' });
        }
        return applyOnce(event, { uid, matchedBy, customer }, (tx) => extendYear(tx, uid, `Stripe renewal ${inv.id}`));
    }

    async function onChargeRefunded(event) {
        const ch = event.data.object;
        const customer = typeof ch.customer === 'string' ? ch.customer : (ch.customer && ch.customer.id) || null;
        const paymentIntent = typeof ch.payment_intent === 'string' ? ch.payment_intent : (ch.payment_intent && ch.payment_intent.id) || null;
        let uid = (await uidByCustomer(customer)) || (await uidByPaymentIntent(paymentIntent));
        if (!uid) uid = await uidByEmail(ch.billing_details && ch.billing_details.email);
        if (!uid) {
            return unmatched(event, {
                email: (ch.billing_details && ch.billing_details.email) || null,
                amount: ch.amount_refunded, currency: ch.currency, stripeId: ch.id, reason: 'refund_no_account',
            });
        }
        const full = ch.refunded === true || (typeof ch.amount === 'number' && ch.amount_refunded >= ch.amount);
        return applyOnce(event, { uid, customer, paymentIntent, full }, async (tx) => {
            const snap = await tx.get(planRef(uid));
            const cur = snap.exists ? snap.data() : null;
            if (!cur) return 'refund_no_plan';
            if (!full) {
                const amt = typeof ch.amount_refunded === 'number' ? ` (${(ch.amount_refunded / 100).toFixed(2)} ${String(ch.currency || '').toUpperCase()})` : '';
                tx.set(planRef(uid), {
                    note: `${cur.note ? `${cur.note} · ` : ''}Partial refund ${ch.id}${amt}`.slice(0, NOTE_MAX),
                    updatedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                return 'partial_refund_noted';
            }
            // Full refund: take back only the year that was paid for (founder decision,
            // 2026-11-25). A teacher who just paid ends at about now; a Founding Teacher whose
            // free Pro ran to June 2027 and who then paid and was refunded goes back to June
            // 2027 instead of losing the free months. Never earlier than now. The plan stays
            // 'pro' with its end date, so Mission Control reads an ended plan as "ended" and
            // nothing is deleted.
            const curUntil = cur.plan === 'pro' ? toMs(cur.proUntil) : 0;
            const until = Math.max(now(), curUntil - YEAR_MS);
            tx.set(planRef(uid), {
                plan: cur.plan === 'pro' ? 'pro' : 'free',
                proUntil: Timestamp.fromMillis(until),
                grantedBy: 'stripe',
                note: `${until > now() && cur.note ? `${cur.note} · ` : ''}Refunded ${ch.id}`.slice(0, NOTE_MAX),
                updatedAt: FieldValue.serverTimestamp(),
            });
            return until > now() ? 'paid_year_refunded' : 'pro_ended_refund';
        });
    }

    // ── the endpoint ────────────────────────────────────────────────────────────
    return async function handleStripeWebhook(req, res) {
        if (req.method !== 'POST') { res.status(405).send('Method not allowed'); return; }
        const sig = req.headers && req.headers['stripe-signature'];
        const raw = req.rawBody;
        if (!sig || !raw) { res.status(400).send('Missing signature'); return; }
        let event;
        try {
            event = Stripe.webhooks.constructEvent(raw, sig, getSecret());
        } catch (e) {
            log.warn('[stripe] rejected: bad signature');
            res.status(400).send('Bad signature');
            return;
        }
        if (!HANDLED.has(event.type)) { res.status(200).send('ignored'); return; }
        try {
            let result;
            if (event.type === 'checkout.session.completed') result = await onCheckoutCompleted(event);
            else if (event.type === 'invoice.paid') result = await onInvoicePaid(event);
            else if (event.type === 'charge.refunded') result = await onChargeRefunded(event);
            else {
                // customer.subscription.deleted: Pro runs to its proUntil and then lapses on its
                // own (firestore.rules isProTeacher). Recorded so retries are cheap, nothing else.
                result = await applyOnce(event, { uid: null }, null).then((r) => (r === 'duplicate' ? r : 'no_change'));
            }
            log.info(`[stripe] ${event.id} ${event.type} -> ${result}`);
            res.status(200).send(result);
        } catch (e) {
            // A 500 makes Stripe retry later, which is what we want for a transient failure.
            log.error(`[stripe] ${event.id} ${event.type} failed: ${e && e.code ? e.code : 'error'}`);
            res.status(500).send('error');
        }
    };
}

module.exports = { createStripeWebhookHandler, YEAR_MS };
