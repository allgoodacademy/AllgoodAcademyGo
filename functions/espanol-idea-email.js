// Emails each "¿A dónde vamos después?" answer from the Español hub (/espanol/) to learning@.
//
// The hub writes the answer to artifacts/{appId}/messages with source "Español hub" (via
// AuthCore.sendMessage), so it is already in Insider's Inbox. This turns that same document
// into an email, so a teacher never has to open their own mail app (founder, 2026-11-27).
//
// Anyone can create a message (anonymous session), so this is written to be safe to abuse:
//   - only source === "Español hub" is emailed; every other portal's messages are ignored
//   - every header value is single-line; the visitor's address is only a Reply-To, and only
//     when it looks like one address
//   - the body is plain text, capped in length
//   - at most DAILY_CAP emails per UTC day (a counter doc); past that the answer is still in
//     Insider, just not emailed
//   - the message doc gets emailedAt / emailSkipped, so a retried event never sends twice
'use strict';

const SOURCE = 'Español hub';
const DAILY_CAP = 40;
const MAX_BODY = 4000;
const EMAIL_RE = /^[^\s@<>()",;:\\[\]]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,24}$/;

const oneLine = (s) => String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim();
const validEmail = (s) => (typeof s === 'string' && EMAIL_RE.test(s.trim()) ? s.trim() : null);

function buildEmail(data, { to, from }) {
    const replyTo = validEmail(data.replyTo);
    const text = [
        String(data.message || '').slice(0, MAX_BODY),
        '',
        replyTo ? `Reply to: ${replyTo} (just hit Reply)` : 'No reply address given.',
        '',
        'Also in Insider > Inbox (filter: Español hub): https://allgoodacademy.com/insider/#/inbox',
    ].join('\n');
    return {
        from,
        to,
        subject: 'Español: next story idea',
        text,
        ...(replyTo ? { replyTo } : {}),
    };
}

// db: firebase-admin Firestore. sendMail: async (mailOptions) => any. now: () => ms.
function createEspanolIdeaHandler({ db, appId, sendMail, to, from, now = Date.now, log = console, cap = DAILY_CAP }) {
    to = oneLine(to);
    from = oneLine(from);
    return async function onMessageCreated(msgId, data) {
        if (!data || data.source !== SOURCE) return 'ignored';
        const msgRef = db.collection('artifacts').doc(appId).collection('messages').doc(msgId);
        const day = new Date(now()).toISOString().slice(0, 10);
        const counterRef = db.collection('artifacts').doc(appId).collection('email_counters').doc(`espanol_${day}`);

        // Claim the send (and a slot under the daily cap) in one transaction, so a redelivered
        // event or two concurrent ones can't both email.
        const claim = await db.runTransaction(async (tx) => {
            const [msg, counter] = await Promise.all([tx.get(msgRef), tx.get(counterRef)]);
            const m = msg.exists ? msg.data() : {};
            if (m.emailedAt || m.emailSkipped || m.emailClaimedAt) return 'done-already';
            const sent = counter.exists ? counter.data().count || 0 : 0;
            if (sent >= cap) {
                tx.set(msgRef, { emailSkipped: 'daily-cap' }, { merge: true });
                return 'capped';
            }
            tx.set(counterRef, { count: sent + 1, day }, { merge: true });
            tx.set(msgRef, { emailClaimedAt: new Date(now()) }, { merge: true });
            return 'claimed';
        });
        if (claim !== 'claimed') {
            if (claim === 'capped') log.warn(`espanolIdeaEmail: daily cap ${cap} reached; ${msgId} is in Insider only`);
            return claim;
        }

        try {
            await sendMail(buildEmail(data, { to, from }));
        } catch (e) {
            // Release the claim so a retry (or a manual re-run) can send it.
            await msgRef.set({ emailClaimedAt: null, emailError: oneLine(e && e.message).slice(0, 300) }, { merge: true });
            throw e;
        }
        await msgRef.set({ emailedAt: new Date(now()), emailError: null }, { merge: true });
        log.info(`espanolIdeaEmail: emailed ${msgId}`);
        return 'sent';
    };
}

module.exports = { createEspanolIdeaHandler, buildEmail, validEmail, SOURCE, DAILY_CAP };
