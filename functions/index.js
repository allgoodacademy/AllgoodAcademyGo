// Cloud Functions for allgood-academy (2nd gen, Node 20).
//
// stripeWebhook — Stripe calls this after a payment; it turns Mission Control Pro on.
//   URL once deployed: https://us-central1-allgood-academy.cloudfunctions.net/stripeWebhook
//   Secret:            firebase functions:secrets:set STRIPE_WEBHOOK_SECRET   (Stripe's whsec_…)
// The behaviour lives in stripe-webhook.js; this file only wires it to an HTTPS endpoint.
'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createStripeWebhookHandler } = require('./stripe-webhook');

initializeApp();

const APP_ID = 'allgood-academy';
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

let handler = null;
exports.stripeWebhook = onRequest(
    {
        region: 'us-central1',
        secrets: [STRIPE_WEBHOOK_SECRET],
        // A handful of payments a day: keep it small and cheap, and cap runaway scaling.
        memory: '256MiB',
        maxInstances: 2,
        invoker: 'public',   // Stripe can't sign in; the signature check is the gate.
    },
    (req, res) => {
        if (!handler) {
            handler = createStripeWebhookHandler({
                db: getFirestore(),
                auth: getAuth(),
                appId: APP_ID,
                getSecret: () => STRIPE_WEBHOOK_SECRET.value(),
                log: logger,
            });
        }
        return handler(req, res);
    },
);
