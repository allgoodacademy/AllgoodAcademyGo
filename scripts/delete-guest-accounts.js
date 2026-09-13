#!/usr/bin/env node
// Deletes every passphrase/recruit-code account and everything keyed to it. Written for
// the Sep 2026 cleanup: the recruit-code flow shipped Sep 3rd and no real student has used
// it since, so every account carrying a recruitCode is internal testing, not product data.
//
// IMPORTANT: this targets accounts with a recruitCode on file, NOT every anonymous Auth
// user. Anonymous ("Continue as Guest") logins existed before Sep 3rd too, and some of
// those pre-date the passphrase flow entirely — they may be real students who used the
// site before recruit codes existed, so they are deliberately left alone. Only an account
// whose artifacts/{appId}/users/{uid} doc has a non-empty `recruitCode` field is targeted.
//
// This is NOT a general-purpose "delete guests" switch. Do not run this again once real
// students are using recruit codes; by then a recruitCode would mean "real student who
// hasn't gone 13+" and this script would wipe them. It exists for this one historical
// cleanup and should be treated as unsafe to reuse without adding a real is-test marker
// first (see docs/insider-analytics.md).
//
// For each targeted account this deletes:
//   - artifacts/{appId}/users/{uid}                        (and its recruitCode field)
//   - artifacts/{appId}/users/{uid}/module_progress/*
//   - artifacts/{appId}/users/{uid}/continuity_bank/*
//   - artifacts/{appId}/users/{uid}/comms_receipts/*
//   - artifacts/{appId}/users/{uid}/comms_state/*
//   - artifacts/{appId}/recruit_codes/{code}               (code taken from the user doc)
//   - artifacts/{appId}/events            where uid == uid
//   - artifacts/{appId}/sessions          where uid == uid
//   - artifacts/{appId}/course_feedback   where uid == uid
//   - artifacts/{appId}/topic_selections  where uid == uid
//   - artifacts/{appId}/messages          where uid == uid
//   - the Firebase Auth user itself
//
// Requires the firebase-admin package (not a repo dependency today — install with
// `npm install firebase-admin --no-save` before running) and a service-account
// credential reachable via GOOGLE_APPLICATION_CREDENTIALS, same as prune-telemetry.js.
//
// Usage:
//   node scripts/delete-guest-accounts.js                  # dry run — reports only, deletes nothing
//   node scripts/delete-guest-accounts.js --live            # actually deletes
//   node scripts/delete-guest-accounts.js --live --keep-uid=abc123,def456   # skip specific uids
//   node scripts/delete-guest-accounts.js --app-id=allgood-academy
//
// Unlike prune-telemetry.js, DRY RUN IS THE DEFAULT HERE. Deleting an Auth account is not
// reversible the way an aged-out telemetry row is, so this errs the opposite direction:
// you must pass --live to delete anything.

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const SUBCOLLECTIONS = ['module_progress', 'continuity_bank', 'comms_receipts', 'comms_state'];
const UID_FIELD_COLLECTIONS = ['events', 'sessions', 'course_feedback', 'topic_selections', 'messages'];
const BATCH_SIZE = 400;

function parseArgs(argv) {
  const args = { live: false, appId: 'allgood-academy', keepUids: new Set() };
  for (const raw of argv.slice(2)) {
    if (raw === '--live') args.live = true;
    else if (raw.startsWith('--app-id=')) args.appId = raw.slice('--app-id='.length);
    else if (raw.startsWith('--keep-uid=')) {
      for (const uid of raw.slice('--keep-uid='.length).split(',')) {
        if (uid) args.keepUids.add(uid);
      }
    }
  }
  return args;
}

// The only reliable "this is a passphrase account" signal is a recruitCode on file — NOT
// anonymous-provider Auth users, since plain "Continue as Guest" logins predate Sep 3rd
// and may be real students. Union two sources in case one side is ever out of sync:
//   - users/{uid} docs that carry a non-empty recruitCode field
//   - recruit_codes/{code} docs, each of which carries the owning uid
async function findRecruitCodeUids(db, appId) {
  const uids = new Map(); // uid -> recruitCode, for logging

  const usersSnap = await withRetry(() => db.collection('artifacts').doc(appId).collection('users').get());
  for (const doc of usersSnap.docs) {
    const code = doc.get('recruitCode');
    if (code) uids.set(doc.id, code);
  }

  const codesSnap = await withRetry(() => db.collection('artifacts').doc(appId).collection('recruit_codes').get());
  for (const doc of codesSnap.docs) {
    const uid = doc.get('uid');
    if (uid) uids.set(uid, uids.get(uid) || doc.id);
  }

  return uids;
}

