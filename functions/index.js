// Cloud Functions for allgood-academy (2nd gen, Node 22).
//
// stripeWebhook — Stripe calls this after a payment; it turns Mission Control Pro on.
//   URL once deployed: https://us-central1-allgood-academy.cloudfunctions.net/stripeWebhook
//   Secret:            firebase functions:secrets:set STRIPE_WEBHOOK_SECRET   (Stripe's whsec_…)
// The behaviour lives in stripe-webhook.js; this file only wires it to an HTTPS endpoint.
//
// espanolIdeaEmail — when the Español hub's "¿A dónde vamos después?" box writes a message
//   (artifacts/allgood-academy/messages, source "Español hub"), email it to learning@.
//   Sends through Gmail SMTP as learning@allgoodacademy.com with an app password:
//   Secret: GMAIL_APP_PASSWORD (set by the Deploy functions workflow from the GitHub secret of
//   the same name; until that exists the workflow deploys stripeWebhook only).
//   Behaviour lives in espanol-idea-email.js.
'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { createStripeWebhookHandler } = require('./stripe-webhook');
const { createEspanolIdeaHandler } = require('./espanol-idea-email');

initializeApp();

const APP_ID = 'allgood-academy';
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const MAILBOX = 'learning@allgoodacademy.com';

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

let espanolHandler = null;
exports.espanolIdeaEmail = onDocumentCreated(
    {
        document: `artifacts/${APP_ID}/messages/{msgId}`,
        region: 'us-central1',
        secrets: [GMAIL_APP_PASSWORD],
        memory: '256MiB',
        maxInstances: 1,   // a few ideas a week; one instance also keeps the daily cap simple
    },
    async (event) => {
        const data = event.data ? event.data.data() : null;
        if (!data || data.source !== 'Español hub') return;   // cheap exit before any setup
        if (!espanolHandler) {
            const nodemailer = require('nodemailer');
            const transport = nodemailer.createTransport({
                host: 'smtp.gmail.com', port: 465, secure: true,
                auth: { user: MAILBOX, pass: GMAIL_APP_PASSWORD.value().replace(/\s+/g, '') },
            });
            espanolHandler = createEspanolIdeaHandler({
                db: getFirestore(),
                appId: APP_ID,
                sendMail: (opts) => transport.sendMail(opts),
                to: MAILBOX,
                from: `Allgood Academy Español <${MAILBOX}>`,
                log: logger,
            });
        }
        await espanolHandler(event.params.msgId, data);
    },
);