// Retries a Firestore call on transient RESOURCE_EXHAUSTED (quota) errors with backoff.
// The free/Spark tier's per-minute read quota is easy to trip when scanning many accounts
// back to back; this is not a sign anything is wrong with the data.
async function withRetry(fn, { attempts = 5, baseDelayMs = 1000 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      const isQuotaError = err && (err.code === 8 || /RESOURCE_EXHAUSTED/.test(err.message || ''));
      if (!isQuotaError || attempt >= attempts) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.log(`[delete-guest-accounts]   quota hit, retrying in ${delay}ms (attempt ${attempt}/${attempts})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function deleteDocsInBatches(db, refs, { live, label }) {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const chunk = refs.slice(i, i + BATCH_SIZE);
    if (!live) continue;
    await withRetry(async () => {
      const batch = db.batch();
      for (const ref of chunk) batch.delete(ref);
      await batch.commit();
    });
  }
  if (refs.length > 0) {
    console.log(`[delete-guest-accounts]   ${live ? 'deleted' : 'would delete'} ${refs.length} ${label} doc(s)`);
  }
}

async function deleteAccount(db, { appId, uid, live }) {
  const userRef = db.collection('artifacts').doc(appId).collection('users').doc(uid);
  const userSnap = await withRetry(() => userRef.get());
  const recruitCode = userSnap.exists ? userSnap.get('recruitCode') : null;

  for (const sub of SUBCOLLECTIONS) {
    const snap = await withRetry(() => userRef.collection(sub).get());
    await deleteDocsInBatches(db, snap.docs.map((d) => d.ref), { live, label: `users/${uid}/${sub}` });
  }

  if (userSnap.exists) {
    await deleteDocsInBatches(db, [userRef], { live, label: 'users' });
  }

  if (recruitCode) {
    const codeRef = db.collection('artifacts').doc(appId).collection('recruit_codes').doc(recruitCode);
    await deleteDocsInBatches(db, [codeRef], { live, label: 'recruit_codes' });
  }

  for (const collectionName of UID_FIELD_COLLECTIONS) {
    const colRef = db.collection('artifacts').doc(appId).collection(collectionName);
    const snap = await withRetry(() => colRef.where('uid', '==', uid).get());
    await deleteDocsInBatches(db, snap.docs.map((d) => d.ref), { live, label: collectionName });
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_CONFIG) {
    throw new Error(
      'No credential found. Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON file.'
    );
  }

  initializeApp({ credential: applicationDefault() });
  const auth = getAuth();
  const db = getFirestore();

  console.log(
    `[delete-guest-accounts] app=${args.appId} mode=${args.live ? 'LIVE — WILL DELETE' : 'DRY RUN (no deletes)'}` +
    (args.keepUids.size ? ` keeping=${[...args.keepUids].join(',')}` : '')
  );

  const recruitCodeUids = await findRecruitCodeUids(db, args.appId);
  const targetUids = [...recruitCodeUids.keys()].filter((uid) => !args.keepUids.has(uid));

  console.log(
    `[delete-guest-accounts] found ${recruitCodeUids.size} account(s) with a recruitCode on file, ` +
    `${targetUids.length} targeted for deletion (${recruitCodeUids.size - targetUids.length} kept)`
  );

  for (const uid of targetUids) {
    console.log(`[delete-guest-accounts] ${args.live ? 'deleting' : 'would delete'} uid=${uid} recruitCode=${recruitCodeUids.get(uid)}`);
    await deleteAccount(db, { appId: args.appId, uid, live: args.live });
    await new Promise((resolve) => setTimeout(resolve, 150)); // light pacing to avoid tripping quota
  }

  if (args.live && targetUids.length > 0) {
    for (let i = 0; i < targetUids.length; i += 1000) {
      const chunk = targetUids.slice(i, i + 1000);
      const result = await auth.deleteUsers(chunk);
      console.log(`[delete-guest-accounts] auth deleteUsers: success=${result.successCount} failure=${result.failureCount}`);
      for (const err of result.errors) {
        console.error(`[delete-guest-accounts]   failed uid=${chunk[err.index]}: ${err.error.message}`);
      }
    }
  }

  console.log(
    `[delete-guest-accounts] done. ${args.live ? 'deleted' : 'would delete'} ${targetUids.length} account(s).` +
    (args.live ? '' : ' Re-run with --live to actually delete.')
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[delete-guest-accounts] failed:', err.message || err);
    process.exit(1);
  });
}

module.exports = { parseArgs, findRecruitCodeUids };
